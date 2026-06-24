#!/bin/sh
set -euo pipefail

CONFIG_PATH="${OE_CONFIG_PATH:-/app/config/config.toml}"
exec /app/openethereum --config "$CONFIG_PATH"
