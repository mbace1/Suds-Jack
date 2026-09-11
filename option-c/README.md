# Option C — first principles

Owner direction: start a fresh playable Dream Loop 3D test inspired by TURF.
This supersedes the matched 3v3 prerequisite for this experiment. No Piritori
campaign integration, asset migration or mechanical parity claim in this pass.

Dream Loop source: https://github.com/achimala/dream-loop (Pro workflow).
Target, live captures and independent critiques stay in .dream-loop/.
The runtime uses actual geometry; the target image is never a game backdrop.

## Run and controls

Serve this directory with an HTTP server and open index.html. Current workspace
preview is http://127.0.0.1:8766/option-c/ on this PC. Click/tap a crew card or
figure, then a highlighted tile. Attack buttons show valid targets and damage.
End Turn resolves opponents. Drag rotates; wheel or +/- zooms. Win or lose,
then Play Again restarts. The separate Option C cabinet launches this test directly. Publication status is recorded in the release notes.

## Evidence

test.cjs drives real mouse and touch input through movement, combat, victory,
defeat and restart; it reads state but cannot mutate it through the debug API.
The first battle is intentionally forgiving: hostile attacks deal one damage.
Ranged player hits deal two, adjacent melee three; adjacent cover reduces damage.
These are experimental rules, not a claim of Piritori/TURF parity.

Independent visual judges scored 3.5, 4.0, 4.5 out of 10. The final judge reported
stalled target convergence after the major material/model revision. Graphics
are usable for a first trial; the generated target has NOT been matched.
Physical phone performance and gamepad input are not verified.

## Asset provenance

assets/training-figure.json: authored in Blender 5.2 by model.py. Anonymous
training geometry; named parts permit subsequent replacement and animation.
assets/concrete.webp: optimized WebP derivative of the generated concrete PNG, encoded at quality 88. Source generation: built-in image generation, not Meshy. Prompt:

"A seamless tileable physically based material albedo texture of aged dark gray
concrete, damp industrial pavement, fine aggregate, irregular dark damp stains,
subtle worn patches, tiny surface cracks. Orthographic perfectly flat surface
scan, uniform diffuse neutral illumination, no perspective, no cast shadows,
no light reflections baked into it, no objects, no grid or tile seams, no text,
no borders. Entire square is the single continuous concrete surface. Realistic
rich micro-detail for a 3D game texture, mostly medium charcoal slate gray,
not black."

Three.js and Reflector: MIT, mrdoob/three.js r185, license in vendor/LICENSE.three.
Dream Loop: https://github.com/achimala/dream-loop — used published Pro workflow.
