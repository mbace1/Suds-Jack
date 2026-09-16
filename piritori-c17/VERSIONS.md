# C.17.1 — Mobile WebGL startup recovery

Source merge: dbcc74d98f8f61cb7298123fd2c828c84b737eb2.
Tested source head: 8ba5cedcaf83c6a0036a7a896a2cbd573ff86e06.

Pixel testing exposed a WebGL context-creation failure before gameplay. C.17.1 adds a conservative WebGL2 preflight, two short retries and a visible Retry graphics action while leaving campaign, tactics, assets and character logic unchanged. C.17 remains the gameplay baseline.
