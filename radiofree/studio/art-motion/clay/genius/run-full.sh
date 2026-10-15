#!/bin/bash
# Full render of GENIUS (clay): frames → film.mp4 → 1 fps contact sheet. Resumable (skips frames on disk).
set -e
cd "$(dirname "$0")/.."
export NODE_PATH=$(npm root -g)
node clay-genius/render.mjs --frames 0-508
node clay-genius/render.mjs --encode --n 509
ffmpeg -v error -y -i clay-genius/film.mp4 -vf "fps=1,scale=216:-1,tile=11x2" -frames:v 1 clay-genius/contact-1fps.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact clay-genius/film.mp4
echo DONE
