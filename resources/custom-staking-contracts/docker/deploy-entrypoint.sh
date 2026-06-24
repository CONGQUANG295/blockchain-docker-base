#!/usr/bin/env bash
set -euo pipefail

if [ "${ENABLE_CUSTOM_STAKING:-false}" = "true" ]; then
  cd /gtbs
  exec npx hardhat run scripts/deploy-gtbs-staking.js --network dpos_local "$@"
fi

cd /work
exec npx hardhat run scripts/2_deploy_contract.js --network dpos_local "$@"
