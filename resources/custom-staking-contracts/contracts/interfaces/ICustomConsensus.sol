pragma solidity ^0.4.24;

interface ICustomConsensus {
  function setStakingVault(address _vault) external;
  function stakeFromVault(address _staker, address _validator) external payable;
  function delegateFromVault(address _staker, address _validator) external payable;
  function withdrawFromVault(address _staker, address _validator, uint256 _amount) external;
  function delegators(address _validator) external view returns (address[]);
  function delegatedAmount(address _delegator, address _validator) external view returns (uint256);
  function totalDelegated(address _validator) external view returns (uint256);
  function selfStake(address _validator) external view returns (uint256);
  function stakeAmount(address _validator) external view returns (uint256);
}
