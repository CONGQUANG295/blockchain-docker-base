# Traefik integration (replaces nginx `proxy` service)

Use Traefik for TLS termination and routing instead of the built-in nginx proxy.

## Prerequisites

- Docker Compose 2.20+
- DNS pointing to the host for explorer / stats / visualize domains
- JSON-RPC node reachable (default `host.docker.internal:8545`)

## Quick start

```bash
cd docker-compose

./scripts/prepare-traefik.sh

# Edit domains, ACME email, chain ID, RPC URL
vim envs/traefik.env
vim envs/common-frontend.env

# Minimal: backend + frontend + db + redis + traefik
docker compose -f no-services.traefik.yml config
docker compose -f no-services.traefik.yml up -d --build

# Full stack: + stats, visualizer, sig-provider, user-ops-indexer, nft_media_handler
docker compose -f docker-compose.traefik.yml up -d --build
```

## Files

| File | Purpose |
|------|---------|
| `docker-compose.traefik.yml` | Full stack, no nginx |
| `no-services.traefik.yml` | Minimal stack |
| `services/traefik.yml` | Traefik container |
| `services/backend-local.yml` | Build backend 11.2.1 from source |
| `services/frontend-local.yml` | Build frontend 2.8.1 from `../blockscout-frontend-2.8.1` |
| `traefik/traefik.yml` | Static Traefik config |
| `traefik/dynamic/middlewares.yml` | CORS, rate limit, dashboard auth |
| `traefik/dynamic/blockscout-v11.yml.template` | Explorer routing (mirrors `proxy/explorer.conf.template`) |
| `envs/traefik.env.example` | Domains + ACME + RPC |
| `envs/common-frontend.traefik.env.example` | Frontend public URLs |

## Routing vs nginx proxy

Nginx `proxy/explorer.conf.template`:

- `/api` (not `/api-docs`), `/socket`, `/sitemap.xml`, auth routes → backend `:4000`
- everything else → frontend `:3000`

Nginx `proxy/microservices.conf.template`:

- `:8080` → stats
- `:8081` → visualizer

Traefik uses **separate HTTPS hostnames** for stats and visualizer (see `envs/traefik.env.example`).

Regenerate dynamic config after env changes:

```bash
./scripts/generate-traefik-dynamic.sh
docker compose -f docker-compose.traefik.yml up -d traefik
```

## DPOS / OpenEthereum

In `envs/traefik.env`:

```env
ETHEREUM_JSONRPC_VARIANT=nethermind
BLOCK_TRANSFORMER=clique
ETHEREUM_JSONRPC_HTTP_URL=http://openethereum-rpc:8545/
ETHEREUM_JSONRPC_WS_URL=ws://openethereum-rpc:8545/
```

Ensure OpenEthereum has WebSocket enabled and archive tracing for the explorer.

## Legacy nginx stack

The original compose files are unchanged:

```bash
docker compose up -d              # uses nginx proxy
docker compose -f no-services.yml up -d
```

## Build from repo root

```bash
# From blockchain-docker-base/
docker build -t blockscout-backend:11.2.1 \
  -f resources/blockscout-backend-11.2.1/docker/Dockerfile \
  --build-arg RELEASE_VERSION=11.2.1 \
  --build-arg BLOCKSCOUT_VERSION=11.2.1 \
  resources/blockscout-backend-11.2.1

docker build -t blockscout-frontend:2.8.1 \
  -f resources/blockscout-frontend-2.8.1/Dockerfile \
  resources/blockscout-frontend-2.8.1
```
