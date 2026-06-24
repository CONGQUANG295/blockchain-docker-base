#!/bin/bash
cd "$(dirname '$0')"
echo '{INHERIT: "docs-develop/mkdocs.yml", docs_dir: "docs-develop", site_dir: "docs-release"}' | mkdocs build -f -