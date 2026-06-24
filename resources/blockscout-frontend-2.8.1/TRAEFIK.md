# Traefik integration

Blockscout frontend **2.8.1** is designed to run behind Traefik together with
`blockscout-backend-11.2.1/docker-compose`.

## Quick start

```bash
cd ../blockscout-backend-11.2.1/docker-compose

./scripts/prepare-traefik.sh
vim envs/traefik.env
vim envs/common-frontend.env   # or copy from deploy/envs/.env.traefik.example

# Minimal stack (backend + frontend + traefik)
docker compose -f no-services.traefik.yml up -d --build

# Full stack (+ stats, visualizer, microservices)
docker compose -f docker-compose.traefik.yml up -d --build
```

## Build image only

From repo root (`blockchain-docker-base`):

```bash
docker build -t blockscout-frontend:2.8.1 \
  -f resources/blockscout-frontend-2.8.1/Dockerfile \
  resources/blockscout-frontend-2.8.1
```

## Traefik routing

| Path / Host | Service | Port |
|-------------|---------|------|
| `explorer.example.com/api/*` | backend | 4000 |
| `explorer.example.com/*` | frontend | 3000 |
| `stats.example.com` | stats | 8050 |
| `visualize.example.com` | visualizer | 8050 |

Routing config: `../blockscout-backend-11.2.1/docker-compose/traefik/dynamic/blockscout-v11.yml.template`

## Env variables

See `deploy/envs/.env.traefik.example` and Blockscout docs:
https://github.com/blockscout/frontend/blob/main/docs/ENVS.md

Key points for Traefik:

- `NEXT_PUBLIC_API_HOST` = public explorer domain (same as app host)
- `NEXT_PUBLIC_API_PROTOCOL` = `https`
- `NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL` = `wss`
- Stats / visualizer use **separate HTTPS hosts**, not ports 8080/8081
