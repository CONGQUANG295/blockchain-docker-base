#!/usr/bin/env bash
# Build images locally and optionally push to Docker Hub.
# Reads blockchain-docker-base/images.manifest.json (same source as GitHub Actions).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${ROOT_DIR}/images.manifest.json"
PUSH=false
NAMESPACE=""

usage() {
  echo "Usage: $0 [--push] [--namespace DOCKERHUB_USERNAME]"
  echo "  --push       Push images after build (requires docker login)"
  echo "  --namespace  Docker Hub username/org (required with --push)"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
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

count="$(jq '.images | length' "${MANIFEST}")"
for i in $(seq 0 $((count - 1))); do
  name="$(jq -r ".images[$i].name" "${MANIFEST}")"
  version="$(jq -r ".images[$i].version" "${MANIFEST}")"
  dockerfile="$(jq -r ".images[$i].dockerfile" "${MANIFEST}")"
  context="$(jq -r ".images[$i].context" "${MANIFEST}")"
  local_tag="${name}:${version}"

  if [ "${PUSH}" = true ]; then
    tag="docker.io/${NAMESPACE}/blockchain-dock-${name}:${version}"
  else
    tag="${local_tag}"
  fi

  build_args=()
  while IFS= read -r line; do
    [ -n "${line}" ] && build_args+=(--build-arg "${line}")
  done < <(jq -r ".images[$i].buildArgs // {} | to_entries[] | \"\(.key)=\(.value)\"" "${MANIFEST}")

  echo "=== Building ${tag} ==="
  docker build -t "${tag}" -f "${ROOT_DIR}/${dockerfile}" "${build_args[@]}" "${ROOT_DIR}/${context}"

  if [ "${PUSH}" = true ]; then
    docker push "${tag}"
  fi
done

echo "Done."
