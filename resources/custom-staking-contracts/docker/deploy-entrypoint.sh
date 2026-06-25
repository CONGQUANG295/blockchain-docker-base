#!/usr/bin/env bash
set -euo pipefail

# Host nodes/validator-1/keystore mounts to /app/keys (UTC--* at root, not /app/keys/keystore).
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
  exec npx hardhat run scripts/deploy-gtbs-staking.js --network dpos_local "$@"
fi

cd /work
exec npx hardhat run scripts/2_deploy_contract.js --network dpos_local "$@"
