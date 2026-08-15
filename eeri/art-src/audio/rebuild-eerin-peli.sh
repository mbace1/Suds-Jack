#!/usr/bin/env sh
set -eu

BASE='eerin_peli_voice_polished_last_50.m4a.b64'
OUT='eerin_peli_voice_polished_last_50.m4a'

cat "${BASE}.part01" "${BASE}.part02" "${BASE}.part03" "${BASE}.part04" "${BASE}.part05" | base64 -d > "$OUT"

printf 'Built %s\n' "$OUT"
printf 'Expected SHA-256: 173a52a57a8e11bbbffa9f9ff35c4f37d92d25995b7db5cd01c40eee36398643\n'
