#  Types of Nodes


## Full Node Node Roles

There are two types of Full Nodes in ${Name Chain} network: validator nodes and witness nodes.

### What is a Validator Node?

Validators are a group/IT infrastructure that take the responsibility to maintain the ${Name}
Chain/DEX data and validate all the transactions. They join the consensus procedure and
vote to produce blocks. The fees are collected and distributed among all validators.
You can consider Validator as "miner" in Bitcoin and Ethereum and similar concepts exist in dPoS
blockchain as EOS or dBFT in NEO. The initial validators are selected from trusted members of the
${Name} community, and will eventually expand to more members as the ${Name} blockchain and
ecosystem matures, this responsibility will be distributed. The decentralized governance procedure
will be introduced and executed. More qualified organization/individual can become Validators.


### What is a Witness Node?

Witness nodes represent the majority of nodes in a ${Name Chain} deployment. Although they do not join the consensus process
and produce blocks, they take care of:

- The witness consensus process.
- They serve as data replicas and help to propagate the chain state around the network.
- They receive transactions and broadcast them to all other nodes including Validator nodes.

You can see the witness node information from this endpoint: https://dex.${domainchain}/api/v1/peers

For mainnet, there are some witness nodes.

- `http://dataseed1.${domainchain}/`
- `http://dataseed2.${domainchain}/`
- `http://dataseed3.${domainchain}/`
- `https://dataseed4.${domainchain}/`

For testnet, there are some witness nodes.

- `https://data-seed-pre-0-s3.${domainchain}/`
- `https://data-seed-pre-1-s3.${domainchain}/`
- `https://data-seed-pre-2-s3.${domainchain}/`

To see the existing RPC endpoints provided by witness node, check the list  [here](../../api-reference/node-rpc.md)!

### What is an Accelerated Node?

While users can submit transactions and most of the queries via normal, self-run full nodes.<br/>
Accelerated Node provides more secure and faster lines to access ${Name Chain}.

Accelerated Node is special infrastructure built around Validator to facilitate accelerated transaction
routing and provide richer, faster user interfaces. There are always several Accelerated Nodes running
at the same time around the world (owned by different organizations) and you are encouraged to choose
one of them to use, or allow your Wallet choose one randomly.<br/>
For rapid API access, you'd better stay with one Accelerated Node to get better performance.

For mainnet, there are more accelerated nodes.

- `dex-atlantic.${domainchain}`
- `dex-asiapacific.${domainchain}`
- `dex-european.${domainchain}`

For testnet, there are 2 accelerated nodes setup as below. API users should try to use them directly.

- `testnet-dex-atlantic.${domainchain}`
- `testnet-dex-asiapacific.${domainchain}`

To see the existing endpoints provided by Accelerated node, check the list [here](../../api-reference/dex-api/paths.md)!

