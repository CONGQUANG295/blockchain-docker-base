#!/bin/sh
./geth --datadir=data -snapshot=false --gcmode=archive --http.vhosts=* --config=config.toml --allow-insecure-unlock --cache=1024