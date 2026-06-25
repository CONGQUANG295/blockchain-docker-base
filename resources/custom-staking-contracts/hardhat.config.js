require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

function resolveKeystoreDir(configuredDir) {
  const candidates = [];
  if (configuredDir) candidates.push(configuredDir);
  if (configuredDir && configuredDir.endsWith(`${path.sep}keystore`)) {
    candidates.push(path.dirname(configuredDir));
  }
  candidates.push("/app/keys");
  const seen = new Set();
  for (const dir of candidates) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    try {
      if (
        fs.existsSync(dir) &&
        fs.readdirSync(dir).some((name) => name.startsWith("UTC--"))
      ) {
        return dir;
      }
    } catch (_) {
      /* try next candidate */
    }
  }
  return configuredDir || "/app/keys";
}

function getPrivateKeyFromKeystore(keystoreDir, passwordFile) {
  const keythereum = require("keythereum");
  const resolvedDir = resolveKeystoreDir(keystoreDir);
  const password = fs.readFileSync(passwordFile, "utf8").trim();
  const keystoreFile = fs
    .readdirSync(resolvedDir)
    .find((name) => name.startsWith("UTC--"));
  if (!keystoreFile) {
    throw new Error(`No UTC keystore found in ${resolvedDir}`);
  }
  // keythereum.importFromFile expects datadir/keystore/ — our mount puts UTC--* directly in resolvedDir.
  const keyobj = JSON.parse(
    fs.readFileSync(path.join(resolvedDir, keystoreFile), "utf8")
  );
  return keythereum.recover(password, keyobj).toString("hex");
}

function getDposSigners() {
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    return [process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")];
  }
  if (
    process.env.VALIDATOR_KEYSTORE_DIR &&
    process.env.VALIDATOR_PASSWORD_FILE
  ) {
    return [
      getPrivateKeyFromKeystore(
        process.env.VALIDATOR_KEYSTORE_DIR,
        process.env.VALIDATOR_PASSWORD_FILE
      ),
    ];
  }
  return [];
}

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 122,
      accounts: {
        mnemonic: "test test test test test test test test test test test fuse",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
        accountsBalance: "1000000000000000000000000",
      },
    },
    dpos_local: {
      url: process.env.DPOS_RPC_URL || "http://127.0.0.1:8545",
      chainId: parseInt(process.env.NETWORK_ID || "0x3a1", 16),
      accounts: getDposSigners(),
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    version: "0.4.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: { timeout: 120000 },
};
