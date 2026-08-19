// The arcade's HOME button, and the service worker.
//
// hub/shell.js is loaded from the site root rather than bundled: it is the
// site's, not this app's, and it navigates on pointerup AND touchend because
// ten of the twelve cabinets preventDefault every touch and kill the
// synthesised click.
import('../hub/shell.js').catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
