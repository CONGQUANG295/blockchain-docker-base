#!/usr/bin/env node
/**
 * Generate or patch OpenEthereum spec.json for DPoS bootstrap.
 * Phase 1: validator list + premine, no contract addresses.
 * Phase 2: inject Consensus proxy + BlockReward proxy at transition block.
 */
const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const body = token.slice(2);
    if (body.includes("=")) {
      const [key, ...rest] = body.split("=");
      args[key] = rest.join("=");
      continue;
    }
    const key = body;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function loadEnvFile(envFile) {
  const env = {};
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function requireField(env, name) {
  const value = env[name];
  if (!value) throw new Error(`Missing required env field: ${name}`);
  return value;
}

function loadTemplate() {
  const templatePath = path.join(__dirname, "../config/spec.json");
  return JSON.parse(fs.readFileSync(templatePath, "utf8"));
}

function normalizeAddress(address) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase();
}

function parseBool(value) {
  if (value === undefined || value === null || value === "") return false;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function parseHexQuantity(value, name) {
  if (!/^0x[0-9a-fA-F]+$/i.test(value)) {
    throw new Error(`${name} must be a hex quantity (e.g. 0x3B9ACA00)`);
  }
  return value;
}

function applyEip1559(spec, env) {
  if (!parseBool(env.ENABLE_EIP1559)) {
    return spec;
  }

  const transition = env.EIP1559_TRANSITION_BLOCK ?? "0";
  const baseFeeInitial = parseHexQuantity(
    env.EIP1559_BASE_FEE_INITIAL_VALUE || "0x3B9ACA00",
    "EIP1559_BASE_FEE_INITIAL_VALUE"
  );
  const maxChangeDenominator = parseHexQuantity(
    env.EIP1559_BASE_FEE_MAX_CHANGE_DENOMINATOR || "0x8",
    "EIP1559_BASE_FEE_MAX_CHANGE_DENOMINATOR"
  );
  const elasticityMultiplier = parseHexQuantity(
    env.EIP1559_ELASTICITY_MULTIPLIER || "0x2",
    "EIP1559_ELASTICITY_MULTIPLIER"
  );

  spec.params.eip1559Transition = transition;
  spec.params.eip3198Transition = transition;
  spec.params.eip3529Transition = transition;
  spec.params.eip3541Transition = transition;
  spec.params.eip1559BaseFeeMaxChangeDenominator = maxChangeDenominator;
  spec.params.eip1559ElasticityMultiplier = elasticityMultiplier;
  spec.params.eip1559BaseFeeInitialValue = baseFeeInitial;

  if (env.EIP1559_BASE_FEE_MIN_VALUE) {
    const minValue = parseHexQuantity(
      env.EIP1559_BASE_FEE_MIN_VALUE,
      "EIP1559_BASE_FEE_MIN_VALUE"
    );
    spec.params.eip1559BaseFeeMinValue = minValue;
    spec.params.eip1559BaseFeeMinValueTransition =
      env.EIP1559_BASE_FEE_MIN_VALUE_TRANSITION || transition;
  }

  if (env.EIP1559_FEE_COLLECTOR) {
    const collector = normalizeAddress(env.EIP1559_FEE_COLLECTOR);
    spec.params.eip1559FeeCollector = collector;
    spec.params.eip1559FeeCollectorTransition =
      env.EIP1559_FEE_COLLECTOR_TRANSITION || transition;
  }

  if (String(transition) === "0") {
    spec.genesis.baseFeePerGas = baseFeeInitial;
  }

  return spec;
}

function buildPhase1(env, validatorAddress) {
  const template = loadTemplate();
  const networkName = requireField(env, "NETWORK_NAME");
  const networkId = requireField(env, "NETWORK_ID");
  const blockTime = requireField(env, "BLOCK_TIME_SECONDS");
  const transition = requireField(env, "CONTRACT_TRANSITION_BLOCK");
  const premine = normalizeAddress(requireField(env, "PREMINE_ADDRESS"));
  const premineBalance = requireField(env, "PREMINE_BALANCE_WEI");
  const validatorBalance = requireField(env, "VALIDATOR_BALANCE_WEI");
  const validator = normalizeAddress(validatorAddress);

  if (premine === validator) {
    throw new Error("PREMINE_ADDRESS must differ from validator address");
  }

  template.name = networkName;
  template.params.networkID = networkId;
  template.engine.authorityRound.params.stepDuration = String(blockTime);
  template.engine.authorityRound.params.blockReward = "0x0";
  template.engine.authorityRound.params.blockRewardContractTransition = Number(
    transition
  );
  delete template.engine.authorityRound.params.blockRewardContractAddress;

  template.engine.authorityRound.params.validators = {
    multi: {
      0: {
        list: [validator],
      },
    },
  };

  const builtins = {};
  for (const [addr, account] of Object.entries(template.accounts)) {
    if (account.builtin) {
      builtins[addr] = account;
    }
  }
  template.accounts = {
    ...builtins,
    [premine]: { balance: premineBalance },
    [validator]: { balance: validatorBalance },
  };

  return applyEip1559(template, env);
}

function buildPhase2(spec, consensusProxy, blockRewardProxy, transitionBlock) {
  const transition = String(transitionBlock);
  const consensus = normalizeAddress(consensusProxy);
  const reward = normalizeAddress(blockRewardProxy);

  spec.engine.authorityRound.params.blockRewardContractAddress = reward;
  spec.engine.authorityRound.params.validators.multi[transition] = {
    safeContract: consensus,
  };
  return spec;
}

function main() {
  const args = parseArgs(process.argv);
  const phase = args.phase || "1";
  const outPath = args.out;

  if (!outPath) {
    throw new Error("--out is required");
  }

  if (phase === "1") {
    if (!args.env || !args.validator) {
      throw new Error("phase 1 requires --env and --validator");
    }
    const env = loadEnvFile(args.env);
    const spec = buildPhase1(env, args.validator);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
    console.log(`Wrote phase-1 spec to ${outPath}`);
    return;
  }

  if (phase === "2") {
    const inPath = args.in || outPath;
    if (!args.consensus || !args.reward || !args.transition) {
      throw new Error("phase 2 requires --consensus, --reward, --transition");
    }
    const spec = JSON.parse(fs.readFileSync(inPath, "utf8"));
    buildPhase2(spec, args.consensus, args.reward, args.transition);
    fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
    console.log(`Wrote phase-2 spec to ${outPath}`);
    return;
  }

  throw new Error(`Unknown phase: ${phase}`);
}

main();
