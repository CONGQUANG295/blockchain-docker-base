SHELL := /bin/bash
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
SCRIPT := $(ROOT)/scripts/build-and-push.sh

DOCKERHUB_NAMESPACE ?=

.PHONY: help build build-chain build-explorer build-dapps
.PHONY: push push-chain push-explorer push-dapps login

help: ## Danh sách target build
	@grep -E '^[a-zA-Z0-9_.-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build tất cả images
	$(SCRIPT)

build-chain: ## Build nhóm chain (openethereum, deployer, …)
	$(SCRIPT) --chain

build-explorer: ## Build Blockscout v11 + legacy
	$(SCRIPT) --explorer

build-dapps: ## Build netstats, faucet, docs
	$(SCRIPT) --dapps

push: ## Build + push tất cả images (cần DOCKERHUB_NAMESPACE + docker login)
	@test -n "$(DOCKERHUB_NAMESPACE)" || (echo "Usage: make push DOCKERHUB_NAMESPACE=youruser" && exit 1)
	$(SCRIPT) --push --namespace "$(DOCKERHUB_NAMESPACE)"

push-chain: ## Push chỉ nhóm chain
	@test -n "$(DOCKERHUB_NAMESPACE)" || (echo "Usage: make push-chain DOCKERHUB_NAMESPACE=youruser" && exit 1)
	$(SCRIPT) --chain --push --namespace "$(DOCKERHUB_NAMESPACE)"

push-explorer: ## Push chỉ nhóm explorer
	@test -n "$(DOCKERHUB_NAMESPACE)" || (echo "Usage: make push-explorer DOCKERHUB_NAMESPACE=youruser" && exit 1)
	$(SCRIPT) --explorer --push --namespace "$(DOCKERHUB_NAMESPACE)"

push-dapps: ## Push chỉ nhóm dapps
	@test -n "$(DOCKERHUB_NAMESPACE)" || (echo "Usage: make push-dapps DOCKERHUB_NAMESPACE=youruser" && exit 1)
	$(SCRIPT) --dapps --push --namespace "$(DOCKERHUB_NAMESPACE)"

login: ## docker login (interactive)
	docker login
