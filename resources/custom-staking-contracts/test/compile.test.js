const { assert } = require("chai");

describe("compile", () => {
  it("loads GTBS contract artifacts", async () => {
    const names = ["Consensus", "BlockReward", "StakingVault", "ProxyStorage", "Voting"];
    for (const name of names) {
      const artifact = artifacts.require(name + ".sol");
      assert.ok(artifact.bytecode, `${name} bytecode missing`);
    }
  });
});
