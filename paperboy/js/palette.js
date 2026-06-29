// ── Palette ────────────────────────────────────────────────────────────────
// Full-2D Paperboy homage. Same composition as the arcade reference, but a
// fresh "candy dusk" colour scheme (teal subscribers, coral non-subscribers,
// lavender sidewalk, magenta cars) instead of the original yellow/green/grey.
// Each solid pixel-art element gets flat face shades (front / side / top).
export const COL = {
  // Ground
  grass1: '#54bd87', grass2: '#49ac79',          // mowed-lawn stripes
  road:   '#6b6f86', roadLine: '#d9d4e8', curb: '#9a9fb6',
  walk:   '#cdc7dc', walkLine: '#b4abc9',

  // Subscriber house (teal — wants a paper)
  subFront: '#37c8b0', subSide: '#239b89', subTop: '#62e8d4',
  subRoofL: '#2f8f8a', subRoofR: '#236d69',
  // Non-subscriber house (coral)
  nsFront: '#ff7a66', nsSide: '#d65946', nsTop: '#ff9684',
  nsRoofL: '#9c3f3a', nsRoofR: '#7c322e',

  door: '#5a3a2a', winLit: '#fff3c0', winDark: '#33405a',
  mailbox: '#ece8f4', mailDark: '#c3bdd4', mailPost: '#6a4a3a', flag: '#e5484d',
  fence: '#f3eefb', fenceShade: '#cdc7dc',

  // Props
  bush: '#3f9e6f', bushHi: '#56b886',
  sign: '#ece8f4', signPost: '#6a4a3a', signInk: '#c2384a',
  trash: '#b7bcc9', trashTop: '#9aa0b0', trashSide: '#9a9fb6',

  // Car
  carBody: '#ff4d8d', carSide: '#d6356f', carTop: '#ff79a9', carWin: '#2b2b44',

  // Paperboy
  jersey: '#ffd24a', skin: '#ffcf9e', helmet: '#ff5a3c',
  bike: '#3a7bff', bikeDark: '#2a5ad0', wheel: '#23233a',

  paper: '#fff6df', bundle: '#33ddff', bundleDark: '#1ba6c8',
  delivered: '#9affd0', smashGlass: '#fff2a0',
  shadow: 'rgba(20,30,25,0.18)',

  // HUD top status bar
  barBg: '#241f3a', barEdge: '#15122a', barInk: '#ffffff',
  barGood: '#5fe6d0', barWarn: '#ffd24a', barDanger: '#ff5a6a',
  segs: ['#ff5a6a', '#ffd24a', '#5fe6d0', '#7a9bff', '#c98bff'],
};
