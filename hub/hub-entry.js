// This file used to carry a runtime CORRECTION: it imported GAMES and then
// overwrote the Toko Move entry's title, tagline, lineage, controls and note
// because the catalogue still described the superseded Mini Metro lane. That is
// two sources for one cabinet, and it drifted exactly as you would expect — the
// patch was still announcing v2.24 two releases later, and hub/games.js itself
// was never fixed, so anything reading the catalogue directly got the wrong
// game. The entry is correct in games.js now and the patch is gone.

import('./hub.js?v=77').then(() => import('./toko-cabinet-dom.js?v=5'));