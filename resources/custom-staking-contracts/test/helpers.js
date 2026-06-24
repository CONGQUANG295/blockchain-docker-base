const { BN, toBN, toWei } = web3.utils;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bn")(BN))
  .should();

exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.MIN_STAKE = toWei(toBN(100000), "ether");
exports.MIN_DELEGATION = toWei(toBN(10000), "ether");
exports.MAX_DELEGATION_PER_WALLET = toWei(toBN(100000), "ether");
exports.SYSTEM_ADDRESS = "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE";

exports.impersonateSystem = async () => {
  const hre = require("hardhat");
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [exports.SYSTEM_ADDRESS],
  });
  await hre.network.provider.request({
    method: "hardhat_setBalance",
    params: [exports.SYSTEM_ADDRESS, "0x3635C9ADC5DEA00000"],
  });
};

exports.takeSnapshot = () =>
  new Promise((resolve, reject) => {
    web3.currentProvider.send(
      { jsonrpc: "2.0", method: "evm_snapshot", params: [], id: Date.now() },
      (err, res) => (err ? reject(err) : resolve(res.result))
    );
  });

exports.revertSnapshot = (id) =>
  new Promise((resolve, reject) => {
    web3.currentProvider.send(
      { jsonrpc: "2.0", method: "evm_revert", params: [id], id: Date.now() },
      (err, res) => (err ? reject(err) : resolve(res.result))
    );
  });

exports.advanceTime = (seconds) => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: Date.now(),
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
  });
};

exports.advanceBlocks = async (n) => {
  for (let i = 0; i < n; i++) {
    await new Promise((resolve, reject) => {
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "evm_mine", id: Date.now() },
        (err) => (err ? reject(err) : resolve())
      );
    });
  }
};

exports.deployGtbsStack = async (accounts) => {
  const owner = accounts[0];
  const Consensus = artifacts.require("Consensus");
  const ProxyStorage = artifacts.require("ProxyStorage");
  const BlockReward = artifacts.require("BlockReward");
  const Voting = artifacts.require("Voting");
  const StakingVault = artifacts.require("StakingVault");
  const EternalStorageProxy = artifacts.require("EternalStorageProxy");

  const LOCK_SECONDS = 180 * 86400;
  const UNLOCK_PERIOD = 365 * 86400;
  const RELEASE_DELAY = 30 * 86400;
  const UNLOCK_CAP = toWei(toBN(500000), "ether");
  const NET_APY_BPS = 400;

  const consensusImpl = await Consensus.new();
  let proxy = await EternalStorageProxy.new(exports.ZERO_ADDRESS, consensusImpl.address);
  const consensus = await Consensus.at(proxy.address);
  await consensus.initialize(owner);
  await consensus.initializeCustomParams(exports.MIN_DELEGATION, exports.MAX_DELEGATION_PER_WALLET);

  const proxyStorageImpl = await ProxyStorage.new();
  proxy = await EternalStorageProxy.new(exports.ZERO_ADDRESS, proxyStorageImpl.address);
  const proxyStorage = await ProxyStorage.at(proxy.address);
  await proxyStorage.initialize(consensus.address);
  await consensus.setProxyStorage(proxyStorage.address);

  const blockRewardImpl = await BlockReward.new();
  proxy = await EternalStorageProxy.new(proxyStorage.address, blockRewardImpl.address);
  const blockReward = await BlockReward.at(proxy.address);
  await blockReward.initialize(toWei(toBN(300000000), "gwei"), NET_APY_BPS);

  const votingImpl = await Voting.new();
  proxy = await EternalStorageProxy.new(proxyStorage.address, votingImpl.address);
  const voting = await Voting.at(proxy.address);
  await voting.initialize();
  await proxyStorage.initializeAddresses(blockReward.address, voting.address);

  const vault = await StakingVault.new();
  await vault.initialize(
    consensus.address,
    owner,
    LOCK_SECONDS,
    UNLOCK_PERIOD,
    RELEASE_DELAY,
    UNLOCK_CAP,
    1000
  );
  await consensus.setStakingVault(vault.address);

  return { consensus, proxyStorage, blockReward, voting, vault, owner };
};
