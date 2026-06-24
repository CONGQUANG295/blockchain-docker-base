#!/usr/bin/env bash
# Build images locally and optionally push to Docker Hub.
# Reads blockchain-docker-base/images.manifest.json (same source as GitHub Actions).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${ROOT_DIR}/images.manifest.json"
PUSH=false
NAMESPACE=""
BUILD_CHAIN=false
BUILD_EXPLORER=false
BUILD_DAPPS=false
ANY_GROUP=false

usage() {
  echo "Usage: $0 [--chain] [--explorer] [--dapps] [--push] [--namespace DOCKERHUB_USERNAME]"
  echo ""
  echo "Image groups (from images.manifest.json):"
  echo "  --chain     Chain core (openethereum, validator-app, dpos-deployer, ...)"
  echo "  --explorer  Blockscout explorer (backend/frontend v11 + legacy)"
  echo "  --dapps     Other DApps (netstats-dashboard, eth-faucet, docs-poa)"
  echo ""
  echo "  With no group flags, all images are built."
  echo "  Group flags can be combined, e.g. --explorer --dapps"
  echo ""
  echo "  --push       Push images after build (requires docker login)"
  echo "  --namespace  Docker Hub username/org (required with --push)"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --chain) BUILD_CHAIN=true; ANY_GROUP=true ;;
    --explorer) BUILD_EXPLORER=true; ANY_GROUP=true ;;
    --dapps) BUILD_DAPPS=true; ANY_GROUP=true ;;
    --push) PUSH=true ;;
    --namespace) NAMESPACE="$2"; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
  shift
done

if [ "${PUSH}" = true ] && [ -z "${NAMESPACE}" ]; then
  echo "Error: --namespace required with --push" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required" >&2
  exit 1
fi

groups=()
if [ "${ANY_GROUP}" = false ]; then
  groups=(chain explorer dapps)
else
  [ "${BUILD_CHAIN}" = true ] && groups+=(chain)
  [ "${BUILD_EXPLORER}" = true ] && groups+=(explorer)
  [ "${BUILD_DAPPS}" = true ] && groups+=(dapps)
fi

if [ ${#groups[@]} -eq 0 ]; then
  echo "Error: select at least one group (--chain, --explorer, --dapps)" >&2
  exit 1
fi

groups_json="$(printf '%s\n' "${groups[@]}" | jq -R . | jq -s .)"
count="$(jq --argjson groups "${groups_json}" '[.images[] | select(.group as $g | $groups | index($g) != null)] | length' "${MANIFEST}")"

if [ "${count}" -eq 0 ]; then
  echo "No images match groups: ${groups[*]}" >&2
  exit 1
fi

echo "Building ${count} image(s) for groups: ${groups[*]}"

for i in $(seq 0 $((count - 1))); do
  name="$(jq -r --argjson groups "${groups_json}" \
    '[.images[] | select(.group as $g | $groups | index($g) != null)]['"${i}"'].name' "${MANIFEST}")"
  version="$(jq -r --argjson groups "${groups_json}" \
    '[.images[] | select(.group as $g | $groups | index($g) != null)]['"${i}"'].version' "${MANIFEST}")"
  dockerfile="$(jq -r --argjson groups "${groups_json}" \
    '[.images[] | select(.group as $g | $groups | index($g) != null)]['"${i}"'].dockerfile' "${MANIFEST}")"
  context="$(jq -r --argjson groups "${groups_json}" \
    '[.images[] | select(.group as $g | $groups | index($g) != null)]['"${i}"'].context' "${MANIFEST}")"
  local_tag="${name}:${version}"

  if [ "${PUSH}" = true ]; then
    tag="docker.io/${NAMESPACE}/blockchain-dock-${name}:${version}"
  else
    tag="${local_tag}"
  fi

  build_args=()
  while IFS= read -r line; do
    [ -n "${line}" ] && build_args+=(--build-arg "${line}")
  done < <(jq -r --argjson groups "${groups_json}" \
    '[.images[] | select(.group as $g | $groups | index($g) != null)]['"${i}"'].buildArgs // {} | to_entries[] | "\(.key)=\(.value)"' "${MANIFEST}")

  echo "=== Building ${tag} ==="
  docker build -t "${tag}" -f "${ROOT_DIR}/${dockerfile}" "${build_args[@]}" "${ROOT_DIR}/${context}"

  if [ "${PUSH}" = true ]; then
    docker push "${tag}"
  fi
done

echo "Done."
