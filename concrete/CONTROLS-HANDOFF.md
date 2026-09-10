# Optional flick controls prototype

Based on current main dc00ee41 and preserved Tiny Hawk v6. Default buttons remain; Controls offers a saved flick-mode toggle. Touch and gamepad use the same pure recognizer. Down loads, release/up pops, diagonal pops kickflip, airborne up grabs. The chase camera recentres in flick mode. Grind remains L/Y/the touch button.

Implemented locally, not merged or published. Browser gate passed the existing skating loop (movement, ollie/trick bank, rail snap, bail/recovery, pause, mobile touch, twelve desktop clips and missing-model fallback), plus actual touch load/cancel/release/landing and switching back to buttons. The emulated controller poll also passed load/release/landing. A physical controller and the user's phone still need feel testing. Shuvits, distinct heelflips and manuals are intentionally outside this first prototype.

Next: physical-phone/controller feel feedback, then extend the trick vocabulary. Exit for this prototype: real touch input produces an ollie and cancellation produces none; default controls and grinding retain their regression evidence.
