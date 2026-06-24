const { deployGtbsStack, advanceTime, takeSnapshot, revertSnapshot, MIN_DELEGATION } = require("./helpers");
const { toBN, toWei } = web3.utils;

contract("GTBS owner config", (accounts) => {
  let vault;
  let consensus;
  let blockReward;
  let snapshot;
  const owner = accounts[0];
  const validator = accounts[0];
  const delegator = accounts[1];

  beforeEach(async () => {
    snapshot = await takeSnapshot();
    ({ vault, consensus, blockReward } = await deployGtbsStack(accounts));
    await vault.stake({ from: validator, value: toWei(toBN(200000), "ether") });
    await vault.delegate(validator, { from: delegator, value: MIN_DELEGATION });
  });

  afterEach(async () => {
    await revertSnapshot(snapshot);
  });

  it("reverts out-of-bounds owner setters", async () => {
    await vault.setUnstakeFeeBps(2500, { from: owner }).should.be.rejected;
    await consensus.setMinDelegation(toWei(toBN(1), "ether"), { from: owner }).should.be.rejected;
    await blockReward.setNetApyBps(50, { from: owner }).should.be.rejected;
  });

  it("keeps pending unstake escrow at 90% after owner raises fee", async () => {
    await advanceTime(180 * 86400 + 1);
    await vault.requestUnstake(validator, MIN_DELEGATION, { from: delegator }).should.be.fulfilled;
    await vault.setUnstakeFeeBps(500, { from: owner }).should.be.fulfilled;
    await advanceTime(30 * 86400 + 1);
    const balBefore = toBN(await web3.eth.getBalance(delegator));
    await vault.completeUnstake(delegator, validator).should.be.fulfilled;
    const received = toBN(await web3.eth.getBalance(delegator)).sub(balBefore);
    const expected = toBN(MIN_DELEGATION).mul(toBN(90)).div(toBN(100));
    received.should.be.bignumber.equal(expected);
  });
});
