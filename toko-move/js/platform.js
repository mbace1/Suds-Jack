// Toko Move — WHERE THIS BUILD IS PUBLISHED (v2.64).
//
// One shipping tree, two homes: the arcade (the Suds-Jack site, where the game
// sits among the cabinets) and a store page (itch.io), where it is the whole
// product. tools/package-itch.mjs writes `window.TOKO_PLATFORM = {name, page}`
// into the packaged index.html; nothing else tells the two apart. The arcade
// build declares nothing, so everything here defaults to what it always did.
//
// Two things differ on a store page, both because the game no longer lives at
// its own address: itch.io plays an HTML5 game in a frame served from its CDN,
// so a share line built from `location` would hand a friend a CDN path —
// it links the STORE PAGE instead (or nothing, if the page is not known yet);
// and the test card is a playtest tool for the arcade, not for the public.
const P = (typeof globalThis !== 'undefined' && globalThis.TOKO_PLATFORM) || null;
export const PLATFORM = P?.name || 'arcade';
export const STORE = !!P;
// The link a share line carries. `suffix` is the arcade's query (`?week`);
// a store page has no deep links, so it is dropped there.
export function shareUrl(suffix = '') {
  if (STORE) return P.page || '';
  return location.origin + location.pathname + suffix;
}
