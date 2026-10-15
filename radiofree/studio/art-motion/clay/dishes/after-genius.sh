#!/bin/bash
# Start the Dishes render as soon as the Genius render has finished (one render at a time on this machine).
S=/tmp/claude-0/-home-user-Suds-Jack/83745c96-d2f6-5fb2-9ae6-f4818d9d4e36/scratchpad
until grep -q '^DONE' $S/clay-genius/render.log; do sleep 20; done
$S/clay-dishes/run-full.sh > $S/clay-dishes/render.log 2>&1
