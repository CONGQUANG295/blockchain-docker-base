#!/usr/bin/env node
/**
 * Read gtbs-staking.env (+ optional dpos.chain.env) and emit config/gtbs-deploy-config.json.
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function tokensToWei(tokens) {
  const [whole, frac = ""] = String(tokens).split(".");
  const padded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded);
}

function daysToSeconds(days) {
  return Number(days) * 86400;
}

function main() {
  const envPath =
    process.env.GTBS_STAKING_ENV ||
    path.join(__dirname, "../env/gtbs-staking.env.example");
  const chainEnvPath =
    process.env.DPOS_CHAIN_ENV ||
    path.join(
      __dirname,
      "../../../blockchain-dockerize/docker-compose/chain-dpos/envs/dpos.chain.env"
    );

  const contractEnvPath =
    process.env.DPOS_CONTRACT_ENV ||
    path.join(
      __dirname,
      "../../../blockchain-dockerize/docker-compose/chain-dpos/envs/dpos.contract.env"
    );

  const env = loadEnvFile(envPath);
  const chainEnv = fs.existsSync(chainEnvPath) ? loadEnvFile(chainEnvPath) : {};
  const contractEnv = fs.existsSync(contractEnvPath) ? loadEnvFile(contractEnvPath) : {};

  const minStakeTokens =
    env.MIN_STAKE_TOKENS || contractEnv.MIN_STAKE_TOKENS || "100000";
  const maxStakeTokens =
    env.MAX_STAKE_TOKENS || contractEnv.MAX_STAKE_TOKENS || "300000000";

  const delegatorLockDays = Number(env.DELEGATOR_LOCK_DAYS || 180);
  const unstakeFeeBps = Number(env.UNSTAKE_FEE_BPS || 1000);

  if (delegatorLockDays < 7) {
    throw new Error("DELEGATOR_LOCK_DAYS must be >= 7");
  }
  if (unstakeFeeBps > 2000) {
    throw new Error("UNSTAKE_FEE_BPS must be <= 2000");
  }

  const blockTimeSeconds = Number(
    env.BLOCK_TIME_SECONDS || chainEnv.BLOCK_TIME_SECONDS || 5
  );
  if (31536000 % blockTimeSeconds !== 0) {
    throw new Error("BLOCK_TIME_SECONDS must divide 31536000 evenly");
  }
  const blocksPerYear = 31536000 / blockTimeSeconds;

  const maxSupplyWei = chainEnv.MAX_SUPPLY_WEI || env.MAX_SUPPLY_WEI;
  const premineWei = chainEnv.PREMINE_BALANCE_WEI || env.PREMINE_BALANCE_WEI;
  if (maxSupplyWei && premineWei) {
    const mining = BigInt(maxSupplyWei) - BigInt(premineWei);
    if (mining <= 0n) {
      throw new Error("MAX_SUPPLY_WEI must exceed PREMINE_BALANCE_WEI");
    }
  }

  const netApyPercent = Number(env.NET_APY_PERCENT || 4);
  const config = {
    minStakeWei: tokensToWei(minStakeTokens).toString(),
    maxStakeWei: tokensToWei(maxStakeTokens).toString(),
    netApyBps: netApyPercent * 100,
    annualUnlockCapWei: tokensToWei(env.ANNUAL_UNLOCK_CAP_TOKENS || "500000").toString(),
    unstakeFeeBps,
    delegatorLockSeconds: daysToSeconds(delegatorLockDays),
    annualUnlockPeriodSeconds: daysToSeconds(env.ANNUAL_UNLOCK_PERIOD_DAYS || 365),
    releaseDelaySeconds: daysToSeconds(env.RELEASE_DELAY_DAYS || 30),
    blockTimeSeconds,
    blocksPerYear,
    maxSupplyWei: maxSupplyWei || null,
    premineWei: premineWei || null,
  };

  const outDir = path.join(__dirname, "../config");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "gtbs-deploy-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
