#!/usr/bin/env node
/**
 * Merge gtbs-deploy-config + contract-addresses into genesis/gtbs-deploy-manifest.json
 * for Blockscout verify (flatten sources + initialize args reference).
 */
const fs = require("fs");
const path = require("path");

const genesisDir = process.argv[2] || "/app/genesis";
const configPath = path.join(__dirname, "../config/gtbs-deploy-config.json");
const addressesPath = path.join(genesisDir, "contract-addresses.json");
const flatsDir = path.join(genesisDir, "flats");

if (!fs.existsSync(configPath)) {
  console.error(`Missing ${configPath} — run generate-gtbs-config.js first`);
  process.exit(1);
}

const deployConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const contractAddresses = fs.existsSync(addressesPath)
  ? JSON.parse(fs.readFileSync(addressesPath, "utf8"))
  : null;

const flattenedContracts = fs.existsSync(flatsDir)
  ? fs
      .readdirSync(flatsDir)
      .filter((name) => name.endsWith("_flat.sol"))
      .sort()
  : [];

const manifest = {
  generatedAt: new Date().toISOString(),
  profile: "gtbs-custom-staking",
  deployConfig,
  contractAddresses,
  blockscoutVerify: {
    flattenedDir: "genesis/flats",
    flattenedContracts,
    note:
      "Flattened sources reflect env-patched Solidity constants. " +
      "Initialize args (netApyBps, staking vault timings, premine supply) are in deployConfig " +
      "and were applied at deploy time — supply them separately when verifying proxies on Blockscout.",
    initializeParams: {
      consensus: contractAddresses
        ? { initialValidator: contractAddresses.initialValidatorAddress }
        : { initialValidator: "(set after deploy)" },
      blockReward: {
        supplyWei: deployConfig.premineWei,
        netApyBps: deployConfig.netApyBps,
      },
      stakingVault: {
        delegatorLockSeconds: deployConfig.delegatorLockSeconds,
        annualUnlockPeriodSeconds: deployConfig.annualUnlockPeriodSeconds,
        releaseDelaySeconds: deployConfig.releaseDelaySeconds,
        annualUnlockCapWei: deployConfig.annualUnlockCapWei,
        unstakeFeeBps: deployConfig.unstakeFeeBps,
      },
    },
  },
};

const outPath = path.join(genesisDir, "gtbs-deploy-manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${outPath}`);
