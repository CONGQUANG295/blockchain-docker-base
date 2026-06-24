#!/bin/sh
set -euo pipefail

KEYS_PATH="${KEYS_PATH:-/app/genesis/validator-1/keystore}"
PASS_FILE="${PASS_FILE:-/app/genesis/validator-1/node.pwd}"
OE_BIN="${OE_BIN:-/app/openethereum}"

mkdir -p "$KEYS_PATH"
if [ ! -f "$PASS_FILE" ]; then
  openssl rand -base64 12 > "$PASS_FILE"
fi

if [ -z "$(find "$KEYS_PATH" -maxdepth 1 -name 'UTC--*' -print -quit)" ]; then
  "$OE_BIN" account new --password "$PASS_FILE" --keys-path "$KEYS_PATH" >/dev/null
fi

KEYFILE="$(find "$KEYS_PATH" -maxdepth 1 -name 'UTC--*' | head -n 1)"
ADDRESS="$(sed -n 's/.*"address"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$KEYFILE" | head -n 1)"
if [ -z "$ADDRESS" ]; then
  echo "Failed to read validator address from $KEYFILE" >&2
  exit 1
fi

printf '0x%s\n' "$ADDRESS"
