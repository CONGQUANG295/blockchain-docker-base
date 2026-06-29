#!/usr/bin/env bash
# Flatten patched contracts and copy Blockscout-ready artifacts to genesis output.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

OUT_DIR="${CONTRACT_ARTIFACTS_OUT:-/app/genesis}"
FLATS_OUT="${OUT_DIR}/flats"
CONFIG_SRC="${GTBS_DEPLOY_CONFIG:-${ROOT}/config/gtbs-deploy-config.json}"

echo "=== GTBS: flatten contracts ==="
npm run flatten

echo "=== GTBS: export artifacts → ${OUT_DIR} ==="
rm -rf "${FLATS_OUT}"
mkdir -p "${FLATS_OUT}"
cp -a "${ROOT}/flats/." "${FLATS_OUT}/"

if [ -f "${CONFIG_SRC}" ]; then
  cp "${CONFIG_SRC}" "${OUT_DIR}/gtbs-deploy-config.json"
  echo "  gtbs-deploy-config.json"
fi

echo "  flats/ ($(find "${FLATS_OUT}" -maxdepth 1 -name '*.sol' | wc -l | tr -d ' ') files)"
