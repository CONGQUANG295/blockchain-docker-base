#!/usr/bin/env node
/**
 * Patch ConsensusUtils.sol and BlockReward.sol constants from dpos.contract.env.
 */
const fs = require("fs");
const path = require("path");

const envPath =
  process.env.DPOS_CONTRACT_ENV ||
  path.join(__dirname, "../../../blockchain-dockerize/docker-compose/chain-dpos/envs/dpos.contract.env");

require("dotenv").config({ path: envPath });

function requireEnv(name) {
  const value = process.env[name];
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

/** e.g. 100000 × 10^18 → 1e23 (same style as fuse-network) */
function formatScientific(coefficient, exponent) {
  let coeff = BigInt(coefficient);
  let exp = BigInt(exponent);
  while (coeff > 0n && coeff % 10n === 0n) {
    coeff /= 10n;
    exp += 1n;
  }
  return `${coeff}e${exp}`;
}

const decimals = BigInt(requireEnv("DECIMALS"));
const blockTime = Number(requireEnv("BLOCK_TIME_SECONDS"));
const cycleSec = Number(requireEnv("CYCLE_DURATION_SECONDS"));
const inflation = requireEnv("INFLATION_PERCENT");

if (cycleSec % blockTime !== 0) {
  throw new Error("CYCLE_DURATION_SECONDS must be divisible by BLOCK_TIME_SECONDS");
}
if (31536000 % blockTime !== 0) {
  throw new Error("BLOCK_TIME_SECONDS must divide 31536000 evenly");
}

const cycleBlocks = cycleSec / blockTime;
const blocksPerYear = 31536000 / blockTime;
const minStakeTokens = requireEnv("MIN_STAKE_TOKENS");
const maxStakeTokens = requireEnv("MAX_STAKE_TOKENS");
const validatorFeePercent = requireEnv("DEFAULT_VALIDATOR_FEE_PERCENT");

const minStake = BigInt(minStakeTokens) * 10n ** decimals;
const maxStake = BigInt(maxStakeTokens) * 10n ** decimals;
const validatorFee =
  BigInt(validatorFeePercent) * 10n ** (decimals - 2n);

const minStakeLiteral = formatScientific(minStakeTokens, decimals);
const maxStakeLiteral = formatScientific(maxStakeTokens, decimals);
const validatorFeeLiteral = formatScientific(validatorFeePercent, decimals - 2n);

const contractsDir = path.join(__dirname, "../contracts");
const consensusPath = path.join(contractsDir, "ConsensusUtils.sol");
const blockRewardPath = path.join(contractsDir, "BlockReward.sol");

let consensus = fs.readFileSync(consensusPath, "utf8");
consensus = replaceConstant(consensus, "MIN_STAKE", minStakeLiteral);
consensus = replaceConstant(consensus, "MAX_STAKE", maxStakeLiteral);
consensus = replaceConstant(
  consensus,
  "CYCLE_DURATION_BLOCKS",
  `${cycleBlocks}`
);
consensus = replaceConstant(
  consensus,
  "DEFAULT_VALIDATOR_FEE",
  validatorFeeLiteral
);
fs.writeFileSync(consensusPath, consensus);

let blockReward = fs.readFileSync(blockRewardPath, "utf8");
blockReward = replaceConstant(blockReward, "INFLATION", inflation);
blockReward = replaceConstant(
  blockReward,
  "BLOCKS_PER_YEAR",
  `${blocksPerYear}`
);
fs.writeFileSync(blockRewardPath, blockReward);

console.log(
  JSON.stringify(
    {
      MIN_STAKE: minStake.toString(),
      MAX_STAKE: maxStake.toString(),
      CYCLE_DURATION_BLOCKS: cycleBlocks,
      DEFAULT_VALIDATOR_FEE: validatorFee.toString(),
      INFLATION: inflation,
      BLOCKS_PER_YEAR: blocksPerYear,
    },
    null,
    2
  )
);
