require("solidity-coverage");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const {
  WALLET_PROVIDER_METHOD,
  CREDENTIALS_ADDRESS,
  CREDENTIALS_KEYSTORE,
  CREDENTIALS_PASSWORD,
  MNEMONIC,
  PRIVATE_KEY,
} = process.env;

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
    fuse: {
      url: "https://rpc.fuse.io",
      chainId: 122,
      accounts: getSigners(),
    },
    spark: {
      url: "https://rpc.fusespark.io",
      chainId: 123,
      accounts: getSigners(),
    },
    devnet: {
      url: "http://34.38.118.140:8545",
      chainId: 123,
      accounts: getSigners(),
      allowUnlimitedContractSize: true,
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
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  etherscan: {
    apiKey: {
      spark: "abc",
      fuse: "abc",
    },
    customChains: [
      {
        network: "spark",
        chainId: 123,
        urls: {
          apiURL: "https://explorer.fusespark.io/api/",
          browserURL: "https://explorer.fusespark.io",
        },
      },
      {
        network: "fuse",
        chainId: 122,
        urls: {
          apiURL: "https://explorer.fuse.io/api/",
          browserURL: "https://explorer.fuse.io",
        },
      },
    ],
  },
};
function getSigners() {
  let signers = [];
  if (WALLET_PROVIDER_METHOD === "keystore") {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const keythereum = require("keythereum");

    const keystore_dir = path.join(os.homedir(), CREDENTIALS_KEYSTORE);
    const password_dir = path.join(os.homedir(), CREDENTIALS_PASSWORD);
    const password = fs.readFileSync(password_dir, "utf8");
    const keyobj = keythereum.importFromFile(CREDENTIALS_ADDRESS, keystore_dir);
    const privateKey = keythereum.recover(password, keyobj);

    signers.push(privateKey.toString("hex"));
  } else if (WALLET_PROVIDER_METHOD === "mnemonic") {
    const wallet = Wallet.fromMnemonic(MNEMONIC);
    const privateKey = wallet.getPrivateKeyString();
    signers.push(privateKey);
  } else if (WALLET_PROVIDER_METHOD === "privateKey") {
    signers.push(PRIVATE_KEY);
  }
  return signers;
}

function resolveKeystoreDir(configuredDir) {
  const fs = require("fs");
  const path = require("path");
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
  const fs = require("fs");
  const path = require("path");
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
  return getSigners();
}
