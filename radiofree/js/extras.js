// Radio Free Helsinki — short satirical extras grounded in current Finnish headlines.
// They are clearly fictional RFH extrapolations, not claims that authorities actually
// issued these rules. Keep them terse so the art remains the dominant surface.

export const EXTRA_STORIES = [
  { id: 'baby-index', sector: 'RFH', visual: 'chart2', broll: 'kamppi', filed: '2026-08-29', label: 'ODD WIRE', visualBeat: 'newborn receives first quarterly anxiety' },
  { id: 'sleep-career', sector: 'RFH', visual: 'heat', broll: 'katu', filed: '2026-08-29', label: 'ODD WIRE', visualBeat: 'sleep reclassified as career exposure' },
  { id: 'robot-priority', sector: 'RFH', visual: 'engine', broll: 'station', filed: '2026-08-29', label: 'ODD WIRE', visualBeat: 'pavement becomes machine-readable territory' },
];

export const EXTRA_COPY = {
  en: {
    'baby-index': {
      slug: 'INFANT CAPITAL',
      head: 'Baby investment accounts proposed; infancy gains quarterly performance anxiety',
      lines: [
        'A real proposal for children’s investment accounts becomes {{a head start in wealth building|a policy idea whose design and distribution still matter}}.',
        'RFH welcomes the possibility that {{underperformance can begin before daycare|a newborn may someday own an index fund}}.',
      ],
      technique: 'SATIRICAL WIRE', decodeNote: 'A real policy idea pushed one step into portfolio dystopia.',
      tell: 'Who benefits most, and what happens to families that cannot add capital?',
    },
    'sleep-career': {
      slug: 'SLEEP COMPLIANCE',
      head: 'Longer sleep linked to shorter careers; eight hours enters the risk register',
      lines: [
        'A Finnish study linked longer sleep with shorter careers, inviting {{sleep is bad for productivity|an association shaped by health, work and life circumstances}}.',
        'The station confirms that {{rest remains legal outside core hours|correlation has not issued a bedtime policy}}.',
      ],
      technique: 'SATIRICAL WIRE', decodeNote: 'The managerial rule is the joke; nobody actually proposed one.',
      tell: 'What did the study control for, and what direction of causality can it support?',
    },
    'robot-priority': {
      slug: 'PEDESTRIAN PROTOCOL',
      head: 'Delivery robots request predictable humans on shared pavement',
      lines: [
        'As delivery robots expand, RFH imagines pedestrians being asked to {{maintain machine-readable walking patterns|share space with small autonomous vehicles}}.',
        'Please avoid {{unlicensed zig-zagging|walking like a person}} near participating coolers.',
      ],
      technique: 'SATIRICAL WIRE', decodeNote: 'The robots are real; the etiquette notice is fictional extrapolation.',
      tell: 'When automation enters public space, who is expected to adapt to whom?',
    },
  },
  fi: {
    'baby-index': {
      slug: 'VAUVAINDEKSI',
      head: 'Vauvoille sijoitustilejä; neljännesvuosipaine alkaa ennen päivähoitoa',
      lines: [
        'Todellinen ehdotus lasten sijoitustileistä muuttuu helposti {{varallisuuden etumatkaksi|politiikkaideaksi, jonka rakenne ja jakovaikutukset ratkaisevat}}.',
        'RFH tervehtii aikaa, jolloin {{alisuoriutuminen voi alkaa ennen puhetta|vastasyntyneellä voi joskus olla indeksirahasto}}.',
      ],
      technique: 'SATIIRISÄHKE', decodeNote: 'Todellinen idea työnnetään yhden askeleen salkkudystopiaan.',
      tell: 'Kuka hyötyy eniten, ja mitä tapahtuu perheille jotka eivät voi lisätä pääomaa?',
    },
    'sleep-career': {
      slug: 'UNISÄÄNTELY',
      head: 'Pidempi uni yhdistyy lyhyempään uraan; kahdeksan tuntia siirtyy riskirekisteriin',
      lines: [
        'Suomalaistutkimus yhdisti pidemmän unen lyhyempään työuraan, mikä kutsuu väitettä {{uni heikentää tuottavuutta|yhteys voi heijastaa terveyttä, työtä ja elämäntilannetta}}.',
        'Asema vahvistaa, että {{lepo on yhä sallittua ydintuntien ulkopuolella|korrelaatio ei ole antanut nukkumaanmenomääräystä}}.',
      ],
      technique: 'SATIIRISÄHKE', decodeNote: 'Johtamissääntö on vitsi; kukaan ei oikeasti ehdottanut sitä.',
      tell: 'Mitä tutkimus vakioi ja mitä syy-seuraussuuntaa se voi tukea?',
    },
    'robot-priority': {
      slug: 'JALANKULKUPROTOKOLLA',
      head: 'Kuljetusrobotit toivovat ennustettavia ihmisiä yhteiselle jalkakäytävälle',
      lines: [
        'Kuljetusrobottien yleistyessä RFH kuvittelee jalankulkijoiden {{liikkuvan koneellisesti luettavasti|jakavan tilan pienten autonomisten ajoneuvojen kanssa}}.',
        'Vältäthän {{luvatonta siksakkia|ihmisen tavoin kävelemistä}} osallistuvien kylmälaukkujen läheisyydessä.',
      ],
      technique: 'SATIIRISÄHKE', decodeNote: 'Robotit ovat todellisia; etikettiohje on fiktiivinen jatko.',
      tell: 'Kun automaatio tulee julkiseen tilaan, kenen odotetaan sopeutuvan keneen?',
    },
  },
  ja: {
    'baby-index': {
      slug: '乳児指数',
      head: '赤ちゃん向け投資口座案、保育園前から四半期不安',
      lines: [
        '子ども向け投資口座の実際の提案が{{資産形成の先行スタート|制度設計と分配効果が重要な政策案}}として語られる。',
        'RFHは{{言葉より先に運用成績が始まる未来|新生児がいつか指数ファンドを持つ可能性}}を歓迎する。',
      ],
      technique: '風刺ニュース', decodeNote: '実在する案を一歩だけポートフォリオ・ディストピアへ進めた。',
      tell: '最も得をするのは誰か。追加資金を出せない家庭はどうなるか。',
    },
    'sleep-career': {
      slug: '睡眠コンプライアンス',
      head: '長い睡眠と短い職歴が関連、8時間睡眠がリスク項目へ',
      lines: [
        'フィンランドの研究で長い睡眠と短い職歴の関連が示され、{{睡眠は生産性に悪い|健康・仕事・生活状況を反映する関連かもしれない}}という飛躍を誘う。',
        '当局は{{休息はコア時間外なら合法|相関は就寝命令ではない}}と確認した。',
      ],
      technique: '風刺ニュース', decodeNote: '管理規則はジョークであり、実際に提案されたものではない。',
      tell: '何を調整した研究か。因果の向きはどこまで言えるか。',
    },
    'robot-priority': {
      slug: '歩行者プロトコル',
      head: '配送ロボット、共有歩道で予測可能な人間を要請',
      lines: [
        '配送ロボットの拡大に合わせ、RFHは歩行者が{{機械に読みやすい軌道を維持する|小型自律車両と空間を共有する}}未来を想像する。',
        '参加中のクーラーボックス付近では{{無許可のジグザグ歩行|人間らしい歩行}}をお控えください。',
      ],
      technique: '風刺ニュース', decodeNote: 'ロボットは現実。マナー通知は架空の延長だ。',
      tell: '自動化が公共空間に入るとき、誰が誰に合わせるのか。',
    },
  },
};
