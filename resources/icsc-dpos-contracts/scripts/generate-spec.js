#!/usr/bin/env node
/**
 * Generate or patch OpenEthereum spec.json for ICSC DPoS bootstrap.
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

  return template;
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
