async function findPendingUnstakes(web3, vault, fromBlock) {
  const events = await vault.getPastEvents("PendingUnstakeInitiated", {
    fromBlock,
    toBlock: "latest",
  });
  const now = Math.floor(Date.now() / 1000);
  const releaseDelay = Number(await vault.methods.releaseDelayPeriod().call());
  const eligible = [];

  for (const ev of events) {
    const { user, validator } = ev.returnValues;
    const key = `${user.toLowerCase()}:${validator.toLowerCase()}`;
    if (eligible.find((e) => e.key === key)) continue;
    const block = await web3.eth.getBlock(ev.blockNumber);
    const releaseAt = Number(block.timestamp) + releaseDelay;
    if (now >= releaseAt) {
      eligible.push({ key, user, validator });
    }
  }
  return eligible;
}

module.exports = { findPendingUnstakes };
