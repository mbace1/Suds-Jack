// The arcade's HUB button, and the service worker.
//
// hub/shell.js is the SITE's, loaded from the site root rather than vendored —
// a vendored copy drifts, and this one navigates on pointerup AND touchend
// because most cabinets preventDefault every touch and kill the synthesised
// click.
//
// It is imported on `load` rather than from a tag in the page because React
// owns the whole document in this app and removes any body child it did not
// render itself. Both calls are swallowed: a cabinet has to open with or
// without the arcade around it.
addEventListener('load', () => { import('../hub/shell.js?v=17').catch(() => {}); });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
