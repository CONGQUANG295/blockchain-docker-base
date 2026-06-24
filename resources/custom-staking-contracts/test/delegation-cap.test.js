const {
  deployGtbsStack,
  takeSnapshot,
  revertSnapshot,
  MIN_DELEGATION,
} = require("./helpers");
const { toBN, toWei } = web3.utils;

contract("GTBS delegation caps", (accounts) => {
  let vault;
  let consensus;
  let snapshot;
  const validator = accounts[0];
  const delegator = accounts[1];
  const delegator2 = accounts[2];

  beforeEach(async () => {
    snapshot = await takeSnapshot();
    ({ vault, consensus } = await deployGtbsStack(accounts));
    await vault.stake({ from: validator, value: toWei(toBN(100000), "ether") });
  });

  afterEach(async () => {
    await revertSnapshot(snapshot);
  });

  it("rejects delegation below minimum", async () => {
    const low = toWei(toBN(5000), "ether");
    await vault.delegate(validator, { from: delegator, value: low }).should.be.rejected;
  });

  it("enforces 1:1 delegation cap vs self-stake", async () => {
    const cap = toWei(toBN(100000), "ether");
    const extra = toWei(toBN(1), "ether");
    await vault.delegate(validator, { from: delegator, value: cap }).should.be.fulfilled;
    await vault.delegate(validator, { from: delegator2, value: extra }).should.be.rejected;
  });

  it("enforces max delegation per wallet across validators", async () => {
    const validator2 = accounts[3];
    await vault.stake({ from: validator2, value: toWei(toBN(100000), "ether") });
    const ninetyK = toWei(toBN(90000), "ether");
    const twentyK = toWei(toBN(20000), "ether");
    await vault.delegate(validator, { from: delegator, value: ninetyK }).should.be.fulfilled;
    await vault.delegate(validator2, { from: delegator, value: twentyK }).should.be.rejected;
  });

  it("blocks direct consensus stake from EOA", async () => {
    await consensus.stake({ from: delegator, value: MIN_DELEGATION }).should.be.rejected;
  });
});
