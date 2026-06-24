#!/usr/bin/env node
/**
 * Generate OpenEthereum-compatible keystore (UTC--*) using keythereum format.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const keythereum = require("keythereum");

const validatorDir = process.argv[2];
if (!validatorDir) {
  console.error("Usage: generate-validator-key.js <validator-dir>");
  process.exit(1);
}

const keysPath = path.join(validatorDir, "keystore");
const passFile = path.join(validatorDir, "node.pwd");

fs.mkdirSync(keysPath, { recursive: true });

let password;
if (fs.existsSync(passFile)) {
  password = fs.readFileSync(passFile, "utf8").trim();
} else {
  password = crypto.randomBytes(12).toString("base64");
  fs.writeFileSync(passFile, `${password}\n`);
}

const existing = fs
  .readdirSync(keysPath)
  .find((name) => name.startsWith("UTC--"));
if (existing) {
  const key = JSON.parse(fs.readFileSync(path.join(keysPath, existing), "utf8"));
  process.stdout.write(`0x${key.address}\n`);
  process.exit(0);
}

const dk = keythereum.create();
const privateKey = dk.privateKey;
const keyObject = keythereum.dump(password, privateKey, dk.salt, dk.iv);
const filename = keythereum.exportToFile(keyObject, keysPath);
const address = `0x${keyObject.address}`;
process.stdout.write(`${address}\n`);
