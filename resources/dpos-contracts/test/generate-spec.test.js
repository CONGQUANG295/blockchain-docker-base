#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dpos-spec-"));
const envFile = path.join(tmp, "chain.env");
const outFile = path.join(tmp, "spec.json");
const script = path.join(__dirname, "../scripts/generate-spec.js");

fs.writeFileSync(
  envFile,
  [
    "NETWORK_NAME=Test",
    "NETWORK_ID=0x3a1",
    "BLOCK_TIME_SECONDS=5",
    "CONTRACT_TRANSITION_BLOCK=100",
    "PREMINE_ADDRESS=0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "PREMINE_BALANCE_WEI=1000",
    "VALIDATOR_BALANCE_WEI=500",
  ].join("\n")
);

const validator = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

execFileSync("node", [script, "--phase=1", "--env", envFile, "--validator", validator, "--out", outFile], {
  stdio: "inherit",
});

const spec = JSON.parse(fs.readFileSync(outFile, "utf8"));
assert.strictEqual(spec.name, "Test");
assert.strictEqual(spec.params.networkID, "0x3a1");
assert.strictEqual(
  spec.engine.authorityRound.params.validators.multi["0"].list[0],
  validator
);
assert.strictEqual(
  spec.engine.authorityRound.params.blockRewardContractTransition,
  100
);
assert.strictEqual(
  spec.engine.authorityRound.params.blockRewardContractAddress,
  undefined
);
assert.strictEqual(
  spec.accounts["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"].balance,
  "1000"
);
assert.strictEqual(spec.accounts[validator].balance, "500");
assert.strictEqual(spec.params.eip1559Transition, undefined);

const envEip1559 = path.join(tmp, "chain-eip1559.env");
fs.writeFileSync(
  envEip1559,
  [
    "NETWORK_NAME=Test-EIP1559",
    "NETWORK_ID=0x3a2",
    "BLOCK_TIME_SECONDS=5",
    "CONTRACT_TRANSITION_BLOCK=100",
    "PREMINE_ADDRESS=0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    "PREMINE_BALANCE_WEI=1000",
    "VALIDATOR_BALANCE_WEI=500",
    "ENABLE_EIP1559=true",
    "EIP1559_TRANSITION_BLOCK=0",
    "EIP1559_BASE_FEE_INITIAL_VALUE=0x3B9ACA00",
  ].join("\n")
);

const outEip1559 = path.join(tmp, "spec-eip1559.json");
execFileSync(
  "node",
  [script, "--phase=1", "--env", envEip1559, "--validator", validator, "--out", outEip1559],
  { stdio: "inherit" }
);

const specEip1559 = JSON.parse(fs.readFileSync(outEip1559, "utf8"));
assert.strictEqual(specEip1559.params.eip1559Transition, "0");
assert.strictEqual(specEip1559.params.eip3198Transition, "0");
assert.strictEqual(specEip1559.params.eip3529Transition, "0");
assert.strictEqual(specEip1559.params.eip3541Transition, "0");
assert.strictEqual(specEip1559.params.eip1559BaseFeeMaxChangeDenominator, "0x8");
assert.strictEqual(specEip1559.params.eip1559ElasticityMultiplier, "0x2");
assert.strictEqual(specEip1559.params.eip1559BaseFeeInitialValue, "0x3B9ACA00");
assert.strictEqual(specEip1559.genesis.baseFeePerGas, "0x3B9ACA00");

execFileSync(
  "node",
  [
    script,
    "--phase=2",
    "--in",
    outFile,
    "--consensus",
    "0x1111111111111111111111111111111111111111",
    "--reward",
    "0x2222222222222222222222222222222222222222",
    "--transition",
    "100",
    "--out",
    outFile,
  ],
  { stdio: "inherit" }
);

const spec2 = JSON.parse(fs.readFileSync(outFile, "utf8"));
assert.strictEqual(
  spec2.engine.authorityRound.params.blockRewardContractAddress,
  "0x2222222222222222222222222222222222222222"
);
assert.strictEqual(
  spec2.engine.authorityRound.params.validators.multi["100"].safeContract,
  "0x1111111111111111111111111111111111111111"
);

console.log("generate-spec.test.js passed");
