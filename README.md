# blockchain-docker-base

Custom Docker images for blockchain-dock. Images are built in **GitHub Actions** and published to **Docker Hub**.

## CI / Docker Hub

| Item | Value |
|------|-------|
| Workflow | [`.github/workflows/build-images.yml`](../.github/workflows/build-images.yml) |
| Manifest | [`images.manifest.json`](./images.manifest.json) |
| Image naming | `docker.io/<username>/blockchain-dock-<name>:<version>` |

### GitHub secrets (repository settings)

- `DOCKERHUB_USERNAME` — Docker Hub username or org
- `DOCKERHUB_TOKEN` — access token from [Docker Hub security settings](https://hub.docker.com/settings/security)

### Deploy

Set `DOCKERHUB_NAMESPACE` in `blockchain-dockerize/.../envs/deploy.env`, then run `./scripts/render-envs.sh`. Image refs resolve automatically, e.g.:

```
youruser/blockchain-dock-openethereum:0.0.1
youruser/blockchain-dock-blockscout-backend:11.2.1
```

## Build locally

All images (same as CI push to main):

```bash
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh
```

Build by group (`group` field in `images.manifest.json`):

```bash
./scripts/build-and-push.sh --chain          # openethereum, validator-app, dpos-deployer, ...
./scripts/build-and-push.sh --explorer       # Blockscout backend/frontend (v11 + legacy)
./scripts/build-and-push.sh --dapps          # netstats-dashboard, eth-faucet, docs-poa
./scripts/build-and-push.sh --explorer --dapps   # combine groups
```

Build and push to Docker Hub:

```bash
docker login
./scripts/build-and-push.sh --push --namespace your-dockerhub-username
./scripts/build-and-push.sh --explorer --push --namespace your-dockerhub-username
```

GitHub Actions `workflow_dispatch` exposes the same three group toggles (`build_chain`, `build_explorer`, `build_dapps`).

## Image catalog

Manifest-driven builds (`images.manifest.json`). Manual equivalents:

### Chain core

```bash
docker build . -t openethereum:0.0.1 -f docker/Dockerfile.openethereum
docker build . -t validator-app:0.0.1 -f docker/Dockerfile.validator-app
docker build . -t dpos-deployer:0.0.1 -f docker/Dockerfile.dpos-deployer
docker build . -t bootnode:0.0.1 -f docker/Dockerfile.bootnode
docker build . -t geth:1.13.8 -f docker/Dockerfile.geth
```

### Blockscout v11 (DPoS default)

```bash
docker build -t blockscout-backend:11.2.1 \
  -f resources/blockscout-backend-11.2.1/docker/Dockerfile \
  --build-arg RELEASE_VERSION=11.2.1 \
  --build-arg BLOCKSCOUT_VERSION=11.2.1 \
  resources/blockscout-backend-11.2.1

docker build -t blockscout-frontend:2.8.1 \
  -f resources/blockscout-frontend-2.8.1/Dockerfile \
  resources/blockscout-frontend-2.8.1
```

### Blockscout legacy (POA)

```bash
docker build . -t blockscout-base:4.1.8 -f docker/Dockerfile.blockscout-base-4.1.8
docker build . -t blockscout-base:5.2.2 -f docker/Dockerfile.blockscout-base-5.2.2
docker build . -t blockscout-frontend:1.29.2 -f docker/Dockerfile.blockscout-frontend
```

### DApps / ops

```bash
docker build . -t netstats-dashboard:0.0.1 -f docker/Dockerfile.netstats-dashboard
docker build . -t netstats-api:0.0.1 -f docker/Dockerfile.netstats-api
docker build . -t eth-faucet:0.0.1 -f docker/Dockerfile.eth-faucet
docker build . -t docs-poa:0.0.1 -f docker/Dockerfile.docs-poa
```

Upstream Blockscout microservices (stats, visualizer) remain on `ghcr.io/blockscout/*` unless overridden in `deploy.env`.
