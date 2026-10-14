#!/bin/bash
# Full render of the clay deer film: frames → film.mp4 → 1 fps contact sheet. Resumable (skips frames on disk).
set -e
cd "$(dirname "$0")/.."
export NODE_PATH=$(npm root -g)
node clay-deer/render.mjs --frames 0-899
node clay-deer/render.mjs --encode
ffmpeg -v error -y -i clay-deer/film.mp4 -vf "fps=1,scale=216:-1,tile=10x4" -frames:v 1 clay-deer/contact-1fps.jpg
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact clay-deer/film.mp4
echo DONE
