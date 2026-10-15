#!/bin/bash
# Full render of SOMEBODY DOES THE DISHES (clay): frames → film.mp4 → 1 fps contact sheet. Resumable.
set -e
cd "$(dirname "$0")/.."
export NODE_PATH=$(npm root -g)
node clay-dishes/render.mjs --frames 0-513
node clay-dishes/render.mjs --encode --n 514
ffmpeg -v error -y -i clay-dishes/film.mp4 -vf "fps=1,scale=216:-1,tile=11x2" -frames:v 1 clay-dishes/contact-1fps.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact clay-dishes/film.mp4
echo DONE
