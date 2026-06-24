require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

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
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")]
        : [],
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
