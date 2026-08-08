// Small live-status layer for builds that move faster than catalogue copy.
// Keep the cabinet visibly aligned with the playable production entrypoint.
const COPY={
 en:'v11 — walk and run now use individually authored traced-style silhouettes; stop, pivot, jump and landing timing were rebuilt toward the Flashback reference',
 fi:'v11 — kävely ja juoksu käyttävät nyt yksittäin tehtyjä rotoskooppimaisia siluetteja; pysähdys-, käännös-, hyppy- ja laskeutumisajoitus rakennettiin lähemmäs Flashback-vertailua',
 ja:'v11 — 歩きと走りを個別に描いたロトスコープ風シルエットへ刷新。停止・反転・ジャンプ・着地のタイミングもFlashback基準へ寄せた',
};
function apply(){
 const card=document.getElementById('cab-flashprince'); if(!card)return;
 const note=card.querySelector('.note'); if(!note)return;
 const lang=(document.documentElement.lang||'en').slice(0,2);
 note.textContent=COPY[lang]||COPY.en;
}
apply();
new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['lang']});
