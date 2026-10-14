#!/bin/bash
# Build the 3 s station sign-off once (clay ident + lettering + jingle, 30 fps), then append it to each captioned film.
# usage: append_signoff.sh <signoff_silent.mp4> <film_captions.mp4> <out.mp4> [...pairs]
set -e
cd "$(dirname "$0")"
SO_SRC=$1; shift
SO=渲染/signoff_final.mp4
if [ ! -f $SO ] || [ $SO_SRC -nt $SO ]; then
  (cd subs && ffmpeg -loglevel error -y -i "$SO_SRC" -i ../音频/signoff_m14.wav \
    -vf "fps=30,scale=1080:1920,setsar=1,subtitles=signoff.ass:fontsdir=fonts,fade=t=in:st=0:d=0.2,fade=t=out:st=2.7:d=0.3" \
    -af "afade=t=out:st=2.6:d=0.4" -t 3 -map 0:v -map 1:a -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -ac 2 ../$SO)
  echo "built $SO"
fi
while [ $# -ge 2 ]; do
  ffmpeg -loglevel error -y -i "$1" -i $SO -filter_complex "[0:v]setsar=1[a0];[1:v]setsar=1[b0];[a0][0:a][b0][1:a]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$2"
  echo "ok $2 $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")"
  shift 2
done
