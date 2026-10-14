#!/bin/bash
# Re-render the five papercut films with the v4 light (dynamic shadows, soft far layers) and burn the captions with the station bug.
cd "$(dirname "$0")"
for spec in "doh:配乐_doh_m14.wav:doh_H.ass" "hp:配乐_hp_m14.wav:hp_H.ass" "bdf:配乐_bdf_m14.wav:tiktok_H.ass" "dr:配乐_dr_m14.wav:dr_H.ass" "cw:配乐_cw_m14.wav:cw_H.ass"; do
  IFS=: read film wav ass <<< "$spec"
  echo "== $film $(date +%H:%M:%S)"
  timeout 3000 uv run -q --with playwright==1.56.0 python 代码工程/render.py --film $film --width 1080 --height 1920 --fps 30 --audio 音频/$wav --out 渲染/成片_${film}_L4.mp4 2>&1 | tail -1
  (cd subs && ffmpeg -loglevel error -y -i ../渲染/成片_${film}_L4.mp4 -vf "subtitles=$ass:fontsdir=fonts,fade=t=out:st=37.15:d=0.35" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy ../渲染/${film}_L4_captions.mp4) && echo "ok $film"
done
echo "== done $(date +%H:%M:%S)"
