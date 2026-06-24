const {
  deployGtbsStack,
  impersonateSystem,
  takeSnapshot,
  revertSnapshot,
  SYSTEM_ADDRESS,
} = require("./helpers");
const { toBN, toWei } = web3.utils;

const BLOCKS_PER_YEAR = 6307200;

contract("GTBS NET APY", (accounts) => {
  let blockReward;
  let vault;
  let snapshot;
  const validator = accounts[0];
  const delegator = accounts[1];

  beforeEach(async () => {
    snapshot = await takeSnapshot();
    ({ blockReward, vault } = await deployGtbsStack(accounts));
    await impersonateSystem();
    await vault.stake({ from: validator, value: toWei(toBN(100000), "ether") });
    await vault.delegate(validator, {
      from: delegator,
      value: toWei(toBN(100000), "ether"),
    });
  });

  afterEach(async () => {
    await revertSnapshot(snapshot);
  });

  it("emits NET delegator reward without extra validator fee cut", async () => {
    const blockRewardAmount = await blockReward.getBlockRewardAmountPerValidator(
      validator
    );
    const { logs } = await blockReward.reward([validator], [0], {
      from: SYSTEM_ADDRESS,
    }).should.be.fulfilled;

    logs[0].event.should.equal("Rewarded");
    const receivers = logs[0].args.receivers;
    const rewards = logs[0].args.rewards;
    receivers.should.include(delegator);

    const delegatorIndex = receivers.indexOf(delegator);
    const stake = toBN(toWei(toBN(100000), "ether"));
    const expectedDelegator = stake
      .mul(toBN(400))
      .div(toBN(10000))
      .div(toBN(BLOCKS_PER_YEAR));
    rewards[delegatorIndex].should.be.bignumber.equal(expectedDelegator);

    const validatorIndex = receivers.indexOf(validator);
    rewards[validatorIndex].should.be.bignumber.equal(
      blockRewardAmount.sub(expectedDelegator)
    );
  });
});
