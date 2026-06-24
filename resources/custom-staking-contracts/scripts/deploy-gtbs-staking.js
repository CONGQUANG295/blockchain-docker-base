require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ethers = hre.ethers;
const { assert } = require("chai");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const { INITIAL_VALIDATOR_ADDRESS, INITIAL_SUPPLY_GWEI, DEBUG } = process.env;

const debug = (msg) => {
  if (DEBUG) console.log(msg);
};

function parseBool(value) {
  if (value === undefined || value === null || value === "") return false;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function loadGtbsConfig() {
  const configPath =
    process.env.GTBS_DEPLOY_CONFIG ||
    path.join(__dirname, "../config/gtbs-deploy-config.json");
  if (!fs.existsSync(configPath)) {
    const { execSync } = require("child_process");
    execSync("node scripts/generate-gtbs-config.js", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

async function resolveTxOpts() {
  if (!parseBool(process.env.ENABLE_EIP1559)) {
    return { opts: { gasPrice: 0 }, mode: "zero gas (EIP-1559 disabled in spec)" };
  }
  const eip1559Block = Number(process.env.EIP1559_TRANSITION_BLOCK ?? 0);
  const currentBlock = await ethers.provider.getBlockNumber();
  if (currentBlock < eip1559Block) {
    return {
      opts: { gasPrice: 0 },
      mode: `zero gas (block ${currentBlock} < EIP1559 transition ${eip1559Block})`,
    };
  }
  if (process.env.DEPLOY_GAS_PRICE) {
    return {
      opts: { gasPrice: process.env.DEPLOY_GAS_PRICE },
      mode: `EIP-1559 active, DEPLOY_GAS_PRICE override`,
    };
  }
  return { opts: {}, mode: "EIP-1559 active, network gas price" };
}

async function main() {
  const cfg = loadGtbsConfig();
  const [deployer] = await ethers.getSigners();
  const { opts: deployTxOpts, mode: gasMode } = await resolveTxOpts();

  console.log(`Deploying GTBS custom staking with account: ${deployer.address}`);
  console.log(`Gas mode: ${gasMode}`);

  let initialValidatorAddress = ethers.utils.getAddress(
    INITIAL_VALIDATOR_ADDRESS || ZERO_ADDRESS
  );
  assert.equal(deployer.address, initialValidatorAddress, "Deployer must be validator-1");

  const initialSupply = ethers.utils.parseUnits(INITIAL_SUPPLY_GWEI || "0", "gwei");

  const ConsensusFactory = await ethers.getContractFactory("Consensus");
  const ProxyStorageFactory = await ethers.getContractFactory("ProxyStorage");
  const BlockRewardFactory = await ethers.getContractFactory("BlockReward");
  const VotingFactory = await ethers.getContractFactory("Voting");
  const StakingVaultFactory = await ethers.getContractFactory("StakingVault");
  const EternalStorageProxyFactory = await ethers.getContractFactory("EternalStorageProxy");

  const consensusImpl = await ConsensusFactory.deploy(deployTxOpts);
  await consensusImpl.deployed();
  const consensusProxy = await EternalStorageProxyFactory.deploy(
    ZERO_ADDRESS,
    consensusImpl.address,
    deployTxOpts
  );
  await consensusProxy.deployed();
  const consensus = ConsensusFactory.attach(consensusProxy.address);
  await (await consensus.initialize(initialValidatorAddress, deployTxOpts)).wait();
  await (
    await consensus.initializeCustomParams(
      cfg.minDelegationWei,
      cfg.maxDelegationPerWalletWei,
      deployTxOpts
    )
  ).wait();

  const proxyStorageImpl = await ProxyStorageFactory.deploy(deployTxOpts);
  await proxyStorageImpl.deployed();
  const storageProxy = await EternalStorageProxyFactory.deploy(
    ZERO_ADDRESS,
    proxyStorageImpl.address,
    deployTxOpts
  );
  await storageProxy.deployed();
  const proxyStorage = ProxyStorageFactory.attach(storageProxy.address);
  await (await proxyStorage.initialize(consensus.address, deployTxOpts)).wait();
  await (await consensus.setProxyStorage(proxyStorage.address, deployTxOpts)).wait();

  const blockRewardImpl = await BlockRewardFactory.deploy(deployTxOpts);
  await blockRewardImpl.deployed();
  const blockRewardProxy = await EternalStorageProxyFactory.deploy(
    proxyStorage.address,
    blockRewardImpl.address,
    deployTxOpts
  );
  await blockRewardProxy.deployed();
  const blockReward = BlockRewardFactory.attach(blockRewardProxy.address);
  await (
    await blockReward.initialize(initialSupply, cfg.netApyBps, deployTxOpts)
  ).wait();

  const votingImpl = await VotingFactory.deploy(deployTxOpts);
  await votingImpl.deployed();
  const votingProxy = await EternalStorageProxyFactory.deploy(
    proxyStorage.address,
    votingImpl.address,
    deployTxOpts
  );
  await votingProxy.deployed();
  const voting = VotingFactory.attach(votingProxy.address);
  await (await voting.initialize(deployTxOpts)).wait();

  await (
    await proxyStorage.initializeAddresses(
      blockReward.address,
      voting.address,
      deployTxOpts
    )
  ).wait();

  const stakingVault = await StakingVaultFactory.deploy(deployTxOpts);
  await stakingVault.deployed();
  await (
    await stakingVault.initialize(
      consensus.address,
      deployer.address,
      cfg.delegatorLockSeconds,
      cfg.annualUnlockPeriodSeconds,
      cfg.releaseDelaySeconds,
      cfg.annualUnlockCapWei,
      cfg.unstakeFeeBps,
      deployTxOpts
    )
  ).wait();
  await (await consensus.setStakingVault(stakingVault.address, deployTxOpts)).wait();

  assert.equal(
    stakingVault.address,
    await consensus.stakingVault(),
    "StakingVault not wired to Consensus"
  );

  const addresses = {
    deployer: deployer.address,
    consensusProxy: consensus.address,
    blockRewardProxy: blockReward.address,
    proxyStorageProxy: proxyStorage.address,
    votingProxy: voting.address,
    stakingVault: stakingVault.address,
    initialValidatorAddress,
  };

  const outPath =
    process.env.CONTRACT_ADDRESSES_OUT ||
    path.join(process.cwd(), "contract-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log(`Wrote GTBS contract addresses to ${outPath}`);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
