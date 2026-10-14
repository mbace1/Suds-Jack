#!/bin/bash
# loud.sh file.wav... -> integrated LUFS, LRA, true peak (ebur128 summary)
for f in "$@"; do
  s=$(ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p')
  I=$(echo "$s" | awk '/I:/{print $2; exit}'); L=$(echo "$s" | awk '/LRA:/{print $2; exit}'); P=$(echo "$s" | awk '/Peak:/{print $2; exit}')
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  printf "%-28s I=%6s LUFS  LRA=%5s LU  TP=%6s dBFS  dur=%s\n" "$(basename "$f")" "$I" "$L" "$P" "$d"
done
