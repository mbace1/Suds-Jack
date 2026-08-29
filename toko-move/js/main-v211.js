// Toko Move v2.11 runtime entry — tested v2.10 map/gameplay plus route-choice guidance.
import './main-v210.js?v=2';
import './route-choice.js?v=1';
export const BUILD_VERSION='2.11';
function stamp(){if(window.__tm){window.__tm.version=BUILD_VERSION;return;}setTimeout(stamp,50);}stamp();