pragma solidity ^0.4.24;

import "./vendor/eternal-storage/EternalStorage.sol";
import "./interfaces/ICustomConsensus.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title GTBS staking entry point — vesting quotas, unbonding, cascade withdraw
 */
contract StakingVault is EternalStorage {
  using SafeMath for uint256;

  event DelegatorLockPeriodUpdated(uint256 value);
  event AnnualUnlockPeriodUpdated(uint256 value);
  event ReleaseDelayPeriodUpdated(uint256 value);
  event AnnualUnlockCapUpdated(uint256 value);
  event UnstakeFeeBpsUpdated(uint256 value);
  event PendingUnstakeInitiated(address indexed user, address indexed validator, uint256 amount, uint256 escrow);
  event UnstakeCompleted(address indexed user, address indexed validator, uint256 amount);
  event VestedClaimed(address indexed user, uint256 amount);

  bytes32 internal constant OWNER = keccak256(abi.encodePacked("owner"));
  bytes32 internal constant CONSENSUS = keccak256(abi.encodePacked("consensus"));
  bytes32 internal constant DELEGATOR_LOCK_PERIOD = keccak256(abi.encodePacked("delegatorLockPeriod"));
  bytes32 internal constant ANNUAL_UNLOCK_PERIOD = keccak256(abi.encodePacked("annualUnlockPeriod"));
  bytes32 internal constant RELEASE_DELAY_PERIOD = keccak256(abi.encodePacked("releaseDelayPeriod"));
  bytes32 internal constant ANNUAL_UNLOCK_CAP = keccak256(abi.encodePacked("annualUnlockCap"));
  bytes32 internal constant UNSTAKE_FEE_BPS = keccak256(abi.encodePacked("unstakeFeeBps"));

  modifier onlyOwner() {
    require(msg.sender == addressStorage[OWNER]);
    _;
  }

  function initialize(
    address _consensus,
    address _owner,
    uint256 _delegatorLockSeconds,
    uint256 _annualUnlockPeriodSeconds,
    uint256 _releaseDelaySeconds,
    uint256 _annualUnlockCapWei,
    uint256 _unstakeFeeBps
  ) external {
    require(!isInitialized());
    require(_consensus != address(0));
    require(_owner != address(0));
    require(_delegatorLockSeconds >= 7 days);
    require(_annualUnlockPeriodSeconds >= 30 days);
    require(_releaseDelaySeconds >= 1 days && _releaseDelaySeconds <= 180 days);
    require(_unstakeFeeBps <= 2000);

    addressStorage[CONSENSUS] = _consensus;
    addressStorage[OWNER] = _owner;
    uintStorage[DELEGATOR_LOCK_PERIOD] = _delegatorLockSeconds;
    uintStorage[ANNUAL_UNLOCK_PERIOD] = _annualUnlockPeriodSeconds;
    uintStorage[RELEASE_DELAY_PERIOD] = _releaseDelaySeconds;
    uintStorage[ANNUAL_UNLOCK_CAP] = _annualUnlockCapWei;
    uintStorage[UNSTAKE_FEE_BPS] = _unstakeFeeBps;
    setInitialized(true);
  }

  function consensus() public view returns (address) {
    return addressStorage[CONSENSUS];
  }

  function delegatorLockPeriod() public view returns (uint256) {
    return uintStorage[DELEGATOR_LOCK_PERIOD];
  }

  function annualUnlockPeriod() public view returns (uint256) {
    return uintStorage[ANNUAL_UNLOCK_PERIOD];
  }

  function releaseDelayPeriod() public view returns (uint256) {
    return uintStorage[RELEASE_DELAY_PERIOD];
  }

  function annualUnlockCap() public view returns (uint256) {
    return uintStorage[ANNUAL_UNLOCK_CAP];
  }

  function unstakeFeeBps() public view returns (uint256) {
    return uintStorage[UNSTAKE_FEE_BPS];
  }

  function stake() external payable {
    require(msg.value > 0);
    ICustomConsensus(consensus()).stakeFromVault.value(msg.value)(msg.sender, msg.sender);
  }

  function delegate(address _validator) external payable {
    require(msg.value > 0);
    require(_validator != address(0));
    _ensureDelegationSnapshot(msg.sender, _validator);
    ICustomConsensus(consensus()).delegateFromVault.value(msg.value)(msg.sender, _validator);
  }

  function withdrawValidator(uint256 _amount) external {
    require(_amount > 0);
    _consumeUnlockQuota(msg.sender, _amount);
    ICustomConsensus(consensus()).withdrawFromVault(msg.sender, msg.sender, _amount);
    _cascadeWithdraw(msg.sender, _amount);
    msg.sender.transfer(_amount);
  }

  function requestUnstake(address _validator, uint256 _amount) external {
    require(_amount > 0);
    require(_validator != address(0));
    require(_amount <= ICustomConsensus(consensus()).delegatedAmount(msg.sender, _validator));

    bytes32 lockKey = keccak256(abi.encodePacked("lockPeriodAtEntry", msg.sender, _validator));
    bytes32 timeKey = keccak256(abi.encodePacked("delegationTime", msg.sender, _validator));
    require(uintStorage[timeKey] > 0);
    require(block.timestamp >= uintStorage[timeKey].add(uintStorage[lockKey]));

    _consumeUnlockQuota(msg.sender, _amount);

    uint256 feeBps = unstakeFeeBps();
    uint256 fee = _amount.mul(feeBps).div(10000);
    uint256 escrow = _amount.sub(fee);

    ICustomConsensus(consensus()).withdrawFromVault(msg.sender, _validator, _amount);

    if (fee > 0) {
      _validator.transfer(fee);
    }

    bytes32 escrowKey = keccak256(abi.encodePacked("pendingUnstakeEscrow", msg.sender, _validator));
    bytes32 releaseKey = keccak256(abi.encodePacked("pendingUnstakeReleaseAt", msg.sender, _validator));
    uintStorage[escrowKey] = escrow;
    uintStorage[releaseKey] = block.timestamp.add(releaseDelayPeriod());
    uintStorage[keccak256(abi.encodePacked("feeBpsAtEntry", msg.sender, _validator))] = feeBps;
    uintStorage[keccak256(abi.encodePacked("releaseDelayAtEntry", msg.sender, _validator))] = releaseDelayPeriod();

    emit PendingUnstakeInitiated(msg.sender, _validator, _amount, escrow);
  }

  function completeUnstake(address _user, address _validator) external returns (uint256) {
    bytes32 escrowKey = keccak256(abi.encodePacked("pendingUnstakeEscrow", _user, _validator));
    bytes32 releaseKey = keccak256(abi.encodePacked("pendingUnstakeReleaseAt", _user, _validator));
    uint256 escrow = uintStorage[escrowKey];
    require(escrow > 0);
    require(block.timestamp >= uintStorage[releaseKey]);

    delete uintStorage[escrowKey];
    delete uintStorage[releaseKey];

    _user.transfer(escrow);
    emit UnstakeCompleted(_user, _validator, escrow);
    return escrow;
  }

  function claimVested(address _user) external returns (uint256) {
    bytes32 vestedKey = keccak256(abi.encodePacked("pendingVested", _user));
    bytes32 releaseKey = keccak256(abi.encodePacked("pendingVestedReleaseAt", _user));
    uint256 amount = uintStorage[vestedKey];
    require(amount > 0);
    require(block.timestamp >= uintStorage[releaseKey]);

    delete uintStorage[vestedKey];
    delete uintStorage[releaseKey];

    _user.transfer(amount);
    emit VestedClaimed(_user, amount);
    return amount;
  }

  function setDelegatorLockPeriod(uint256 _seconds) external onlyOwner {
    require(_seconds >= 7 days && _seconds <= 730 days);
    uintStorage[DELEGATOR_LOCK_PERIOD] = _seconds;
    emit DelegatorLockPeriodUpdated(_seconds);
  }

  function setAnnualUnlockPeriod(uint256 _seconds) external onlyOwner {
    require(_seconds >= 30 days && _seconds <= 730 days);
    uintStorage[ANNUAL_UNLOCK_PERIOD] = _seconds;
    emit AnnualUnlockPeriodUpdated(_seconds);
  }

  function setReleaseDelayPeriod(uint256 _seconds) external onlyOwner {
    require(_seconds >= 1 days && _seconds <= 180 days);
    uintStorage[RELEASE_DELAY_PERIOD] = _seconds;
    emit ReleaseDelayPeriodUpdated(_seconds);
  }

  function setAnnualUnlockCap(uint256 _capWei) external onlyOwner {
    require(_capWei >= 1e21);
    uintStorage[ANNUAL_UNLOCK_CAP] = _capWei;
    emit AnnualUnlockCapUpdated(_capWei);
  }

  function setUnstakeFeeBps(uint256 _bps) external onlyOwner {
    require(_bps <= 2000);
    uintStorage[UNSTAKE_FEE_BPS] = _bps;
    emit UnstakeFeeBpsUpdated(_bps);
  }

  function transferOwnership(address _newOwner) external onlyOwner {
    require(_newOwner != address(0));
    addressStorage[OWNER] = _newOwner;
  }

  function () external payable {}

  function _ensureDelegationSnapshot(address _delegator, address _validator) internal {
    bytes32 timeKey = keccak256(abi.encodePacked("delegationTime", _delegator, _validator));
    if (uintStorage[timeKey] == 0) {
      uintStorage[timeKey] = block.timestamp;
      uintStorage[keccak256(abi.encodePacked("lockPeriodAtEntry", _delegator, _validator))] = delegatorLockPeriod();
    }
  }

  function _rollUnlockPeriod(address _wallet) internal {
    bytes32 periodStartKey = keccak256(abi.encodePacked("unlockPeriodStart", _wallet));
    bytes32 unlockedKey = keccak256(abi.encodePacked("unlockedThisPeriod", _wallet));
    bytes32 capSnapshotKey = keccak256(abi.encodePacked("capAtPeriodStart", _wallet));

    uint256 periodStart = uintStorage[periodStartKey];
    if (periodStart == 0) {
      uintStorage[periodStartKey] = block.timestamp;
      uintStorage[capSnapshotKey] = annualUnlockCap();
      return;
    }

    if (block.timestamp >= periodStart.add(annualUnlockPeriod())) {
      uintStorage[unlockedKey] = 0;
      uintStorage[periodStartKey] = block.timestamp;
      uintStorage[capSnapshotKey] = annualUnlockCap();
    }
  }

  function _consumeUnlockQuota(address _wallet, uint256 _amount) internal {
    _rollUnlockPeriod(_wallet);
    bytes32 unlockedKey = keccak256(abi.encodePacked("unlockedThisPeriod", _wallet));
    bytes32 capSnapshotKey = keccak256(abi.encodePacked("capAtPeriodStart", _wallet));
    uint256 cap = uintStorage[capSnapshotKey];
    if (cap == 0) {
      cap = annualUnlockCap();
      uintStorage[capSnapshotKey] = cap;
    }
    require(uintStorage[unlockedKey].add(_amount) <= cap);
    uintStorage[unlockedKey] = uintStorage[unlockedKey].add(_amount);
  }

  function _cascadeWithdraw(address _validator, uint256 _amount) internal {
    ICustomConsensus c = ICustomConsensus(consensus());
    uint256 totalDel = c.totalDelegated(_validator);
    if (totalDel == 0) {
      return;
    }

    address[] memory dels = c.delegators(_validator);
    for (uint256 i = 0; i < dels.length; i++) {
      address delegator = dels[i];
      uint256 delAmt = c.delegatedAmount(delegator, _validator);
      if (delAmt == 0) {
        continue;
      }
      uint256 share = _amount.mul(delAmt).div(totalDel);
      if (share == 0) {
        continue;
      }

      bytes32 timeKey = keccak256(abi.encodePacked("delegationTime", delegator, _validator));
      bytes32 lockKey = keccak256(abi.encodePacked("lockPeriodAtEntry", delegator, _validator));
      if (uintStorage[timeKey] == 0) {
        continue;
      }
      if (block.timestamp < uintStorage[timeKey].add(uintStorage[lockKey])) {
        continue;
      }

      _forceRelease(delegator, _validator, share);
    }
  }

  function _forceRelease(address _delegator, address _validator, uint256 _amount) internal {
    require(_amount <= ICustomConsensus(consensus()).delegatedAmount(_delegator, _validator));

    uint256 feeBps = unstakeFeeBps();
    uint256 fee = _amount.mul(feeBps).div(10000);
    uint256 escrow = _amount.sub(fee);

    ICustomConsensus(consensus()).withdrawFromVault(_delegator, _validator, _amount);

    if (fee > 0) {
      _validator.transfer(fee);
    }

    bytes32 escrowKey = keccak256(abi.encodePacked("pendingUnstakeEscrow", _delegator, _validator));
    bytes32 releaseKey = keccak256(abi.encodePacked("pendingUnstakeReleaseAt", _delegator, _validator));
    uintStorage[escrowKey] = escrow;
    uintStorage[releaseKey] = block.timestamp.add(releaseDelayPeriod());
    uintStorage[keccak256(abi.encodePacked("feeBpsAtEntry", _delegator, _validator))] = feeBps;
    uintStorage[keccak256(abi.encodePacked("releaseDelayAtEntry", _delegator, _validator))] = releaseDelayPeriod();

    emit PendingUnstakeInitiated(_delegator, _validator, _amount, escrow);
  }
}
