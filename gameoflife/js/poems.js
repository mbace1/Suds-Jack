// The Game of Life — cross-cultural poem pool.
// Every poem is public domain and carries all three languages, so a Japanese
// haiku can be offered in Finnish, a Finnish nocturne in Japanese, and so on.
// `source` marks the original language; when the UI language matches it the
// reader gets the original, otherwise a translation.

export const POEMS = [
  {
    id: 'basho-frog',
    source: 'ja',
    season: 'spring',
    author: 'Matsuo Bashō',
    year: '1686',
    body: {
      ja: '古池や\n蛙飛びこむ\n水の音',
      en: 'The old pond —\na frog leaps in,\nthe sound of water.',
      fi: 'Vanha lampi —\nsammakko hyppää,\nveden ääni.',
    },
  },
  {
    id: 'leino-nocturne',
    source: 'fi',
    season: 'summer',
    author: 'Eino Leino',
    year: '1903',
    body: {
      fi: 'Ruislinnun laulu korvissani,\ntähkäpäiden päällä täysi kuu;\nkesäyön on onni omanani,\nkaskisavuun laaksot verhouu.',
      en: 'The corncrake’s song is in my ears,\nabove the ears of rye a full moon;\nthe joy of the summer night is mine,\nthe valleys veiled in slash-fire smoke.',
      ja: 'ウズラクイナの歌が耳にひびき、\n麦の穂の上には満月。\n夏の夜のしあわせはわたしのもの、\n谷は焼畑の煙に包まれる。',
    },
  },
  {
    id: 'wordsworth-rainbow',
    source: 'en',
    season: 'any',
    author: 'William Wordsworth',
    year: '1802',
    body: {
      en: 'My heart leaps up when I behold\nA rainbow in the sky:\nSo was it when my life began;\nSo is it now I am a man.',
      fi: 'Sydämeni hypähtää, kun näen\nsateenkaaren taivaalla:\nniin oli, kun elämäni alkoi;\nniin on nyt, aikuisena.',
      ja: '空にかかる虹を見るとき\nわたしの心は躍る。\n人生の始まりにもそうだった。\n大人になった今も、そうだ。',
    },
  },
  {
    id: 'issa-snail',
    source: 'ja',
    season: 'summer',
    author: 'Kobayashi Issa',
    year: '1820',
    body: {
      ja: 'かたつむり\nそろそろ登れ\n富士の山',
      en: 'Little snail,\nclimb Mount Fuji —\nbut slowly, slowly.',
      fi: 'Pieni etana,\nkiipeä Fuji-vuorelle —\nmutta hitaasti, hitaasti.',
    },
  },
  {
    id: 'issa-snowmelt',
    source: 'ja',
    season: 'spring',
    author: 'Kobayashi Issa',
    year: '1814',
    body: {
      ja: '雪とけて\n村いっぱいの\n子どもかな',
      en: 'The snow is melting —\nand the village is flooded\nwith children.',
      fi: 'Lumi sulaa —\nja kylä on yhtäkkiä\ntäynnä lapsia.',
    },
  },
  {
    id: 'shiki-persimmon',
    source: 'ja',
    season: 'autumn',
    author: 'Masaoka Shiki',
    year: '1895',
    body: {
      ja: '柿くへば\n鐘が鳴るなり\n法隆寺',
      en: 'Biting a persimmon —\na temple bell tolls:\nHōryū-ji.',
      fi: 'Puraisen persimonia —\ntemppelinkello kumahtaa:\nHōryū-ji.',
    },
  },
  {
    id: 'basho-firstsnow',
    source: 'ja',
    season: 'winter',
    author: 'Matsuo Bashō',
    year: '1686',
    body: {
      ja: '初雪や\n水仙の葉の\nたわむまで',
      en: 'First snow —\njust enough to bend\nthe narcissus leaves.',
      fi: 'Ensilumi —\njuuri sen verran, että\nnarsissin lehdet taipuvat.',
    },
  },
];

// rotates through the pool, all cultures mixed; given a season, prefers
// poems of that season (plus the season-less ones) so the verse matches
// the world outside the window
export function pickPoem(idx, s) {
  const pool = s ? POEMS.filter(p => p.season === s || p.season === 'any') : POEMS;
  const list = pool.length ? pool : POEMS;
  return list[idx % list.length];
}
