# Slay Kallio — Art Request

## Core visual idea

Slay Kallio should use the existing TURF character concepts as the identity base, but reinterpret them as **physical standing cardboard cut-outs in a side-view paper-theatre world**.

Think of the readability and charm of a flat paper-character game such as Paper Mario, but with a rougher Kallio street-art / handmade-diorama treatment rather than copying Nintendo designs. Characters should look like illustrated figures printed onto rounded pieces of card with a **flat bottom edge**, standing upright in a shallow 3D scene.

The important shift is: **TURF supplies the people; Slay Kallio supplies the material language.**

## Key simplification: use the front art

Slay Kallio does **not** need every character rebuilt as a true side-profile sprite.

A major advantage of the cardboard-standee approach is that the large pool of existing **front and front-3/4 TURF concept art can be used directly as the printed face of the standee**.

The character can remain visually front-facing while the whole cardboard piece travels left and right across the level. This is intentional: the player is moving a physical game-piece / theatre cut-out, not watching a realistic human turn and walk in profile.

That means:

- front TURF art is first-class source material, not merely reference
- the default locomotion state can use **one strong standing artwork**
- left/right movement is mostly translation of the whole standee
- subtle tilt, bob, wobble or card flex can provide life without redrawing limbs
- the bottom of the card stays flat and grounded on the floor plane
- mirrored travel does not require a new facing unless a specific action needs one
- side/profile TURF concepts remain useful, but they are optional rather than mandatory

This dramatically reduces the frame burden and lets Slay Kallio preserve much more of the strongest existing TURF art.

## Character construction

Each character is a flat standee:

- the printed face can use front or front-3/4 TURF art
- upper silhouette may follow the character loosely or be a rounded card contour
- **bottom edge is flat**, giving every character the physical logic of a freestanding game piece
- visible card thickness appears on turns, flips, falls and extreme poses
- slightly rough cut edge rather than perfectly sterile vector edges
- optional exposed corrugation / layered card edge on selected close shots
- no realistic 3D body volume; depth comes from the physical card itself
- action-specific replacements may use alternate printed art on the same cardboard form

The result should feel like someone made a very good tabletop game / theatre set from printed cardboard versions of Kallio street characters.

## Camera and world

This is **not TURF isometric**. Slay Kallio is primarily horizontal side-view.

- characters move left/right across the screen
- their printed artwork may continue facing the viewer
- level geometry can have shallow 2.5D depth
- foreground and background can be layered paper/cardboard scenery
- characters remain visibly flat even when the environment has depth
- use parallax, folds, slots, taped seams and layered boards to sell a physical miniature set

## Low-frame animation language

The standee itself is the default animation system. **Do not create conventional walk cycles unless an action genuinely benefits from them.**

Default movement can be:

1. one standing/front artwork
2. translate left/right
3. slight vertical bob
4. a few degrees of forward/back tilt
5. tiny settle/wobble on stops

Only swap the printed artwork for specific expressive actions.

Good candidates for alternate art frames:

- attack anticipation
- attack/contact pose
- recoil / hit reaction
- special ability
- jump extreme if needed
- interaction / pickup
- KO / fall-flat
- major emotional or narrative pose

A practical character can therefore work with roughly **1 default art state + 2–3 attack images + 1 hit image + 1 KO image**, instead of dozens of locomotion frames.

The target is not zero animation; it is **spending new frame art only where the silhouette or gameplay information actually changes**.

## Physical motion tricks

Use the cardboard object itself for most motion:

- whole-card translation and tilt
- tiny vertical bounce during travel
- acceleration/deceleration lean
- stop wobble
- slight card bend / hinge on strong impacts
- a fast left/right flip can briefly expose the thin cardboard edge
- jumps can cant the whole standee forward/back
- impacts can make the standee rock on its flat base
- KO can become a literal fall-flat card motion
- extreme hits may spin the card briefly edge-on before it lands

These motions should be cheap, readable and deliberately theatrical.

## TURF concept reuse

Use the supplied TURF concept pool for:

- faces and character identity
- clothing
- weapons and props
- body type
- attitude
- color relationships
- **complete front/front-3/4 character artwork whenever it already works**

Do **not** inherit TURF's isometric-facing restrictions.

Priority source types in the v0.2 pack:

1. strong front / front-3/4 TURF character concepts — primary standee faces
2. broad TURF roster sheets — rapid character population
3. explicit side/profile concepts — optional alternate poses and actions
4. TURF near-profile attack frames rejected from isometric production — action candidates
5. four-direction turnarounds — useful when a special move truly needs directional art
6. clothing / prop breakdown sheets — for variants and action-specific replacements

## First prototype character

Start with one visually strong TURF front concept and make the smallest possible complete cardboard character:

1. front-art standing standee with rounded sides/top and flat bottom
2. left/right movement using the same artwork
3. movement bob + tilt + stop wobble
4. 2–3 alternate attack art states
5. one hit/recoil art state
6. one KO state that physically falls flat

If that feels alive and readable, the approach is proven. Do **not** add a walk cycle merely because normal character games have one.

## Material target

Characters should read as:

- printed ink / paint on matte card
- slightly fibrous paper texture
- shallow worn edges
- occasional creases, scuffs, pen marks or print misregistration
- subtle real-world shadow cast onto scenery, but no baked sprite shadow
- grounded by their flat physical base against the miniature set

Avoid glossy plastic, clay, plush, toy-figurine or full 3D-character rendering.

## Environment relationship

The world can mix:

- cardboard architecture
- paper posters
- folded street signs
- layered asphalt / pavement sheets
- corrugated walls
- taped repairs
- hand-cut fences
- miniature practical lights

Kallio should still be recognizable through architecture, signage, colors and street details, but everything is filtered through the handmade stage-set language.

## Production rule

Preserve three things above all else:

1. **TURF character identity**
2. **the unmistakable flat-cardboard physicality**
3. **the low-frame economy — do not redraw what physical standee motion can communicate**

If a character starts looking like a normal 3D person, or requires a conventional full walk-cycle just to cross the screen, it has moved away from the target.
