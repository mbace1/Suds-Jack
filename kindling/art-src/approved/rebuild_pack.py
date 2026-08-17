#!/usr/bin/env python3
"""Rebuild the repo-visible Betterment art ZIP from committed base64 chunks."""
from pathlib import Path
import base64

HERE = Path(__file__).resolve().parent
PARTS = sorted((HERE / "pack-parts").glob("BETTERMENT_ACCEPTED_ART_REPO_PACK.zip.b64.part*"))
if not PARTS:
    raise SystemExit("No pack parts found")
encoded = b"".join(p.read_bytes().strip() for p in PARTS)
out = HERE / "BETTERMENT_ACCEPTED_ART_REPO_PACK.zip"
out.write_bytes(base64.b64decode(encoded))
print(f"wrote {out} ({out.stat().st_size} bytes) from {len(PARTS)} parts")
