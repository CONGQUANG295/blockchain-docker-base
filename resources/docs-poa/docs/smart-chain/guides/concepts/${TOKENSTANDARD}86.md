# ${TOKENSTANDARD}86

> Note: this feature is only available in Testnet after Lagrange Upgrade.

## Motivations

This BEP is designed to increase the rewards for relayer operators.

## Extra Rewards From SystemReward

This new ${TOKENSTANDARD} will introduce a new agovernable parameter `dynamicExtraIncentiveAmount` to the [RelayerIncentivize Contract](https://github.com/${githubusername}/${name}-genesis-contract/blob/master/contracts/RelayerIncentivize.sol). These extra  amount of ${SYMBOL} which will be transferred from the `SystemReward` to the ${name} relayer reward pool.

## Claim Extra Rewards

1. Claim `dynamicExtraIncentiveAmount` from the SystemReward contract.
2. Add the new claimed reward to the existing reward.
3. Add the total reward to the relayer reward pool.

You can see the implementation in this [PR](https://github.com/${githubusername}/${name}-genesis-contract/pull/86)
