# ${TOKENSTANDARD}82

> Note: this feature is only available in Testnet after Lagrange Upgrade.

## Introduction

Before implementing ${TOKENSTANDARD}82, many token-related transactions, such as token listing, minting, burning, can only be proposed by the token owner.  The owner of any ${TOKENSTANDARD}2/${TOKENSTANDARD}8  token can not be changed once the token is issued on ${Name Chain}.

${TOKENSTANDARD}82 introduced the changes related to the token owner who issued a token on ${Name Chain}. It provides more convenience and flexibility for these transactions.

## Status

This BEP is already implemented.

## Changes

${TOKENSTANDARD}82 introduce the following changes:

- Token issuers can renounce their ownership and promote others
- Allows token holders to burn their tokens

## New Transaction Type

**TransferOwnership** transaction can transfer ownership of a specific token to another address, and only the original owner has the permission to send this transaction.

#### Commands

Example on **mainnet**:

```bash
./eth-cli token transfer-ownership --from  $current-owner --symbol $symbol --new-owner $new-owner  --chain-id ${Name-Chain}-Tigris   --node  https://dataseed5.${domainchain}:443 --trust-node
```
Example on **testnet**:

```bash
./eth-cli token transfer-ownership --from  $current-owner --symbol $symbol --new-owner $new-owner --chain-id ${Name-Chain}-Nile  --node=data-seed-pre-2-s1.${domainchain}:80--trust-node
```

## Fees

**0.01 ${SYMBOL}** will be charged on **TransferOwnership** transactions.




