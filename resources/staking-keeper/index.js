require("dotenv").config();
const Web3 = require("web3");
const pino = require("pino");
const { STAKING_VAULT_ABI } = require("./lib/vault-abi");
const { findPendingUnstakes } = require("./lib/eligible");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let lastProcessedBlock = 0;

async function runMain() {
  const rpc = process.env.RPC_URL || process.env.DPOS_RPC_URL || "http://127.0.0.1:8545";
  const vaultAddress = process.env.STAKING_VAULT_ADDRESS;
  const privateKey = process.env.BOT_PRIVATE_KEY;

  if (!vaultAddress || !privateKey) {
    throw new Error("STAKING_VAULT_ADDRESS and BOT_PRIVATE_KEY are required");
  }

  const web3 = new Web3(rpc);
  const account = web3.eth.accounts.privateKeyToAccount(
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  );
  web3.eth.accounts.wallet.add(account);

  const vault = new web3.eth.Contract(STAKING_VAULT_ABI, vaultAddress);
  const fromBlock = lastProcessedBlock || Number(process.env.FROM_BLOCK || 0);
  const pending = await findPendingUnstakes(web3, vault, fromBlock);

  for (const item of pending) {
    try {
      logger.info({ user: item.user, validator: item.validator }, "completeUnstake");
      await vault.methods.completeUnstake(item.user, item.validator).send({
        from: account.address,
        gas: Number(process.env.GAS || 500000),
      });
    } catch (err) {
      logger.warn({ err: err.message, ...item }, "completeUnstake skipped");
    }
  }

  const latest = await web3.eth.getBlockNumber();
  lastProcessedBlock = latest;
}

async function start() {
  const interval = Number(process.env.POLLING_INTERVAL || 300000);
  while (true) {
    try {
      await runMain();
    } catch (err) {
      logger.error({ err: err.message }, "keeper loop error");
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});
