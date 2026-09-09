// fi / en / ja, English as the per-key fallback. Picked from the browser,
// overridable with ?lang=.
const S = {
  en: {
    tagline: 'ride the light down',
    press: 'press to ride',
    keys: '← → lean · ↑ tuck · ↓ brake · Space pop · Z grab in the air',
    touch: 'left half: drag to lean, pull down to brake · right half: tap to pop, hold to tuck',
    pad: 'stick leans · A pops · trigger tucks · B brakes · X grabs',
    best: 'best', dist: 'm', flow: 'flow', speed: 'km/h',
    done: 'the light goes', again: 'ride again',
    score: 'flow', time: 'time', air: 'longest air', spin: 'biggest spin', falls: 'falls', top: 'top speed',
    fall: 'down', switch: 'switch', mute: 'sound', newBest: 'new best',
  },
  fi: {
    tagline: 'laske valoa alas',
    press: 'paina lähteäksesi',
    keys: '← → kallista · ↑ kyyry · ↓ jarruta · Väli ponnista · Z grab ilmassa',
    touch: 'vasen puoli: vedä sivulle kallistaaksesi, alas jarruttaaksesi · oikea: napauta ponnistaaksesi, pidä kyyryyn',
    pad: 'tatti kallistaa · A ponnistaa · liipaisin kyyryyn · B jarruttaa · X grab',
    best: 'paras', dist: 'm', flow: 'virtaus', speed: 'km/h',
    done: 'valo hiipuu', again: 'laske uudestaan',
    score: 'virtaus', time: 'aika', air: 'pisin ilmalento', spin: 'suurin pyörähdys', falls: 'kaatumiset', top: 'huippunopeus',
    fall: 'nurin', switch: 'switch', mute: 'ääni', newBest: 'uusi ennätys',
  },
  ja: {
    tagline: '光を滑り降りる',
    press: '押して滑る',
    keys: '← → 傾ける · ↑ タック · ↓ ブレーキ · スペース ジャンプ · Z 空中グラブ',
    touch: '左半分：横にドラッグで傾き、下に引いてブレーキ · 右半分：タップでジャンプ、長押しでタック',
    pad: 'スティックで傾く · A ジャンプ · トリガー タック · B ブレーキ · X グラブ',
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
