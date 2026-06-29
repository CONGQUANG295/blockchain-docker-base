#!/usr/bin/env node
/**
 * Patch custom-staking-contracts Solidity constants from rendered env files.
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

function requireFrom(env, name) {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function replaceConstant(source, name, newValue) {
  const pattern = new RegExp(
    `(uint256 public constant ${name} = )[^;]+;(\\s*//.*)?`,
    "m"
  );
  if (!pattern.test(source)) {
    throw new Error(`Constant ${name} not found`);
  }
  return source.replace(pattern, `$1${newValue};$2`);
}

function formatScientific(coefficient, exponent) {
  let coeff = BigInt(coefficient);
  let exp = BigInt(exponent);
  while (coeff > 0n && coeff % 10n === 0n) {
    coeff /= 10n;
    exp += 1n;
  }
  return `${coeff}e${exp}`;
}

const gtbsEnvPath =
  process.env.GTBS_STAKING_ENV ||
  path.join(__dirname, "../env/gtbs-staking.env.example");
const contractEnvPath =
  process.env.DPOS_CONTRACT_ENV ||
  path.join(
    __dirname,
    "../../../blockchain-dockerize/docker-compose/chain-dpos/envs/dpos.contract.env"
  );
const chainEnvPath =
  process.env.DPOS_CHAIN_ENV ||
  path.join(
    __dirname,
    "../../../blockchain-dockerize/docker-compose/chain-dpos/envs/dpos.chain.env"
  );

const gtbs = loadEnvFile(gtbsEnvPath);
const contract = loadEnvFile(contractEnvPath);
const chain = loadEnvFile(chainEnvPath);

const decimals = BigInt(requireFrom(contract, "DECIMALS"));
const blockTime = Number(requireFrom(contract, "BLOCK_TIME_SECONDS"));
const cycleSec = Number(requireFrom(contract, "CYCLE_DURATION_SECONDS"));
const maxSupplyWei = requireFrom(chain, "MAX_SUPPLY_WEI");

if (cycleSec % blockTime !== 0) {
  throw new Error("CYCLE_DURATION_SECONDS must be divisible by BLOCK_TIME_SECONDS");
}
if (31536000 % blockTime !== 0) {
  throw new Error("BLOCK_TIME_SECONDS must divide 31536000 evenly");
}

const cycleBlocks = cycleSec / blockTime;
const blocksPerYear = 31536000 / blockTime;
const minStakeTokens = requireFrom(contract, "MIN_STAKE_TOKENS");
const maxStakeTokens = requireFrom(gtbs, "MAX_STAKE_TOKENS");
const validatorFeePercent = requireFrom(contract, "DEFAULT_VALIDATOR_FEE_PERCENT");

const minStakeLiteral = formatScientific(minStakeTokens, decimals);
const maxStakeLiteral = formatScientific(maxStakeTokens, decimals);
const validatorFeeLiteral = formatScientific(validatorFeePercent, decimals - 2n);

const contractsDir = path.join(__dirname, "../contracts");
const consensusPath = path.join(contractsDir, "ConsensusUtils.sol");
const blockRewardPath = path.join(contractsDir, "BlockReward.sol");

let consensus = fs.readFileSync(consensusPath, "utf8");
consensus = replaceConstant(consensus, "MIN_STAKE", minStakeLiteral);
consensus = replaceConstant(consensus, "MAX_STAKE", maxStakeLiteral);
consensus = replaceConstant(consensus, "CYCLE_DURATION_BLOCKS", `${cycleBlocks}`);
consensus = replaceConstant(consensus, "DEFAULT_VALIDATOR_FEE", validatorFeeLiteral);
fs.writeFileSync(consensusPath, consensus);

let blockReward = fs.readFileSync(blockRewardPath, "utf8");
blockReward = replaceConstant(blockReward, "BLOCKS_PER_YEAR", `${blocksPerYear}`);
blockReward = replaceConstant(blockReward, "MAX_SUPPLY", `${maxSupplyWei}`);
fs.writeFileSync(blockRewardPath, blockReward);

console.log(
  JSON.stringify(
    {
      MIN_STAKE: (BigInt(minStakeTokens) * 10n ** decimals).toString(),
      MAX_STAKE: (BigInt(maxStakeTokens) * 10n ** decimals).toString(),
      CYCLE_DURATION_BLOCKS: cycleBlocks,
      DEFAULT_VALIDATOR_FEE: validatorFeePercent,
      BLOCKS_PER_YEAR: blocksPerYear,
      MAX_SUPPLY: maxSupplyWei,
    },
    null,
    2
  )
);
