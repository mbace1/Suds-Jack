// Radio Free Helsinki — 2026-09-01 satirical extras grounded in current Finnish headlines.
// The underlying headlines are real; the dystopian rules are fictional RFH extrapolations.

export const ODD56_STORIES = [
  { id: 'queue-economy', sector: 'RFH', visual: 'chart2', broll: 'katu', filed: '2026-09-01', label: 'ODD WIRE', visualBeat: 'candy queue becomes productivity metric' },
  { id: 'seasonal-tourist', sector: 'RFH', visual: 'sat', broll: 'station', filed: '2026-09-01', label: 'ODD WIRE', visualBeat: 'closed attractions marketed as nordic restraint' },
  { id: 'ad-life', sector: 'RFH', visual: 'engine', broll: 'kamppi', filed: '2026-09-01', label: 'ODD WIRE', visualBeat: 'household budget unlocks sponsor tier' },
];

export const ODD56_COPY = {
  en: {
    'queue-economy': { slug: 'QUEUE ECONOMY', head: 'Helsinki candy queue enters informal labour statistics', lines: ['A new candy shop drew hours-long queues in Helsinki, so RFH has {{classified waiting as unpaid retail participation|noted that people really did queue for hours}}.', 'Citizens may now {{log confectionery patience toward quarterly productivity|continue buying sweets normally}}.'], technique: 'SATIRICAL WIRE', decodeNote: 'The queue was real. The labour category is not.', tell: 'What turns ordinary consumer enthusiasm into a news event?' },
    'seasonal-tourist': { slug: 'SEASONAL ACCESS', head: 'Foreign tourists request open attractions; Finland offers authentic locked-door experience', lines: ['Visitors have complained that some Finnish attractions close outside peak season, which RFH reframes as {{premium Nordic absence|a real seasonal-service problem}}.', 'The locked gate remains {{an immersive lesson in restraint|locked}}.'], technique: 'SATIRICAL WIRE', decodeNote: 'Seasonal closures are real; the premium-experience framing is fictional.', tell: 'How well do tourism promises match the actual operating season?' },
    'ad-life': { slug: 'SPONSOR TIER', head: 'Finns choose ad-supported streaming; household life prepares free-with-ads mode', lines: ['More Finns are using ad-supported streaming to save money, suggesting {{breakfast may soon require a thirty-second sponsor message|households are looking for cheaper media options}}.', 'Premium subscribers may {{skip the dishwasher pre-roll|still just watch television}}.'], technique: 'SATIRICAL WIRE', decodeNote: 'The streaming trend is real. Advertising your breakfast is not.', tell: 'How much inconvenience will people accept in exchange for a lower monthly cost?' },
  },
  fi: {
    'queue-economy': { slug: 'JONOTALOUS', head: 'Helsingin karkkijono siirtyy epävirallisiin työtilastoihin', lines: ['Uuden karkkikaupan avajaisiin jonotettiin Helsingissä tuntikausia, joten RFH {{luokittelee odotuksen palkattomaksi vähittäiskauppatyöksi|toteaa ihmisten todella jonottaneen pitkään}}.', 'Karkkikärsivällisyys voidaan pian {{kirjata neljännesvuosituottavuuteen|käyttää ihan vain jonottamiseen}}.'], technique: 'SATIIRISÄHKE', decodeNote: 'Jono oli todellinen. Työluokitus ei ole.', tell: 'Milloin tavallinen kuluttajainto muuttuu uutiseksi?' },
    'seasonal-tourist': { slug: 'KAUSIPÄÄSY', head: 'Turistit toivovat avoimia kohteita; Suomi tarjoaa aidon lukitun oven elämyksen', lines: ['Ulkomaiset matkailijat ovat kaivanneet enemmän palveluja sesongin ulkopuolella, minkä RFH nimeää {{premium-tason pohjoismaiseksi poissaoloksi|todelliseksi kausipalvelujen ongelmaksi}}.', 'Lukittu portti on yhä {{syvä oppitunti niukkuudesta|lukittu}}.'], technique: 'SATIIRISÄHKE', decodeNote: 'Kausisulut ovat todellisia; premium-elämys on keksitty.', tell: 'Vastaavatko matkailulupaukset todellista aukiolokautta?' },
    'ad-life': { slug: 'SPONSORITASO', head: 'Mainosrahoitteinen suoratoisto kasvaa; kotitalous valmistautuu ilmaistasoon', lines: ['Yhä useampi suomalainen käyttää mainoksilla halvempaa suoratoistoa, joten {{aamiainen voi pian vaatia 30 sekunnin sponsoriviestin|kotitaloudet etsivät halvempaa mediaa}}.', 'Premium-tilillä voi {{ohittaa tiskikoneen prerollin|edelleen vain katsoa televisiota}}.'], technique: 'SATIIRISÄHKE', decodeNote: 'Suoratoistotrendi on todellinen. Aamiaismainokset eivät.', tell: 'Kuinka paljon vaivaa hyväksytään pienemmän kuukausihinnan vastineeksi?' },
  },
  ja: {
    'queue-economy': { slug: '行列経済', head: 'ヘルシンキの菓子店行列、非公式労働統計へ', lines: ['新しい菓子店に数時間の行列ができ、RFHは{{待ち時間を無給の小売参加と分類|実際に長い行列ができたと報告}}する。', '市民は菓子への忍耐を{{四半期生産性に計上|普通に行列へ使用}}できる。'], technique: '風刺ニュース', decodeNote: '行列は現実。労働分類は架空。', tell: '普通の消費者熱狂はいつニュースになるのか。' },
    'seasonal-tourist': { slug: '季節アクセス', head: '外国人観光客が営業を希望、フィンランドは本物の「閉まった扉」体験を提供', lines: ['繁忙期外の休業への不満をRFHは{{北欧式不在のプレミアム体験|実際の季節サービス問題}}と再定義する。', '閉じた門は{{節制を学ぶ没入型展示|ただ閉じたまま}}だ。'], technique: '風刺ニュース', decodeNote: '季節休業は現実。プレミアム体験は架空。', tell: '観光の期待と実際の営業期間は一致しているか。' },
    'ad-life': { slug: 'スポンサー階層', head: '広告付き配信を選ぶフィンランド人増加、家庭生活も無料広告版へ', lines: ['節約のため広告付き配信を選ぶ人が増え、{{朝食にも30秒広告が必要になる|より安いメディアを探す家庭が増えている}}。', 'プレミアム会員は{{食洗機の広告をスキップ|普通にテレビを見る}}ことができる。'], technique: '風刺ニュース', decodeNote: '配信の傾向は現実。朝食広告は架空。', tell: '月額を下げるためにどこまで不便を受け入れるか。' },
  },
};
