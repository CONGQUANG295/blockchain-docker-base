const {
  deployGtbsStack,
  impersonateSystem,
  takeSnapshot,
  revertSnapshot,
  SYSTEM_ADDRESS,
} = require("./helpers");
const { toBN, toWei } = web3.utils;

contract("GTBS supply cap", (accounts) => {
  let blockReward;
  let vault;
  let snapshot;
  const validator = accounts[0];

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await revertSnapshot(snapshot);
  });

  it("rejects initialize when supply >= MAX_SUPPLY", async () => {
    const owner = accounts[0];
    const BlockReward = artifacts.require("BlockReward");
    const Consensus = artifacts.require("Consensus");
    const ProxyStorage = artifacts.require("ProxyStorage");
    const EternalStorageProxy = artifacts.require("EternalStorageProxy");
    const ZERO = "0x0000000000000000000000000000000000000000";

    const consensusImpl = await Consensus.new();
    let proxy = await EternalStorageProxy.new(ZERO, consensusImpl.address);
    const consensus = await Consensus.at(proxy.address);
    await consensus.initialize(owner);

    const proxyStorageImpl = await ProxyStorage.new();
    proxy = await EternalStorageProxy.new(ZERO, proxyStorageImpl.address);
    const proxyStorage = await ProxyStorage.at(proxy.address);
    await proxyStorage.initialize(consensus.address);
    await consensus.setProxyStorage(proxyStorage.address);

    const blockRewardImpl = await BlockReward.new();
    proxy = await EternalStorageProxy.new(proxyStorage.address, blockRewardImpl.address);
    blockReward = await BlockReward.at(proxy.address);
    const maxSupply = await blockRewardImpl.getMaxSupply();

    await blockReward.initialize(maxSupply, 400).should.be.rejected;
  });

  it("stops minting at MAX_SUPPLY", async () => {
    const BlockReward = artifacts.require("BlockReward");
    const impl = await BlockReward.new();
    const maxSupply = await impl.getMaxSupply();
    const nearCap = maxSupply.sub(toBN(1000));

    ({ blockReward, vault } = await deployGtbsStack(accounts, {
      initialSupply: nearCap,
    }));
    await impersonateSystem();
    await vault.stake({ from: validator, value: toWei(toBN(100000), "ether") });

    const supplyBefore = await blockReward.getTotalSupply();
    await blockReward.reward([validator], [0], { from: SYSTEM_ADDRESS });
    const supplyAfter = await blockReward.getTotalSupply();

    supplyAfter.lte(maxSupply).should.be.true;
    supplyAfter.gte(supplyBefore).should.be.true;
    (await blockReward.getRemainingMiningBudget()).lte(toBN(1000)).should.be.true;
  });

  it("setNetApyBps(0) yields zero reward", async () => {
    ({ blockReward, vault } = await deployGtbsStack(accounts));
    await impersonateSystem();
    await vault.stake({ from: validator, value: toWei(toBN(100000), "ether") });
    await blockReward.setNetApyBps(0);
    await web3.currentProvider.send(
      { jsonrpc: "2.0", method: "evm_mine", id: Date.now() },
      () => {}
    );

    const amount = await blockReward.getBlockRewardAmountPerValidator(validator);
    amount.should.be.bignumber.equal(toBN(0));

    const supplyBefore = await blockReward.getTotalSupply();
    await blockReward.reward([validator], [0], { from: SYSTEM_ADDRESS });
    const supplyAfter = await blockReward.getTotalSupply();
    supplyAfter.should.be.bignumber.equal(supplyBefore);
  });

  it("getBlocksPerYear matches patched constant", async () => {
    ({ blockReward } = await deployGtbsStack(accounts));
    const BlockReward = artifacts.require("BlockReward");
    const impl = await BlockReward.new();
    const expected = await impl.getBlocksPerYear();
    (await blockReward.getBlocksPerYear()).should.be.bignumber.equal(expected);
  });
});
