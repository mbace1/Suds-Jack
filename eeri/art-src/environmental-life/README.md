# Eeri environmental life pack

Source-only dressing for making existing rooms feel inhabited without changing gameplay, collision, reach, checkpoints or level logic.

The rule is **quiet life, not spectacle**. A room may get 2–4 small motions from this pack; none may look collectible, dangerous or interactive.

Included families:
- tape / ribbon flutter
- hanging sign wobble
- loose paper drift
- beacon glow sweep
- grass/felt tuft breathing
- cable sway
- pipe steam puff
- water drip
- perched bird hop/look
- distant crane-hook sway

`life-spec.js` is the placement and timing contract. `life-sprites.svg` is a reusable flat source sheet. `life-lab.html` previews the motion language without loading Eeri.

## Placement rules

1. Keep motion away from jump lips, machine controls and collectible silhouettes.
2. Max 4 live actors in the camera at once; max 1 high-motion actor.
3. Ambient actors never block Eeri and never imply a route.
4. Reduced-motion mode freezes sway/flutter and keeps only low-frequency opacity/lamp pulses.
5. World 1 should favour paper, felt, tape and bird life. Pipeworks may add steam/drips/cables.

## Promotion

Agents can copy a recipe into a room dressing pass or convert one SVG symbol into a production prop through the existing asset seam. Do not import this folder from shipping code wholesale.
