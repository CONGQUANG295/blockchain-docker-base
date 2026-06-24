const { deployGtbsStack, advanceTime, takeSnapshot, revertSnapshot } = require("./helpers");
const { toBN, toWei } = web3.utils;

contract("GTBS unlock quota", (accounts) => {
  let vault;
  let snapshot;
  const validator = accounts[0];

  beforeEach(async () => {
    snapshot = await takeSnapshot();
    ({ vault } = await deployGtbsStack(accounts));
    await vault.stake({ from: validator, value: toWei(toBN(600000), "ether") });
  });

  afterEach(async () => {
    await revertSnapshot(snapshot);
  });

  it("allows 500k validator withdraw in one year period", async () => {
    const amount = toWei(toBN(500000), "ether");
    await vault.withdrawValidator(amount, { from: validator }).should.be.fulfilled;
  });

  it("rejects withdraw over annual cap in same period", async () => {
    const cap = toWei(toBN(500000), "ether");
    const extra = toWei(toBN(1), "ether");
    await vault.withdrawValidator(cap, { from: validator }).should.be.fulfilled;
    await vault.withdrawValidator(extra, { from: validator }).should.be.rejected;
  });

  it("resets quota after annual unlock period", async () => {
    const partial = toWei(toBN(250000), "ether");
    await vault.withdrawValidator(partial, { from: validator }).should.be.fulfilled;
    await advanceTime(365 * 86400 + 1);
    await vault.withdrawValidator(partial, { from: validator }).should.be.fulfilled;
  });
});
