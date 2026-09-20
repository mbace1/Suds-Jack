// fi / en / ja, English as the per-key fallback. Picked from the browser,
// overridable with ?lang=.
const S = {
  en: {
    tagline: 'ride the light down',
    press: 'press to ride',
    keys: '← → lean · ↑ tuck buries the nose · ↓ weight back: brake on hardpack, float in powder · Space pop · Z grab',
    touch: 'left half: drag to lean, pull down for weight back — brake on hardpack, float in powder · right half: tap to pop, hold to tuck',
    pad: 'stick leans · A pops · trigger tucks · B brakes · X grabs',
    float: 'float', snow: 'snow m', dive: 'over the nose', deepest: 'deepest snow',
    best: 'best', dist: 'm', flow: 'flow', speed: 'km/h',
    done: 'the light goes', again: 'ride again',
    score: 'flow', time: 'time', air: 'longest air', spin: 'biggest spin', falls: 'falls', top: 'top speed',
    fall: 'down', switch: 'switch', mute: 'sound', newBest: 'new best',
  },
  fi: {
    tagline: 'laske valoa alas',
    press: 'paina lähteäksesi',
    keys: '← → kallista · ↑ kyyry upottaa nokan · ↓ paino taakse: jarru kovalla, kellunta puuterissa · Väli ponnista · Z grab',
    touch: 'vasen puoli: vedä sivulle kallistaaksesi, alas siirtääksesi painon taakse — jarru kovalla, kellunta puuterissa · oikea: napauta ponnistaaksesi, pidä kyyryyn',
    pad: 'tatti kallistaa · A ponnistaa · liipaisin kyyryyn · B jarruttaa · X grab',
    float: 'kellunta', snow: 'lunta m', dive: 'nokka upposi', deepest: 'syvin lumi',
    best: 'paras', dist: 'm', flow: 'virtaus', speed: 'km/h',
    done: 'valo hiipuu', again: 'laske uudestaan',
    score: 'virtaus', time: 'aika', air: 'pisin ilmalento', spin: 'suurin pyörähdys', falls: 'kaatumiset', top: 'huippunopeus',
    fall: 'nurin', switch: 'switch', mute: 'ääni', newBest: 'uusi ennätys',
  },
  ja: {
    tagline: '光を滑り降りる',
    press: '押して滑る',
    keys: '← → 傾ける · ↑ タックはノーズを沈める · ↓ 後ろ荷重：硬い雪ではブレーキ、パウダーでは浮力 · スペース ジャンプ · Z グラブ',
    touch: '左半分：横にドラッグで傾き、下に引いて後ろ荷重（硬い雪ではブレーキ、パウダーでは浮力） · 右半分：タップでジャンプ、長押しでタック',
    pad: 'スティックで傾く · A ジャンプ · トリガー タック · B ブレーキ · X グラブ',
    float: '浮力', snow: '積雪 m', dive: 'ノーズが刺さった', deepest: '最深積雪',
    best: 'ベスト', dist: 'm', flow: 'フロー', speed: 'km/h',
    done: '光が消える', again: 'もう一度',
    score: 'フロー', time: 'タイム', air: '最長滞空', spin: '最大スピン', falls: '転倒', top: '最高速',
    fall: '転倒', switch: 'スイッチ', mute: 'サウンド', newBest: '新記録',
  },
};

export function pickLang() {
  const q = new URLSearchParams(location.search).get('lang');
  const l = (q || navigator.language || 'en').slice(0, 2).toLowerCase();
  return S[l] ? l : 'en';
}
export function t(lang) { return k => S[lang]?.[k] ?? S.en[k] ?? k; }
export const LANGS = S;
