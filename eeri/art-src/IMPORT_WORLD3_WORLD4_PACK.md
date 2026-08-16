# World 3 + World 4 source-pack import

The owner-approved/generated image binaries are packaged separately as:

`EERI_W3_W4_ART_LIBRARY_PACK.zip`

The zip already contains the final repository-relative subtrees:

- `world-3-library/` — approved Forest Clearing & Digs anchors, connecting earth/root pieces, timber shoring, foreground trunk/root pieces, small site accents and material tiles.
- `world-4-library/` — approved night warehouse/loading-dock backgrounds, concrete/street/drain connecting tissue and small illuminated construction accents.

## Import

From `eeri/art-src/`:

```sh
unzip -o EERI_W3_W4_ART_LIBRARY_PACK.zip -d /tmp/eeri-art-pack
cp -R /tmp/eeri-art-pack/EERI_W3_W4_ART_LIBRARY_PACK/world-3-library/* world-3-library/
cp -R /tmp/eeri-art-pack/EERI_W3_W4_ART_LIBRARY_PACK/world-4-library/* world-4-library/
```

Then review `CATALOG.md` in each library before promoting anything further.

## Rules

These are source-only optional pieces. Do not touch `eeri/assets/**` or `assets/manifest.json` merely because the source pack exists. Keep single-asset files separate; clouds remain their own layer; preserve flat-plane compositing and the established Crafted World material grammar.
