# Cross-chain Communication

## How much is cross-chain transfer fee?

The total cost of transfer from BC to ${Name} is composed of 2 parts:

* Fee for executing `bridge transfer-out` transaction is 0.004${SYMBOL},  pay validators on ${Name Chain}

* Fee for ${Name}-relayers 0.004${SYMBOL}. it will cover the fees of calling TokenHub Contract on ${Name Chain}.

The total cost of transfer from ${Name} to BC is composed of 2 parts:

* Fee for Oracle-relayers 0.004${SYMBOL}, pay for ${Name} relayers

* Call TokenHub Contract: You need to pay ${SYMBOL} for calling smart-contract on ${Name}, this transaction is metered by gas, which is a global parameter. At the moment, you need to pay about 0.0005${SYMBOL} ~ 0.0015${SYMBOL}.

## What's is a ${Name} relayer?

${Name} relayer monitors cross chain packages on ${Name Chain}, builds and broadcasts transactions to ${Name} to deliver these packages, which is the key of cross chain communication from ${Name Chain} to ${Name}.

## What's is an Oracle relayer?

Oracle Relayer watches the state change of ${Name Chain}. Once it catches Cross-Chain Communication Events, it will submit to vote for the requests. After Oracle Relayers from ⅔ of the voting power of BC validators vote for the changes, the cross-chain actions will be performed. Only validators of ${Name Chain} are eligible to run Oracle relayers.

## What's an oracle?

In blockchain network, an oracle refers to the element that connects smart contracts with data from the outside world. In the network of ${Name Chain}, the execution of the transanction wil emit Events, and such events can be packaged and relayed onto BC. In this way, BC will get updates about changes of ${Name}.

## Which wallet support cross-chain transfer?

You need to use [MyEtherWallet](../../smart-chain/wallet/myetherwallet.md) to call contracts and use ${Name Chain} commandline client: `eth-cli`/ `eth-cli` for complementary commands

Please refer to this [guide](../../smart-chain/developer/cross-chain-transfer.md) for details

## How to send cross-chain transfer?

You can use [${Name Chain} extension wallet](../../smart-chain/wallet/${name}.md) or

use [Trust wallet](https://community.trustwallet.com/t/how-to-send-and-receive-${symbol}-on-smart-chain/67430)
