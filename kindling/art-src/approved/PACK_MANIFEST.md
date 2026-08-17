# Betterment accepted art pack manifest

This handoff contains **16 repo-optimised WebP reference assets** from the accepted Betterment / Kindling art pass.

## Rebuild

Run from the repository root:

```bash
python kindling/art-src/approved/rebuild_pack.py
```

This reconstructs:

`kindling/art-src/approved/BETTERMENT_ACCEPTED_ART_REPO_PACK.zip`

from the committed base64 chunks under `kindling/art-src/approved/pack-parts/`.

## Expected archive

- Size: **116,809 bytes**
- SHA256: `89180b38c34defa6163b089e8a79d03220df73a5bd47903f0e197c63603fcaa4`

Optional verification:

```bash
sha256sum kindling/art-src/approved/BETTERMENT_ACCEPTED_ART_REPO_PACK.zip
```

## Production status

These files are **source/reference sheets and concepts**, not final cut sprites or production-ready 3D meshes. Environment work should be extracted into transparent, reusable layers; character turnaround/T-pose material is guidance for the Meshy → cleanup/topology → rig → animation pipeline.

## Known transfer limitation

One accepted four-layer bonfire camp breakdown render was no longer available as a distinct mounted source file when this handoff started, so it is not present in this archive. The pack contains the rest of the currently recoverable accepted art from this pass.