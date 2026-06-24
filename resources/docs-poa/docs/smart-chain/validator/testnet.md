# How to become a Validator Candidate

## Install Fullnode

Please follow this [guide](../developer/fullnode.md) to install ${name} fullnode locally.

## Create an account

You need to create an account that represents a key pair first. Use the following command to create a new account and set a password for that account:
```bash
geth account new --datadir ./node
```

This command will return the public address and the path to your private key. BACKUP of keyfile is necessory!

If you already have an account, use the seed phrase to recover it:

```bash
geth account import --datadir ./node
```

### Get some testnet fund from faucet

Go to this faucet page: <https://faucet.${domainchain}>

### Transfer ${SYMBOL} from ${Name} to BC

Please refer to this [guide](https://${name}-wallet.gitbook.io/${name}-chain-extension-wallet/best-practice/transfer-testnet-${symbol}-from-${name}-to-bc) to transfer ${SYMBOL} with ${Name Chain} extension wallet.


### Become a validator candidate

You can use `eth-cli` to [declare your candidacy](../../guides/concepts/bc-staking.md#create-${name}-validator) some of ${SYMBOL} to a validator

Go to [testnet explorer](https://testnet-explorer.${domainchain}/) to verify your transactions.

### Get Genesis file and Config file
```bash
wget --no-check-certificate  $(curl -s https://api.github.com/repos/${name}-chain/${name}/releases/latest |grep browser_ |grep testnet |cut -d\" -f4)
unzip testnet.zip
```

### Start Fullnode on ${Name} Testnet

Please run this command to run a fullnode as validator candidate

```bash
geth --datadir node init genesis.json
geth --config ./config.toml --datadir ./node --syncmode snap -unlock {validator-address} --mine --allow-insecure-unlock 
```

### Become a validator candidate of testnet

You can use `eth-cli` to [declare your candidacy](../../guides/concepts/bc-staking.md#create-${name}-validator) some of ${SYMBOL} to a validator

Go to [explorer](https://testnet-explorer.${domainchain}/) to verify your transactions.
