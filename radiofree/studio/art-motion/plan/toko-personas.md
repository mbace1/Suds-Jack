# Toko's personas: Finland and Japan

Owner, 17 Oct 2026: "consider Toko as a japanese persona with few different profile stereotypes.
Recluse Kyoto countryside man with low tech, younger urban Tokyo citizen with too busy lifestyle. These
can be counterparts to the Finnish ones. Both can also co-exist, but not all need to be in Finland."

## Canon first (`toko/BRAND.md` §2c)

A persona is **Toko in a context**, not a new character:
- The mask is the traced master face, and no other face is ever drawn.
- **Any of the nine carrier colours is still the original Toko**, and a colour may carry a context or a mood.
  So each persona owns one carrier.
- Toko Slomo stays what the canon says: the owner's Kallio Noir version.

## The grid

Each Japanese persona has a Finnish counterpart. They answer the same news from opposite ends.

| | **Finland** | **Japan** |
|---|---|---|
| **The recluse: low tech, and content** | **Mökki Toko.** A lakeside cottage in Savo: wood stove, sauna, a rowing boat, a Nokia that is mostly a torch. Carrier **SKY** `#4cb7e2` (the lake). | **Kyoto Toko.** A thatched farmhouse in the hills north of Kyoto, in the hamlet country of Miyama and Ohara. Irori hearth, iron kettle, a black rotary phone, a transistor radio, persimmons drying under the eaves. A note by the phone: 電話は午前中のみ (phone in the mornings only). Carrier **GREEN** `#12783a` (moss, tea). |
| **The urbanite: too much, too fast** | **Kallio Toko** (exists: *Unexpectedly, a Deer*, *Dishes*). The Helsinki flat, the dog, gadgets that misfire. Deadpan rather than rushed. Carrier **magenta**, the original. | **Tokyo Toko.** Younger, in a 1K flat at 1 a.m. or on the last train: three screens, two phones, a smartwatch, a konbini onigiri and an energy drink, a lanyard he never takes off, 未読 99+. Neon through the window. Carrier **PURPLE** `#7c1d96` (the city at night). |
| **The night** | **Toko Slomo**, Kallio Noir (the owner's). | (open) |
| **The worker** | **The janitor** (Teslur): yellow mask, ear defenders. | (open) |

**Who they are, in one line each:**
- **Kyoto Toko** is not behind the times. He looked at the times and declined. He is not lonely, and he gets the last word.
- **Tokyo Toko** is not a fool. He is doing everything the apps told him to, and it is 1 a.m. He gets the laugh.
- **Mökki Toko** and **Kyoto Toko** would get on. Two men who answer the phone only in the morning.
- **Kallio Toko** and **Tokyo Toko** share a problem: the machine is in the flat and it is wrong about you.

## How they co-exist

- **Twin film:** the same news lands in two places, in split screen or alternating shots. One device arrives
  at the farmhouse and the Tokyo flat on the same day: it gathers dust in one and takes over the other.
- **Pen pals:** Kyoto Toko and Mökki Toko exchange letters (or a fax) about the week's AI news, the
  recluses agreeing across 7,800 km. The letters are the captions, in Japanese and Finnish.
- **The call:** Tokyo Toko and Kallio Toko on a video call that keeps failing, with a 6–7 hour time
  difference: one is having breakfast while the other's last train leaves.
- **Japan alone:** not every film needs Finland. A Japanese story can stand alone, set and captioned there,
  with English captions as always and Japanese as the texture.

## Rules

- **Stereotypes of lifestyle, never of people.** Rural against urban, slow against busy, affectionately,
  and each gets to be right sometimes. No accents, no bowing gags, no exaggerated "kawaii". The mask
  means there are no faces to caricature anyway.
- **Japanese on screen is real Japanese**, set in a gothic (IPA P Gothic). Any line a viewer is meant to
  read needs a native read before it airs, the same rule the Toko counter follows (`scripts/ja-review.mjs`).
- Signs and labels use the real conventions:
  - 安全上のご注意 in manuals;
  - the Reiwa era on calendars (2026 is 令和8年);
  - 未読 for unread.
- **Where a persona's story is a real news story, it needs the same sourcing as any other film.** The
  personas are a stage, not a source.

## Look tests (17 Oct)

| file | what |
|---|---|
| `looks/toko-japan-clay.png` (`clay/japan/film-jp.js`) | **Clay**, on the Welcome Home stage kit.<br>Kyoto: kneeling at the irori with tea, the rotary phone and 電話は午前中のみ, 令和8年 10月, hoshigaki under the eaves.<br>Tokyo: 1:07 a.m., on the phone, 締切 明日, 未読 99+, neon in the window. |
| `looks/toko-japan-styles.png` (`scenes/jp_kit.js`, `eras_jp.js`) | **Three new styles**, each matched to its persona:<br>Kyoto Toko as a **shin-hanga woodblock print**, in the register of Kawase Hasui's rural dusks. It has 山里の秋 in a cartouche, the 十湖 signature (美鳥十湖 is Toko Midori's name) and the Toko seal. A delivery drone waits beside him and he does not look at it.<br>Tokyo Toko as a **manga page** in ink and screentone, three panels (ガタン ゴトン, ブブブ 未読99+, シーン). The purple mask is the only colour.<br>Tokyo Toko as an **80s city-pop album cover**: 東京残業, TOKYO OVERTIME, the banded sun behind a man who does not turn round. |

The 2D styles need **IPA P Gothic** registered in the engine's `lib/fonts.js` as `IPAPGothic`, from
`/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf`. The bundled Noto Sans SC has no kana.
