#!/usr/bin/env bash
set -euo pipefail

normalize_keystore_dir() {
  local dir="${1:-/app/keys}"
  if compgen -G "${dir}/UTC--*" > /dev/null 2>&1; then
    echo "${dir}"
    return
  fi
  if [ "${dir}" != "/app/keys" ] && compgen -G "/app/keys/UTC--*" > /dev/null 2>&1; then
    echo "/app/keys"
    return
  fi
  echo "${dir}"
}

export VALIDATOR_KEYSTORE_DIR="$(normalize_keystore_dir "${VALIDATOR_KEYSTORE_DIR:-/app/keys}")"
export VALIDATOR_PASSWORD_FILE="${VALIDATOR_PASSWORD_FILE:-/app/secrets/node.pwd}"

if [ "${ENABLE_CUSTOM_STAKING:-false}" = "true" ]; then
  cd /gtbs
  export GTBS_STAKING_ENV="${GTBS_STAKING_ENV:-/gtbs/env/gtbs-staking.env}"
  export DPOS_CONTRACT_ENV="${DPOS_CONTRACT_ENV:-/gtbs/env/dpos.contract.env}"
  export DPOS_CHAIN_ENV="${DPOS_CHAIN_ENV:-/gtbs/env/dpos.chain.env}"
  export CONTRACT_ARTIFACTS_OUT="${CONTRACT_ARTIFACTS_OUT:-/app/genesis}"
  node scripts/generate-gtbs-contract-config.js
  node scripts/generate-gtbs-config.js
  npm run compile
  bash scripts/export-deploy-artifacts.sh
  npx hardhat run scripts/deploy-gtbs-staking.js --network dpos_local "$@"
  node scripts/write-deploy-manifest.js "${CONTRACT_ARTIFACTS_OUT}"
  exit 0
fi

cd /work
exec npx hardhat run scripts/2_deploy_contract.js --network dpos_local "$@"
