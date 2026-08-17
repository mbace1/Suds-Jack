# EERI World 3/4 approved art — Claude Code handoff

This directory exists because ChatGPT `sandbox:/mnt/data/...` attachments are not visible to Claude Code / GitHub PR sessions.

## Repo-visible binary

`EERI_W3_W4_CLAUDE_VISIBLE_PACK.zip`

This is a repository-visible, size-optimised copy of the approved World 3 / World 4 source-art pack. It contains the World 3 and World 4 library subtrees, catalogs, READMEs and the approved reference PNGs.

The images were downscaled/quantised only to make the binary handoff practical through the connected GitHub writer. Treat them as approved **source/reference art** and preserve their craft language, composition and categories. Do not silently promote them into production `eeri/assets/**`.

## Claude Code action

1. Unpack the zip.
2. Review the included `world-3-library/CATALOG.md` and `world-4-library/CATALOG.md`.
3. Copy/import the approved pieces into the corresponding `eeri/art-src/world-3-library/` and `eeri/art-src/world-4-library/` source libraries, resolving duplicates deliberately.
4. Keep the existing rules: crafted handmade material language, flat-plane gameplay readability, and source-library isolation from the production manifest.
5. Some hero/deeper pieces are intentionally retained even when the current camera may require cropping or recomposition.

The earlier full-resolution ChatGPT pack remains the master handoff, but this repo-visible copy exists specifically so Claude Code can actually inspect the art without access to the ChatGPT sandbox.