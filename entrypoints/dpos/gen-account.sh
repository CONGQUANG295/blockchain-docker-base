#!/bin/sh
set -euo pipefail

KEYS_PATH="${KEYS_PATH:-/app/keys}"
PASS_FILE="${PASS_FILE:-/app/secrets/node.pwd}"

OE_BIN="${OE_BIN:-/app/openethereum}"
NETWORK_NAME="${NETWORK_NAME:?NETWORK_NAME required}"

mkdir -p "${KEYS_PATH}"
exec "${OE_BIN}" account new --password "${PASS_FILE}" --keystore-path "${KEYS_PATH}"
