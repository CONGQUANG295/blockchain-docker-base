#!/usr/bin/env node
/**
 * Read gtbs-staking.env and emit config/gtbs-deploy-config.json for deploy script.
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
  const env = loadEnvFile(envPath);

  const delegatorLockDays = Number(env.DELEGATOR_LOCK_DAYS || 180);
  const unstakeFeeBps = Number(env.UNSTAKE_FEE_BPS || 1000);

  if (delegatorLockDays < 7) {
    throw new Error("DELEGATOR_LOCK_DAYS must be >= 7");
  }
  if (unstakeFeeBps > 2000) {
    throw new Error("UNSTAKE_FEE_BPS must be <= 2000");
  }

  const netApyPercent = Number(env.NET_APY_PERCENT || 4);
  const config = {
    minStakeWei: tokensToWei(env.MIN_STAKE_TOKENS || "100000").toString(),
    maxStakeWei: tokensToWei(env.MAX_STAKE_TOKENS || "300000000").toString(),
    minDelegationWei: tokensToWei(env.MIN_DELEGATION_TOKENS || "10000").toString(),
    maxDelegationPerWalletWei: tokensToWei(
      env.MAX_DELEGATION_PER_WALLET_TOKENS || "100000"
    ).toString(),
    netApyBps: netApyPercent * 100,
    annualUnlockCapWei: tokensToWei(env.ANNUAL_UNLOCK_CAP_TOKENS || "500000").toString(),
    unstakeFeeBps,
    delegatorLockSeconds: daysToSeconds(delegatorLockDays),
    annualUnlockPeriodSeconds: daysToSeconds(env.ANNUAL_UNLOCK_PERIOD_DAYS || 365),
    releaseDelaySeconds: daysToSeconds(env.RELEASE_DELAY_DAYS || 30),
    blockTimeSeconds: Number(env.BLOCK_TIME_SECONDS || 1),
    blocksPerYear: Number(env.BLOCKS_PER_YEAR || 31536000),
  };

  const outDir = path.join(__dirname, "../config");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "gtbs-deploy-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log(`Wrote ${outPath}`);
}

main();
