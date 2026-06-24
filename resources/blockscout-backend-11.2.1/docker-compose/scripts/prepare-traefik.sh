#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${COMPOSE_DIR}"

if [ ! -f envs/traefik.env ]; then
  cp envs/traefik.env.example envs/traefik.env
  echo "Created envs/traefik.env — edit domains and ACME_EMAIL."
fi

if [ ! -f envs/common-frontend.env ]; then
  cp envs/common-frontend.traefik.env.example envs/common-frontend.env
  echo "Created envs/common-frontend.env from Traefik template."
fi

mkdir -p traefik/letsencrypt
if [ ! -f traefik/letsencrypt/acme.json ]; then
  touch traefik/letsencrypt/acme.json
  chmod 600 traefik/letsencrypt/acme.json
fi

"${SCRIPT_DIR}/generate-traefik-dynamic.sh"

echo "Ready. Run: docker compose -f docker-compose.traefik.yml up -d"
