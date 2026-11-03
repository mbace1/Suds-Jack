#!/bin/bash
# Serve the DEPLOYED Toko Drop 2.0 (origin/gh-pages, never this branch's tree) for the capture scripts here, which all
# load http://127.0.0.1:8731/toko-drop-2/. It imports ../toko/ and ../hub/, so those come too. Nothing is patched:
# the scripts drive the game only through its own debug hooks (window.__toko: capBegin/capFrame, showcase/idle/act,
# advance, introWav). Usage: looks/gl/tokodrop2/tools/serve.sh <empty scratch dir>
set -e; D=${1:?scratch dir}; mkdir -p "$D"
git -C "$(git rev-parse --show-toplevel)" fetch -q origin gh-pages
git -C "$(git rev-parse --show-toplevel)" archive origin/gh-pages toko-drop-2 toko hub | tar -x -C "$D"
cd "$D" && exec python3 -m http.server 8731 --bind 127.0.0.1
