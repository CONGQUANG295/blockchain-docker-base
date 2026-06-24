pragma solidity ^0.4.24;

import "./vendor/interfaces/IBlockReward.sol";
import "./vendor/interfaces/IVoting.sol";
import "./ConsensusUtils.sol";

/**
* @title Contract handling consensus logic
* @author LiorRabin
*/
contract Consensus is ConsensusUtils {
  /**
  * @dev Function to be called on contract initialization
  * @param _initialValidator address of the initial validator. If not set - msg.sender will be the initial validator
  */
  function initialize(address _initialValidator) external onlyOwner {
    require(!isInitialized());
    _setSystemAddress(0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE);
    _setCurrentCycle();
    if (_initialValidator == address(0)) {
      _currentValidatorsAdd(msg.sender);
    } else {
      _currentValidatorsAdd(_initialValidator);
    }
    _setFinalized(true);
    setInitialized(true);
  }

  /**
  * @dev Function which returns the current validator addresses
  */
  function getValidators() external view returns(address[]) {
    return currentValidators();
  }

  /**
  * @dev See ValidatorSet.finalizeChange
  */
  function finalizeChange() external onlySystem notFinalized {
    if (newValidatorSetLength() > 0) {
      _setCurrentValidators(newValidatorSet());
      emit ChangeFinalized(currentValidators());
    }
    _setFinalized(true);
  }

  /**
  * @dev Fallback disabled — use StakingVault
  */
  function () external payable {
    revert("GTBS: use StakingVault");
  }

  /**
  * @dev stake via StakingVault only
  */
  function stake() external payable {
    revert("GTBS: use StakingVault");
  }

  /**
  * @dev delegate via StakingVault only
  */
  function delegate(address) external payable {
    revert("GTBS: use StakingVault");
  }

  /**
  * @dev withdraw via StakingVault only
  */
  function withdraw(uint256) external {
    revert("GTBS: use StakingVault");
  }

  /**
  * @dev withdraw via StakingVault only
  */
  function withdraw(address, uint256) external {
    revert("GTBS: use StakingVault");
  }

  function stakeFromVault(address _staker, address _validator) external payable onlyStakingVault {
    _delegate(_staker, msg.value, _validator);
  }

  function delegateFromVault(address _staker, address _validator) external payable onlyStakingVault {
    _delegate(_staker, msg.value, _validator);
  }

  function withdrawFromVault(address _staker, address _validator, uint256 _amount) external onlyStakingVault {
    _withdraw(_staker, _amount, _validator);
  }

  /**
  * @dev Function to be called by the block reward contract each block to handle cycles and snapshots logic
  */
  function cycle(address _validator) external onlyBlockReward {
    _incBlockCounter(_validator);
    if (_hasCycleEnded()) {
      IVoting(ProxyStorage(getProxyStorage()).getVoting()).onCycleEnd(currentValidators());
      _setCurrentCycle();
      _checkJail(currentValidators());
      address[] memory newSet = pendingValidators();
      if (newSet.length > 0) {
        _setNewValidatorSet(newSet);
      }
      if (newValidatorSetLength() > 0) {
        _setFinalized(false);
        _setShouldEmitInitiateChange(true);
        emit ShouldEmitInitiateChange();
      }
      IBlockReward(ProxyStorage(getProxyStorage()).getBlockReward()).onCycleEnd();
    }
  }

  /**
  * @dev Function to be called by validators only to emit InitiateChange event (only if `shouldEmitInitiateChange` returns true)
  */
  function emitInitiateChange() external onlyValidator {
    require(shouldEmitInitiateChange());
    require(newValidatorSetLength() > 0);
    emit InitiateChange(blockhash(block.number - 1), newValidatorSet());
    _setShouldEmitInitiateChange(false);
  }


  /**
  * @dev Validator fee disabled on GTBS profile (commission embedded in NET APY).
  */
  function setValidatorFee(uint256) external onlyValidator {
    revert("GTBS: validator fee disabled");
  }

  /**
  * @dev Function to be called by jailed validator, in order to be released from jail
  */
  function unJail() external onlyJailedValidator {
    require(getReleaseBlock(msg.sender) <= getCurrentCycleEndBlock());

    _removeFromJail(msg.sender);
  }

  /**
  * @dev Function to be called by current validators to be dropped from the next cycle in order to perform maintenance 
  */
  function maintenance() external onlyValidator {
    require(isJailed(msg.sender) == false);
    _maintenance(msg.sender);
  }
}
