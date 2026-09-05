# Imported models

Drop a `.glb` in here and add a row to `MODELS` at the top of `../index.html`.
Nothing else is needed: the importer drops the model onto `groundHeight()` from
its own measured base, so it cannot float or sink, and `flat: true` re-materials
it into the satin palette so a downloaded asset joins the island instead of
looking like a photograph glued onto a poster.

```js
{ file: 'models/rowboat.glb', at: [-6.2, 7.4], yaw: 0.7, scale: 1,
  flat: true, title: 'Rowboat', author: 'Someone', source: 'example.com',
  licence: 'CC0' },
```

`at` is metres from the chair, in the island's own coordinates — the same ones
`groundHeight()` and `beachness()` speak, so a prop can be placed relative to
the beach rather than by trial and error.

## The licence row is not decoration

Every row states where the model came from and on what terms, for the same
reason the records do: provenance is the expensive thing to reconstruct later,
and 3D assets are the category where it is easiest to get wrong. CC0 needs no
credit and still gets a row. Anything CC-BY **must** be credited where a player
can see it, not only in this file.

Check the licence per asset at download time — on the big marketplaces it
varies model by model, not site by site.

## What the loader will and will not do

- **A missing or broken model never breaks the island.** Each load is
  independent and failure is logged and skipped, so a bad file costs you that
  prop and nothing else.
- **It does not decimate.** A dense photoreal mesh will load and will cost you
  frames on a headset. Texture memory hurts long before triangle count does:
  prefer untextured flat-colour models and let the scene's own lighting work.
- **glTF/GLB only.** No FBX or OBJ — convert first. Draco/meshopt compressed
  files need a decoder vendored alongside, which this project has deliberately
  avoided so far.

## Where these can come from

Almost every curated asset site is unreachable from the build sandbox, so
models have to be handed in rather than fetched. `raw.githubusercontent.com`
is the one exception that works.
