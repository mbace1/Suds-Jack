// The arcade's HUB button, and the service worker.
//
// hub/shell.js is loaded from the SITE root rather than bundled: it belongs to
// the arcade, not to this app, and it navigates on pointerup AND touchend
// because most cabinets preventDefault every touch and kill the synthesised
// click. Both are swallowed — a cabinet must open with or without the arcade
// around it.
import('../hub/shell.js').catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
