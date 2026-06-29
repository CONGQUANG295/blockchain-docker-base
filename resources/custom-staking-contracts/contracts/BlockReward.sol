pragma solidity ^0.4.24;

import "./vendor/abstracts/BlockRewardBase.sol";
import "./vendor/interfaces/IConsensus.sol";
import "./vendor/eternal-storage/EternalStorage.sol";
import "./vendor/ProxyStorage.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
* @title Contract handling block reward logic
* @author LiorRabin
*/
contract BlockReward is EternalStorage, BlockRewardBase {
  using SafeMath for uint256;

  uint256 public constant DECIMALS = 10 ** 18;
  uint256 public constant BLOCKS_PER_YEAR = 10512000; // patched by generate-gtbs-contract-config.js
  uint256 public constant MAX_SUPPLY = 3000000000000000000000000000; // patched by generate-gtbs-contract-config.js

  event NetApyBpsUpdated(uint256 value, uint256 effectiveBlock);
  event MaxSupplyReached();

  /**
  * @dev This event will be emitted every block, describing the rewards given
  * @param receivers array of addresses to reward
  * @param rewards array of balance increases corresponding to the receivers array
  */
  event Rewarded(address[] receivers, uint256[] rewards);

  /**
  * @dev This event will be emitted on cycle end, describing the amount of rewards distributed on the cycle
  * @param amount total rewards distributed on this cycle
  */
  event RewardedOnCycle(uint256 amount);

  /**
  * @dev This modifier verifies that msg.sender is the system address (EIP96)
  */
  modifier onlySystem() {
    require(msg.sender == addressStorage[SYSTEM_ADDRESS]);
    _;
  }

  /**
  * @dev This modifier verifies that msg.sender is the owner of the contract
  */
  modifier onlyOwner() {
    require(msg.sender == addressStorage[OWNER]);
    _;
  }

  /**
  * @dev This modifier verifies that msg.sender is the consensus contract
  */
  modifier onlyConsensus() {
    require(msg.sender == ProxyStorage(getProxyStorage()).getConsensus());
    _;
  }

  /**
  * @dev This modifier verifies that msg.sender is a validator
  */
  modifier onlyValidator() {
    require(IConsensus(ProxyStorage(getProxyStorage()).getConsensus()).isValidator(msg.sender));
    _;
  }

  /**
  * @dev Function to be called on contract initialization
  */
  function initialize(uint256 _supply, uint256 _netApyBps) external onlyOwner {
    require(!isInitialized());
    require(_supply < MAX_SUPPLY);
    require(_netApyBps <= 1000);
    _setSystemAddress(0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE);
    _setTotalSupply(_supply);
    _initRewardedOnCycle();
    uintStorage[NET_APY_BPS] = _netApyBps;
    setInitialized(true);
  }

  function netApyBps() public view returns (uint256) {
    if (block.number >= uintStorage[NET_APY_ACTIVATION_BLOCK] && uintStorage[NET_APY_ACTIVATION_BLOCK] > 0) {
      return uintStorage[NET_APY_BPS_NEXT];
    }
    return uintStorage[NET_APY_BPS];
  }

  function setNetApyBps(uint256 _bps) external onlyOwner {
    require(_bps <= 1000);
    uintStorage[NET_APY_BPS_NEXT] = _bps;
    uintStorage[NET_APY_ACTIVATION_BLOCK] = block.number + 1;
    emit NetApyBpsUpdated(_bps, block.number + 1);
  }

  /**
  * @dev Function called to produce the reward on each block
  * @param benefactors array of addresses representing benefectors to be considered for reward
  * @param kind array of reward types. We support only arrays with one item and type = 0 (Author - Reward attributed to the block author)
  * See https://wiki.parity.io/Block-Reward-Contract.html
  */
  function reward(address[] benefactors, uint16[] kind) external onlySystem returns (address[], uint256[]) {
    require(benefactors.length == kind.length);
    require(benefactors.length == 1);
    require(kind[0] == 0);

    uint256 blockRewardAmount = getBlockRewardAmountPerValidator(benefactors[0]);
    uint256 remaining = MAX_SUPPLY.sub(getTotalSupply());
    if (remaining == 0) {
      blockRewardAmount = 0;
    } else if (blockRewardAmount > remaining) {
      blockRewardAmount = remaining;
      emit MaxSupplyReached();
    }

    (address[] memory _delegators, uint256[] memory _rewards) = IConsensus(ProxyStorage(getProxyStorage()).getConsensus()).getDelegatorsForRewardDistribution(benefactors[0], blockRewardAmount);

    address[] memory receivers = new address[](_delegators.length + 1);
    uint256[] memory rewards = new uint256[](receivers.length);

    receivers[0] = benefactors[0];
    rewards[0] = blockRewardAmount;
    for (uint256 i = 1; i <= _delegators.length; i++) {
      receivers[i] = _delegators[i - 1];
      rewards[i] = _rewards[i - 1];
      rewards[0] = rewards[0].sub(rewards[i]);
    }

    _setRewardedOnCycle(getRewardedOnCycle().add(blockRewardAmount));
    _setTotalSupply(getTotalSupply().add(blockRewardAmount));

    IConsensus(ProxyStorage(getProxyStorage()).getConsensus()).cycle(benefactors[0]);

    emit Rewarded(receivers, rewards);
    return (receivers, rewards);
  }

  function onCycleEnd() external onlyConsensus {
    _setShouldEmitRewardedOnCycle(true);
  }

  /**
  * @dev Function to be called by validators only to emit RewardedOnCycle event (only if `shouldEmitRewardedOnCycle` returns true)
  */
  function emitRewardedOnCycle() external onlyValidator {
    require(shouldEmitRewardedOnCycle());
    emit RewardedOnCycle(getRewardedOnCycle());
    _setShouldEmitRewardedOnCycle(false);
    _setRewardedOnCycle(0);
  }

  bytes32 internal constant OWNER = keccak256(abi.encodePacked("owner"));
  bytes32 internal constant SYSTEM_ADDRESS = keccak256(abi.encodePacked("SYSTEM_ADDRESS"));
  bytes32 internal constant PROXY_STORAGE = keccak256(abi.encodePacked("proxyStorage"));
  bytes32 internal constant TOTAL_SUPPLY = keccak256(abi.encodePacked("totalSupply"));
  bytes32 internal constant REWARDED_THIS_CYCLE = keccak256(abi.encodePacked("rewardedOnCycle"));
  bytes32 internal constant BLOCK_REWARD_AMOUNT = keccak256(abi.encodePacked("blockRewardAmount"));
  bytes32 internal constant SHOULD_EMIT_REWARDED_ON_CYCLE = keccak256(abi.encodePacked("shouldEmitRewardedOnCycle"));
  bytes32 internal constant NET_APY_BPS = keccak256(abi.encodePacked("netApyBps"));
  bytes32 internal constant NET_APY_BPS_NEXT = keccak256(abi.encodePacked("netApyBpsNext"));
  bytes32 internal constant NET_APY_ACTIVATION_BLOCK = keccak256(abi.encodePacked("netApyActivationBlock"));

  function _setSystemAddress(address _newAddress) private {
    addressStorage[SYSTEM_ADDRESS] = _newAddress;
  }

  function _setTotalSupply(uint256 _supply) private {
    require(_supply >= 0);
    uintStorage[TOTAL_SUPPLY] = _supply;
  }

  function getTotalSupply() public view returns(uint256) {
    return uintStorage[TOTAL_SUPPLY];
  }

  function getMaxSupply() public pure returns(uint256) {
    return MAX_SUPPLY;
  }

  function getRemainingMiningBudget() public view returns(uint256) {
    uint256 ts = getTotalSupply();
    return ts >= MAX_SUPPLY ? 0 : MAX_SUPPLY.sub(ts);
  }

  function _initRewardedOnCycle() private {
    _setRewardedOnCycle(0);
  }

  function _setRewardedOnCycle(uint256 _amount) private {
    require(_amount >= 0);
    uintStorage[REWARDED_THIS_CYCLE] = _amount;
  }

  function getRewardedOnCycle() public view returns(uint256) {
    return uintStorage[REWARDED_THIS_CYCLE];
  }

  /**
  * returns NET APY in basis points (400 = 4%)
  */
  function getNetApyBps() public view returns(uint256) {
    return netApyBps();
  }

  /**
  * Inflation model removed on GTBS profile (always 0).
  */
  function getInflation() public pure returns(uint256) {
    return 0;
  }

  /**
  * returns blocks per year (block time is 5 seconds)
  */
  function getBlocksPerYear() public pure returns(uint256) {
    return BLOCKS_PER_YEAR;
  }

  function getBlockRewardAmount() public view returns(uint256) {
    return 0;
  }

  function getBlockRewardAmountPerValidator(address _validator) public view returns(uint256) {
    IConsensus consensus = IConsensus(ProxyStorage(getProxyStorage()).getConsensus());
    uint256 stake = consensus.stakeAmount(_validator);
    if (stake == 0) {
      return 0;
    }
    return stake.mul(netApyBps()).div(10000).div(getBlocksPerYear());
  }


  function getProxyStorage() public view returns(address) {
    return addressStorage[PROXY_STORAGE];
  }

  function shouldEmitRewardedOnCycle() public view returns(bool) {
    return IConsensus(ProxyStorage(getProxyStorage()).getConsensus()).isFinalized() && boolStorage[SHOULD_EMIT_REWARDED_ON_CYCLE];
  }

  function _setShouldEmitRewardedOnCycle(bool _status) internal {
    boolStorage[SHOULD_EMIT_REWARDED_ON_CYCLE] = _status;
  }
}
