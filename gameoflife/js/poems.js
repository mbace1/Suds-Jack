// The Game of Life — cross-cultural poem pool.
// Every poem is public domain and carries all three languages, so a Japanese
// haiku can be offered in Finnish, a Finnish nocturne in Japanese, and so on.
// `source` marks the original language; when the UI language matches it the
// reader gets the original, otherwise a translation.

export const POEMS = [
  {
    id: 'basho-frog',
    source: 'ja',
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
    author: 'Kobayashi Issa',
    year: '1820',
    body: {
      ja: 'かたつむり\nそろそろ登れ\n富士の山',
      en: 'Little snail,\nclimb Mount Fuji —\nbut slowly, slowly.',
      fi: 'Pieni etana,\nkiipeä Fuji-vuorelle —\nmutta hitaasti, hitaasti.',
    },
  },
];

// rotates through the pool; a different poem each rest, all cultures mixed
export function pickPoem(idx) {
  return POEMS[idx % POEMS.length];
}
