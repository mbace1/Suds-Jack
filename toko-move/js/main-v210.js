// Toko Move v2.10 runtime entry. Keep the tested v2.9 map engine intact while
// advancing the public build and exposing the current build to hub/browser QA.
import './main.js?v=11';
export const BUILD_VERSION='2.10';
function stamp(){
  if(window.__tm){window.__tm.version=BUILD_VERSION;return;}
  setTimeout(stamp,50);
}
stamp();
