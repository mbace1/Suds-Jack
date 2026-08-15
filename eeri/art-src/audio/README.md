# Eeri audio source

Owner-approved music/vocal seed for **Eerin peli**.

This is the polished second half of the owner's sung theme idea, with playful construction/jungle accompaniment. It is intentionally stored under `art-src/` as source/reference material and is **not loaded by the shipping game**.

## Rebuild the reference M4A

The GitHub connector used to submit this PR cannot upload a local binary directly, so the compact reference copy is stored as five contiguous Base64 parts.

From `eeri/art-src/audio/`:

```sh
./rebuild-eerin-peli.sh
```

This creates:

`eerin_peli_voice_polished_last_50.m4a`

Reference copy properties:

- AAC / M4A
- mono
- 44.1 kHz
- ~10.73 s
- SHA-256: `173a52a57a8e11bbbffa9f9ff35c4f37d92d25995b7db5cd01c40eee36398643`

The higher-quality approved mix remains the source master outside this repository submission.

Do **not** move binary audio into `assets/audio/` without intentionally updating that directory's runtime contract, `assets/manifest.json`, and the dev-pack gate. The current shipping-game procedural-audio rule remains unchanged by this source/reference addition.
