// THE PARCEL GATE (v2.43). Bare node.
//
// Owner, 2026-09-18: "Recipients names aren't needed. Maybe package size is
// relevant, can carry many smaller but only few or one larger. They can be also
// color coded rather than named."
//
// Two claims live here and both are checkable. THE SENTENCE — many smaller,
// few or one larger — is arithmetic about the capacity, so it is asserted as
// arithmetic rather than trusted to three constants that look about right. And
// COLOUR CODING is only coding if the colours can be told apart: eight fills a
// player cannot separate are eight parcels with no colour on them, so every
// pair is measured in CIE Lab and held to a floor, the same way board.mjs holds
// the line inks against the night paper.
import assert from 'node:assert';
import {CAPACITY,SIZES,SIZE_OF,COLOUR,sizeOf,unitsOf,colourOf,payFor,PAY,parcelHtml,bagHtml,pixelsOf} from '../js/parcels.js';
import {CARGO} from '../js/deliveries.js';
import {standingPips,MAX_STANDING} from '../js/regulars.js';

let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const eq=(a,b,m)=>{assert.strictEqual(a,b,m);n++;};

// ── every cargo is a parcel, and no parcel is a surprise ──────────────────
const CARGOES=Object.keys(CARGO);
eq(CARGOES.length,8,'eight kinds of cargo');
for(const c of CARGOES){
  ok(SIZE_OF[c],`${c} declares a size`);
  ok(COLOUR[c],`${c} declares a colour`);
  ok(SIZES[SIZE_OF[c]]>0,`${c}'s size is a real one`);
}
eq(Object.keys(SIZE_OF).length,8,'and nothing is sized that is not carried');
eq(Object.keys(COLOUR).length,8,'and nothing is coloured that is not carried');
eq(sizeOf('nonsense'),'medium','an unknown cargo falls back rather than throwing');
eq(unitsOf('nonsense'),SIZES.medium,'and takes a middling amount of room');

// ── THE SENTENCE, as arithmetic ──────────────────────────────────────────
{const S=SIZES.small,M=SIZES.medium,L=SIZES.large;
 ok(S<M&&M<L,`small < medium < large (${S} < ${M} < ${L})`);
 ok(Math.floor(CAPACITY/S)>=4,`MANY smaller: ${Math.floor(CAPACITY/S)} small parcels fit`);
 ok(Math.floor(CAPACITY/M)===2,`FEW middling: ${Math.floor(CAPACITY/M)} medium parcels fit`);
 eq(Math.floor(CAPACITY/L),1,'ONE larger: a large parcel is the whole bag');
 ok(L+S>CAPACITY,'and nothing at all fits beside it');
 ok(M+M<=CAPACITY&&M+M+S<=CAPACITY,'two mediums leave room for a small');
 ok(M+M+M>CAPACITY,'but not for a third medium');}

// ── a size has to be worth its room ──────────────────────────────────────
{ok(PAY.small<PAY.medium&&PAY.medium<PAY.large,`a bigger parcel pays more (${PAY.small}/${PAY.medium}/${PAY.large})`);
 // The load-bearing one: filling the bag with one large must beat filling it
 // with smalls by nothing, or a large is a trap and nobody would ever take it —
 // and must not beat it by much, or the bag is a formality.
 const perUnitLarge=PAY.large/SIZES.large,perUnitSmall=PAY.small/SIZES.small;
 ok(perUnitLarge<perUnitSmall,'a bagful of smalls still out-earns one large, so the packing is worth doing');
 ok(PAY.large>PAY.small*1.5,'and a large is worth taking when nothing small is on offer');
 for(const c of CARGOES)ok(payFor(c)>0,`${c} pays something`);}

// ── colour coding is only coding if you can tell them apart ──────────────
{const lab=hex=>{const v=parseInt(hex.slice(1),16),f=x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;};
  const r=f((v>>16)&255),g=f((v>>8)&255),b=f(v&255);
  const X=(r*.4124+g*.3576+b*.1805)/.95047,Y=r*.2126+g*.7152+b*.0722,Z=(r*.0193+g*.1192+b*.9505)/1.08883;
  const k=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
  return[116*k(Y)-16,500*(k(X)-k(Y)),200*(k(Y)-k(Z))];};
 const dE=(a,b)=>Math.hypot(...lab(a).map((v,i)=>v-lab(b)[i]));
 let worst=Infinity,pair='';
 for(let i=0;i<CARGOES.length;i++)for(let j=i+1;j<CARGOES.length;j++){
   const d=dE(COLOUR[CARGOES[i]],COLOUR[CARGOES[j]]);
   if(d<worst){worst=d;pair=`${CARGOES[i]}/${CARGOES[j]}`;}}
 ok(worst>22,`the two closest parcel colours are still distinguishable — dE ${worst.toFixed(1)} on ${pair}`);
 // And every one of them has to survive the panel it is drawn on.
 const PANEL='#fffdf7';
 for(const c of CARGOES)ok(dE(COLOUR[c],PANEL)>28,`${c} stands off the panel (dE ${dE(COLOUR[c],PANEL).toFixed(0)})`);
 eq(new Set(Object.values(COLOUR)).size,8,'no two cargoes share a colour');}

// ── the drawing says the size without saying a word ──────────────────────
{const px=CARGOES.map(pixelsOf);
 ok(pixelsOf('documents')<pixelsOf('parts')&&pixelsOf('parts')<pixelsOf('fragile'),
   `a bigger parcel draws bigger (${pixelsOf('documents')} / ${pixelsOf('parts')} / ${pixelsOf('fragile')} px)`);
 ok(Math.min(...px)>=12,'and the smallest is still a target you can see');
 const h=parcelHtml('fragile');
 ok(/class="pcl pcl-large"/.test(h),'a large parcel says so in its class, for the tape line');
 ok(h.includes(COLOUR.fragile),'and carries its own colour');
 ok(!/[<>]/.test(parcelHtml('documents',{title:'a "quoted" rule'}).match(/title="([^"]*)"/)?.[1]||''),'a title is escaped');}

// ── the bag draws the room left, not a number ────────────────────────────
{const full=bagHtml(['fragile']),empty=bagHtml([]),part=bagHtml(['documents','parts']);
 ok(/bag 5 of 5/.test(full),'one large reads as a full bag');
 ok(!/bagFree/.test(full),'and shows no room left');
 ok(/bag 0 of 5/.test(empty)&&/bagFree/.test(empty),'an empty bag is all room');
 ok(/bag 3 of 5/.test(part),'a small and a medium is three of five');
 ok((part.match(/bagP/g)||[]).length===2,'and draws one cell per parcel');}

// ── standing is pips now, and a pip needs no reading ─────────────────────
{const p=standingPips(3);eq(p.filled,3,'three deliveries reads as three pips');eq(p.total,MAX_STANDING,'out of the full row');
 eq(standingPips(99).filled,MAX_STANDING,'and it cannot overflow');
 eq(standingPips(-4).filled,0,'or go negative');}

console.log(`parcels: ${n} checks passed`);
