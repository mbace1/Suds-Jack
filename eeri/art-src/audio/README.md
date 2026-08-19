# Eeri audio source

Owner-approved music/vocal seed for **Eerin peli**.

This is the polished second half of the owner's sung theme idea, with playful construction/jungle accompaniment. It is intentionally stored under `art-src/` as source/reference material and is **not loaded by the shipping game**.

## The file

`eerin_peli_voice_polished_last_50.m4a` — AAC / M4A, mono, 44.1 kHz, ~10.73 s,
33,988 bytes, SHA-256 `173a52a57a8e11bbbffa9f9ff35c4f37d92d25995b7db5cd01c40eee36398643`.

It arrived as five contiguous Base64 parts plus a `rebuild-eerin-peli.sh`,
because the GitHub connector that opened the PR could not upload a binary. That
constraint does not apply to the tool that merged it, so the parts were decoded
back to the real file and removed: the checksum above is the decoded result and
matches the one the parts declared, byte for byte. A reference you have to
reassemble before you can hear it is a reference nobody plays, and five text
fragments can drift from each other in a way one file cannot.

The higher-quality approved mix remains the source master outside this repository submission.

Do **not** move binary audio into `assets/audio/` without intentionally updating that directory's runtime contract, `assets/manifest.json`, and the dev-pack gate. The current shipping-game procedural-audio rule remains unchanged by this source/reference addition.
