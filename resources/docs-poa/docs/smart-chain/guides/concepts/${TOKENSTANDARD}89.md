# ${TOKENSTANDARD}89

> Note: this feature is only available in Testnet after Lagrange Upgrade.


## Motivations

${Name Chain} will have some hard forks inevitably in the long run. When different valdiator nodes use different version of ${Name} Chains codebase either unintentionally or as a result of an attack, it may lead to a consensus fork or a chain split. By far the vast majority of changes to the ${Name Chain} codebase have no impact on consensus rules. Note that this type of fork is very different than a codebase fork (usually done by cloning someone else’s repository).

When a change is proposed that affects compatibility with other nodes, a BEP (${Name} Evolution Proposal) is typically required. A brief description of the BEP process along with a list of existing ${TOKENSTANDARD}s can be found [here](https://github.com/${githubusername}/${TOKENSTANDARD}s).

[${TOKENSTANDARD}89](https://github.com/${githubusername}/${TOKENSTANDARD}s/blob/master/${TOKENSTANDARD}89.md) is introduced to enable the chain to display the whole view of validators that on different upcoming forks. Any nodes/validators can decide to upgrade/fork or not accordingly. ${Name Chain} full nodes are able to display the whole view of validators that on different upcoming forks.



## Implementatiion


The proposal `FORK_HASH` takes an "IEEE CRC32 checksum ([4]byte) of the genesis hash + fork blocks numbers that already passed. Validator nodes will fill in `Header.Extra` with `NEXT_FORK_HASH` during preparing block header.

The fullnodes will log a warning message if the majority `NEXT_FORK_HASH` is different from local.

Example log of warning:

```
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
t=2021-01-20T21:40:09+0800 lvl=warn msg="there is a possible fork, and your client is not the majority. Please check..." nextForkHash=cd0d163d
```
You can see the implementation in this [PR](https://github.com/${githubusername}/${githubrepo}/pull/53)


