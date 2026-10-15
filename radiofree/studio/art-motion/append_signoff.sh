#!/bin/bash
# Append the station sign-off (3.0 s, lettering and jingle already burned in) to captioned films.
# usage: append_signoff.sh <signoff.mp4> <film.mp4> <out.mp4> [<film.mp4> <out.mp4> ...]
#   papercut films take 渲染/signoff_paper.mp4 (scenes/so_ident.js); clay films take the clay ident.
set -e
SO=$1; shift
while [ $# -ge 2 ]; do
  ffmpeg -loglevel error -y -i "$1" -i "$SO" -filter_complex "[0:v]setsar=1,fps=30[a0];[1:v]setsar=1,fps=30[b0];[0:a]aresample=48000[a1];[1:a]aresample=48000[b1];[a0][a1][b0][b1]concat=n=2:v=1:a=1[v][ac];[ac]alimiter=limit=0.84:attack=2:release=60:level=false[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$2"
  echo "ok $2 $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")"
  shift 2
done
