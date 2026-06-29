#!/usr/bin/env bash
set -euo pipefail

# Avoid interactive Hardhat VS Code extension prompt in CI/non-interactive runs.
export CI="${CI:-true}"

if [ -d flats ]; then
  rm -rf flats
fi

mkdir flats

npx hardhat flatten contracts/vendor/eternal-storage/EternalStorageProxy.sol > flats/EternalStorageProxy_flat.sol
npx hardhat flatten contracts/Consensus.sol > flats/Consensus_flat.sol
npx hardhat flatten contracts/BlockReward.sol > flats/BlockReward_flat.sol
npx hardhat flatten contracts/vendor/ProxyStorage.sol > flats/ProxyStorage_flat.sol
npx hardhat flatten contracts/vendor/Voting.sol > flats/Voting_flat.sol
npx hardhat flatten contracts/StakingVault.sol > flats/StakingVault_flat.sol

echo "Flattened contracts written to flats/"
