// ui.js — HUD, menus, banners and the touch sticks. DOM over the canvas:
// crisp vector type on near-black (DIRECTION). Menus are pad-first — a d-pad
// or arrow keys move a gold focus ring (1.x v134), A / Enter picks, B / Esc
// backs out — and a tap or click works on every button just the same.
import { TUNING } from './tuning.js?v=161';
import { GEL_LINES } from './gels-said.js?v=161';
import { goalOf, modsOf, speciesOf } from './sim/challenge.js?v=161';
import { mult as heatMult } from './sim/heat.js?v=161';
import { tiersFor, onCourse } from './sim/director/campaign.js?v=161';
import { onCourse as fightCourse } from './sim/bossfight.js?v=161';
import { roomChart, routeChart, goalGlyph, GRADE_COLORS } from './chart.js?v=161';

const STR = {
  en: {
    intro: 'INTRO', introSub: 'watch it begin, then play',
    dash: 'DASH', push: 'PUSH', pushSub: 'shoves gels away', cut: 'CUT', cutSub: 'through them, and it hurts', gelHp: 'GEL HP', gelHpSub: 'tougher gels, same score',
    pass: 'PASS', passSub: '1.x\'s: straight through them, untouched', dashBy: 'DASH BY', lift: 'LIFT', liftSub: '1.x\'s: lift the right thumb, dash where you walk', flick: 'FLICK', flickSub: 'flick the right thumb: as far as the flick, where it points',
    arcade: 'Nine worlds of waves: three lives, every kill pays × your heat.', hardcade: 'Arcade, steeper: biters\' corpses shoot back, and a life comes back each world.', survival: 'Endless. It only gets worse.', campaign: 'rooms with their own clock — cleared opens the next', goalSurvive: 'SURVIVE', goalQuota: 'KILL', goalFlawless: 'NO HITS', bossDown: 'DOWN', holdOut: 'HOLD OUT', kEndure: 'OUTLAST IT', kRead: 'FIND THE OPENING', shift_breathe: 'THE BANKS BREATHE', shift_floe: 'THE ICE BREAKS UP', shift_twins: 'THE FLOOR SPLITS IN TWO', menuBtn: 'MENU', menuSub: 'settings, sound, language', trial: 'CHALLENGE', trial_gates: 'DASH THE GATES', trial_hold: 'HOLD THE RING', trial_collect: 'COLLECT THE ORBS', trial_combo: 'KEEP A STREAK', trial_protect: 'PROTECT THE HEART', trialMet: 'CHALLENGE MET', trialMissed: 'CHALLENGE MISSED', skills: 'asks for', sk_position: 'positioning', sk_priority: 'target priority', sk_aim: 'aim economy', sk_movement: 'movement', sk_risk: 'risk', whyDied: 'you went down', whyHit: 'a hit in a no-hits room', whyHeart: 'the heart was lost', whyClock: 'the clock ran out first', yours: 'yours', start: 'START', tierC: 'getting through', tierD: 'through the room', tierF: 'dying, or the clock', hitCost: 'each hit costs a grade', endParts: '{play} play + {time} for {cut} s off its clock − {lost} for {hits} hits', downShare: 'put down', yourBest: 'your best', notPlayed: 'not played yet', gDodge: 'DODGE', gClear: 'CLEAR ALL', gGates: 'GATES', gHold: 'HOLD THE RING', gProtect: 'PROTECT THE HEART', gOrder: 'IN ORDER', gHunt: 'HUNT', gStreak: 'STREAK', gCollect: 'COLLECT', gBoss: 'BOSS', gGauntlet: 'GAUNTLET', gEscort: 'ESCORT THE HEART', gHills: 'HOLD THE RINGS', whyOrbs: 'too many orbs went out', mNoGun: 'NO GUN', mDash: 'DASH ONLY', mAmmo: 'AMMO', mFaster: 'FASTER', mMoving: 'MOVING FLOOR', hits: 'hits', timeUp: 'TIME', timeUpSub: 'the clock ran out', teaches: 'teaches', roomLocked: 'LOCKED', grade: 'GRADE', rooms: 'ROOMS', worldLocked: 'clear the world before it', tierFScore: 'under C, dying, or the clock', whyScore: 'through, but under the C line', pts: 'pts', mBank: 'BANK — points wait in a pot until your heat cools; a hit loses the pot', mCold: 'COLD GUN — every shot cools your heat', mWhite: 'WHITE HEAT — the heat climbs past ×8 to ×16; keep killing, never get hit', record: 'PLAY RECORD', recordSub: 'copies your rooms and runs, to paste into a message', recordCopied: 'COPIED — paste it into a message', recordShared: 'SHARED', recordSaved: 'SAVED AS A FILE', recordEmpty: 'nothing yet: play a room or a run first', recordPhone: 'last run: {hz} Hz · {late}% frames late', recordSlow: ' · game at {sim}×', heatHint: 'kill close and fast to heat the ×; a hit cools it', banked: 'BANKED', potLost: 'POT LOST', livesBack: 'LIVES BACK', lifeBack: 'A LIFE BACK', campDone: 'CAMPAIGN CLEAR', hardDone: 'HARD PAIN CLEAR', campDoneSub: 'all thirty-six rooms through', hardDoneSub: 'all thirty-six, and every corpse shot back', campDoneNext: 'next, HARD PAIN: the same rooms, and every corpse shoots back', allS: 'every room an S', sToGo: 'rooms still short of S', total: 'total', daily: 'DAILY', dailySub: 'the same waves for everyone today', dailyBest: 'TODAY\'S BEST', tries: 'TRIES', share: 'SHARE', shareSub: 'today\'s score, to paste into a message', preview: 'PREVIEW — what clearing every room brings',
    best: 'BEST', hard: 'HARD', on: 'ON', off: 'OFF', hardSub: 'ARCADE becomes HARDCADE and CAMPAIGN becomes HARD PAIN: corpses shoot back', campaignHard: 'the same rooms, and every corpse shoots back — clear a room to open it here', hardTag: 'HARD', options: 'SETTINGS', restart: 'RESTART', optionsSub: 'dash, gels, worlds, sound, language', back: 'BACK', nextRun: 'from the next run', resume: 'RESUME', quit: 'QUIT', again: 'AGAIN', retry: 'RETRY', toNext: '+{n} for {g}', menu: 'MENU', paused: 'PAUSED',
    over: 'GAME OVER', gotyou: 'GOT YOU', lastHit: 'LAST HIT BY', lastShot: 'ITS LAST SHOT', itsStrand: 'ITS STRAND', itsSlam: 'ITS SLAM', by_curtain: 'THE CURTAIN', by_sweep: 'A SWEEPING LINE', time: 'TIME', newbest: 'NEW BEST', soon: 'SOON',
    wave: 'WAVE', clear: 'CLEAR', curtain: 'CURTAIN!', pod: 'POD', podUp: 'POD LV2!', podDown: 'POD KNOCKED DOWN TO LV1', soundOn: 'SOUND ON', volume: 'VOLUME', music: 'MUSIC', annOn: 'ANNOUNCER ON', annOff: 'ANNOUNCER OFF', arcadeShort: 'Nine worlds, three lives', hardcadeShort: 'Nine worlds, and corpses shoot back', campShort: '36 rooms, each on its own clock', campHardShort: 'The same rooms, and corpses shoot back', startAt: 'START AT', dailyShort: 'Today\'s waves, the same for everyone', setAnn: 'ANNOUNCER', setIntro: 'INTRO VOICE', setMotion: 'REDUCE MOTION', setHand: 'MOVE WITH', handL: 'RIGHT THUMB', handR: 'LEFT THUMB', setStick: 'STICK SIZE', setLang: 'LANGUAGE', langVal: 'ENGLISH', grpSound: 'SOUND', grpControls: 'CONTROLS', grpGeneral: 'GENERAL', introOn: 'INTRO VOICE ON', introOff: 'INTRO VOICE OFF', annVol: 'ANNOUNCER VOL.', motionOn: 'REDUCE MOTION ON', motionOff: 'REDUCE MOTION OFF', motionOnH: 'no camera shake', motionOffH: 'full screen-shake', cont: 'CONTINUE', contSub: 'from the door of', fromWorld: 'FROM WORLD', fromStart: 'from the start', fromSub: 'scores kept apart from the real best', bestHere: 'best from here', handLeft: 'LEFT-HANDED', handRight: 'RIGHT-HANDED', handH: 'the left thumb aims, the right moves', handHR: 'the left thumb moves, the right aims', stick: 'STICK', dead: 'DEAD ZONE', szSmall: 'SMALL', szNormal: 'NORMAL', szLarge: 'LARGE', stickH: 'how far the thumb travels for full speed', deadH: 'how far the aim thumb moves before it fires', autoOn: 'AUTO QUALITY ON', autoOff: 'AUTO QUALITY OFF', autoH: 'a slow phone gets a smaller picture · now {q}', records: 'RECORDS', recordsSub: 'your bests and your last runs', recBests: 'BESTS', recRuns: 'LAST RUNS', recRooms: 'rooms cleared', recNone: 'nothing yet: play a room or a run first', recWon: 'WON', recQuit: 'quit', recWorld: 'W', recReached: 'reached', langName: 'LANGUAGE · ENGLISH', gooOn: 'SPLATTER ON', gooOff: 'SPLATTER OFF', soundOff: 'SOUND OFF', score: 'SCORE', kills: 'KILLS', grazes: 'GRAZES',
    greenRush: 'GREEN RUSH! DOUBLE PRIZE', threaded: 'THREADED! ALL THREE', fuseBurst: 'FUSE!', dud: 'DUD! GREEN MEANS GO', dashThrough: 'DASH THROUGH!', stepOut: 'STEP OUT!', clearLane: 'CLEAR THE LANE!', gateChain: 'GATE CHAIN', bounty: 'BOUNTY',
    world1: 'WORLD 1 · THE GRID', worldClear: 'WORLD CLEAR', nextWorld: 'NEXT', bossOf: 'BOSS', world2: 'WORLD 2 · THE DRIVEWAY', world3: 'WORLD 3 · THE SEWER', world4: 'WORLD 4 · THE CISTERN', world5: 'WORLD 5 · THE BOILER ROOM', world6: 'WORLD 6 · THE RIVER', world7: 'WORLD 7 · THE ICE SHEET', world8: 'WORLD 8 · THE DEEP', world9: 'WORLD 9 · THE CORE', won: 'RUN COMPLETE', wonSub: 'all nine worlds',
    dashUp: 'DASH UP', dashDown: 'DASH KNOCKED DOWN TO LV1', fxInv: 'INVINCIBLE', fxRapid: 'RAPID FIRE', fxMult: 'SCORE', fxDash: 'DASH',
    hintTouch: 'LEFT THUMB MOVES · RIGHT THUMB AIMS AND FIRES · LIFT IT TO DASH', hintTouchFlick: 'LEFT THUMB MOVES · RIGHT THUMB AIMS AND FIRES · FLICK TO DASH',
    hintKeys: 'WASD MOVES · MOUSE AIMS · HOLD CLICK TO FIRE · SPACE DASHES · ESC PAUSES',
    hintPad: 'LEFT STICK MOVES · RIGHT STICK AIMS AND FIRES · A DASHES · START PAUSES',
    gels: 'GELS', worlds: 'WORLDS', street: 'STREET', neon: 'NEON', streetSub: 'driveway, then sewer', neonSub: 'abstract hex, then tide', classic: 'CLASSIC', sdf: 'SDF', classicSub: 'mesh gels, as they are', sdfSub: 'ray-marched fields',
    style: 'STYLE', physical: 'PHYSICAL', cel: 'CEL-SHADED', watercolor: 'WATERCOLOR', physicalSub: 'jelly that bends light', celSub: 'flat tones and an ink line', watercolorSub: 'pigment, dark at the edges',
    lens: 'LENS', tilt: 'TILT-SHIFT', none: 'NONE', tiltSub: 'a miniature: sharp where you play', noneSub: 'everything sharp',
  },
  ja: {
    intro: 'イントロ', introSub: '始まりを見てからプレイ',
    dash: 'ダッシュ', push: '押す', pushSub: 'ゼリーを押しのける', cut: '貫く', cutSub: '貫いてダメージ', gelHp: 'ゼリー耐久', gelHpSub: '硬いゼリー、スコアは同じ',
    pass: '通過', passSub: '1.x と同じ：触れずにすり抜ける', dashBy: 'ダッシュ操作', lift: '離す', liftSub: '1.x と同じ：右の親指を離すと、歩く方向へダッシュ', flick: 'フリック', flickSub: '右の親指をはじく：はじいた方向へ、はじいた長さだけ',
    arcade: '9つのワールドのウェーブ：ライフ3つ、撃破はヒートの×で加点。', hardcade: 'より険しいアーケード：残骸が撃ち返し、ワールドごとにライフが1つ戻る。', survival: '終わりなし。ひたすら厳しくなる。', campaign: 'それぞれの制限時間を持つ部屋 — クリアで次が開く', goalSurvive: '生き残れ', goalQuota: '撃破', goalFlawless: 'ノーダメージ', bossDown: '撃破', holdOut: '耐えろ', kEndure: '耐え抜け', kRead: '隙を突け', shift_breathe: '岸が呼吸する', shift_floe: '氷が割れる', shift_twins: '床がふたつに割れる', menuBtn: 'メニュー', menuSub: '設定・サウンド・言語', trial: 'チャレンジ', trial_gates: 'ゲートを抜けろ', trial_hold: '輪に留まれ', trial_collect: 'オーブを集めろ', trial_combo: '連鎖を保て', trial_protect: '心臓を守れ', trialMet: 'チャレンジ達成', trialMissed: 'チャレンジ失敗', skills: '求めるもの', sk_position: '位置取り', sk_priority: '優先順位', sk_aim: '照準の節約', sk_movement: '機動', sk_risk: 'リスク', whyDied: '倒れた', whyHit: 'ノーダメージの部屋で被弾', whyHeart: '心臓を失った', whyClock: '先に時間切れ', yours: 'あなた', start: 'スタート', tierC: 'クリア', tierD: '部屋を突破', tierF: '倒れるか時間切れ', hitCost: '被弾ごとに1段階下がる', endParts: 'プレイ {play} + 時計を{cut}秒縮めて {time} − 被弾{hits}回で {lost}', downShare: '撃破', yourBest: '自己ベスト', notPlayed: '未プレイ', gDodge: '避けろ', gClear: '全滅させろ', gGates: 'ゲート', gHold: '輪に留まれ', gProtect: '心臓を守れ', gOrder: '順番に', gHunt: '狩れ', gStreak: '連鎖', gCollect: '集めろ', gBoss: 'ボス', gGauntlet: '試練', gEscort: '心臓を送り届けろ', gHills: '輪を順に守れ', whyOrbs: 'オーブを逃しすぎた', mNoGun: '銃なし', mDash: 'ダッシュのみ', mAmmo: '弾', mFaster: '加速', mMoving: '動く床', hits: '被弾', timeUp: '時間切れ', timeUpSub: '時計が尽きた', teaches: '教える', roomLocked: 'ロック中', grade: '評価', rooms: '部屋', worldLocked: '前のワールドをクリア', tierFScore: 'C未満、倒れるか時間切れ', whyScore: 'クリアしたがCライン未満', pts: '点', mBank: 'バンク — 点数はヒートが冷めるまでポットに貯まる。被弾でポットを失う', mCold: 'コールドガン — 撃つたびにヒートが下がる', mWhite: '白熱 — ヒートは×8を超えて×16まで上がる。倒し続け、被弾するな', record: 'プレイ記録', recordSub: '部屋とランの記録をコピーして、メッセージに貼り付け', recordCopied: 'コピーしました — メッセージに貼り付けて', recordShared: '共有しました', recordSaved: 'ファイルに保存しました', recordEmpty: 'まだ記録なし：まず部屋かランを遊んで', recordPhone: '前回：{hz} Hz・遅延フレーム {late}%', recordSlow: '・速度 {sim}倍', heatHint: '近くで素早く倒すと×が上がる。被弾で冷める', banked: 'バンク', potLost: 'ポット喪失', livesBack: 'ライフ回復', lifeBack: 'ライフ回復', campDone: 'キャンペーン制覇', hardDone: 'HARD PAIN 制覇', campDoneSub: '36部屋すべて突破', hardDoneSub: '36部屋すべて、残骸が撃ち返す中を突破', campDoneNext: '次はHARD PAIN：同じ部屋で、倒した敵がすべて撃ち返す', allS: 'すべての部屋でS', sToGo: 'まだSに届かない部屋', total: '合計', daily: 'デイリー', dailySub: '今日は誰でも同じウェーブ', dailyBest: '今日のベスト', tries: '挑戦回数', share: '共有', shareSub: '今日のスコアをメッセージに貼り付け', preview: 'プレビュー — 36部屋すべてを突破すると表示される画面',
    best: 'ベスト', hard: 'ハード', on: 'オン', off: 'オフ', hardSub: 'アーケードはHARDCADEに、キャンペーンはHARD PAINに：残骸が撃ち返す', campaignHard: '同じ部屋で、倒した敵がすべて撃ち返す — 通常でクリアした部屋がここで開く', hardTag: 'ハード', options: '設定', restart: 'リスタート', optionsSub: 'ダッシュ・ゼリー・ワールド・サウンド・言語', back: '戻る', nextRun: '次のプレイから', resume: '再開', quit: 'やめる', again: 'もう一度', retry: 'リトライ', toNext: '{g}まであと{n}点', menu: 'メニュー', paused: '一時停止',
    over: 'ゲームオーバー', gotyou: 'やられた相手', lastHit: '最後に当てた相手', lastShot: '最後の一発', itsStrand: 'その糸', itsSlam: 'その叩きつけ', by_curtain: 'カーテン', by_sweep: 'なぎ払いの列', time: 'タイム', newbest: '新記録', soon: '近日',
    wave: 'ウェーブ', clear: 'クリア', curtain: 'カーテン！', pod: 'ポッド', podUp: 'ポッド LV2！', podDown: 'ポッドが LV1 に', soundOn: 'サウンド オン', volume: '音量', music: '音楽', annOn: 'アナウンサー オン', annOff: 'アナウンサー オフ', arcadeShort: '9つのワールド、ライフ3つ', hardcadeShort: '9つのワールド、残骸が撃ち返す', campShort: '36の部屋、それぞれに制限時間', campHardShort: '同じ部屋、残骸が撃ち返す', startAt: '開始ワールド', dailyShort: '今日のウェーブ、誰でも同じ', setAnn: 'アナウンサー', setIntro: 'イントロボイス', setMotion: '手ぶれ軽減', setHand: '移動', handL: '右の親指', handR: '左の親指', setStick: 'スティックの大きさ', setLang: '言語', langVal: '日本語', grpSound: 'サウンド', grpControls: '操作', grpGeneral: '一般', introOn: 'イントロボイス オン', introOff: 'イントロボイス オフ', annVol: 'アナウンサー音量', motionOn: '手ぶれ軽減 オン', motionOff: '手ぶれ軽減 オフ', motionOnH: 'カメラ揺れなし', motionOffH: '画面揺れ演出あり', cont: 'つづきから', contSub: '入口から再開：', fromWorld: 'ワールドから開始', fromStart: '最初から', fromSub: 'スコアは通常のベストとは別に記録', bestHere: 'ここからのベスト', handLeft: '左利き', handRight: '右利き', handH: '左の親指で狙い、右で移動', handHR: '左の親指で移動、右で狙う', stick: 'スティック', dead: 'デッドゾーン', szSmall: '小', szNormal: '標準', szLarge: '大', stickH: '全速になるまでの親指の移動量', deadH: '撃ち始めるまでの親指の移動量', autoOn: '自動画質 オン', autoOff: '自動画質 オフ', autoH: '遅い端末では画面を小さく描く・現在 {q}', records: '記録', recordsSub: 'ベストと最近のプレイ', recBests: 'ベスト', recRuns: '最近のプレイ', recRooms: '部屋クリア', recNone: 'まだ記録なし：まず部屋かランを遊んで', recWon: '完走', recQuit: '中断', recWorld: 'W', recReached: '到達', langName: '言語 · 日本語', gooOn: 'しぶき オン', gooOff: 'しぶき オフ', soundOff: 'サウンド オフ', score: 'スコア', kills: '撃破', grazes: 'グレイズ',
    greenRush: 'グリーンラッシュ！賞品2倍', threaded: '三つ抜け！', fuseBurst: 'ヒューズ！', dud: 'ハズレ！緑で行け', dashThrough: 'ダッシュで抜けろ！', stepOut: '輪から出ろ！', clearLane: 'レーンから離れろ！', gateChain: 'ゲートチェーン', bounty: '賞金首',
    world1: 'ワールド1 · グリッド', worldClear: 'ワールドクリア', nextWorld: '次', bossOf: 'ボス', world2: 'ワールド2 · ドライブウェイ', world3: 'ワールド3 · 下水道', world4: 'ワールド4 · 貯水槽', world5: 'ワールド5 · ボイラー室', world6: 'ワールド6 · 川', world7: 'ワールド7 · 氷原', world8: 'ワールド8 · 深淵', world9: 'ワールド9 · コア', won: 'ラン完走', wonSub: '9ワールドすべて',
    dashUp: 'ダッシュ強化', dashDown: 'ダッシュが LV1 に', fxInv: '無敵', fxRapid: '連射', fxMult: 'スコア', fxDash: 'ダッシュ',
    hintTouch: '左手で移動 · 右手でエイムと射撃 · 離してダッシュ', hintTouchFlick: '左手で移動 · 右手でエイムと射撃 · はじいてダッシュ',
    hintKeys: 'WASDで移動 · マウスでエイム · クリック長押しで射撃 · スペースでダッシュ · ESCで一時停止',
    hintPad: '左スティックで移動 · 右スティックでエイムと射撃 · Aでダッシュ · STARTで一時停止',
    gels: 'ゼリー', worlds: 'ワールド', street: 'ストリート', neon: 'ネオン', streetSub: 'ドライブウェイ、そして下水道', neonSub: '抽象の六角、そして潮流', classic: 'クラシック', sdf: 'SDF', classicSub: 'いつものメッシュ', sdfSub: 'レイマーチの距離場',
    style: 'スタイル', physical: 'フィジカル', cel: 'セルシェード', watercolor: '水彩', physicalSub: '光を曲げるゼリー', celSub: 'フラットな階調と輪郭線', watercolorSub: '顔料、縁は濃く',
    lens: 'レンズ', tilt: 'ティルトシフト', none: 'なし', tiltSub: 'ミニチュア：遊ぶ場所だけくっきり', noneSub: 'すべてくっきり',
  },
  fi: {
    intro: 'INTRO', introSub: 'katso alku, sitten pelaa',
    dash: 'SYÖKSY', push: 'TÖNÄISY', pushSub: 'tönäisee geelit sivuun', cut: 'VIILTO', cutSub: 'läpi, ja se satuttaa', gelHp: 'GEELIN KESTO', gelHpSub: 'sitkeämmät geelit, samat pisteet',
    pass: 'LÄPI', passSub: '1.x:n tapa: suoraan niiden läpi, koskematta', dashBy: 'SYÖKSYN LAUKAISU', lift: 'NOSTO', liftSub: '1.x:n tapa: nosta oikea peukalo, syöksyt kulkusuuntaan', flick: 'SIPAISU', flickSub: 'sipaise oikealla peukalolla: sipaisun suuntaan, sen mitan verran',
    arcade: 'Yhdeksän maailman aallot: kolme elämää, jokainen kaato maksaa lämpösi × verran.', hardcade: 'Jyrkempi arcade: purijoiden raadot ampuvat, ja joka maailmasta palaa yksi elämä.', survival: 'Loputon. Pahenee vain.', campaign: 'huoneita omalla kellollaan — läpäisy avaa seuraavan', goalSurvive: 'SELVIYDY', goalQuota: 'KAADA', goalFlawless: 'EI OSUMIA', bossDown: 'KAATUI', holdOut: 'KESTÄ', kEndure: 'KESTÄ LOPPUUN', kRead: 'ETSI AUKKO', shift_breathe: 'RANNAT HENGITTÄVÄT', shift_floe: 'JÄÄ LOHKEAA', shift_twins: 'LATTIA HALKEAA KAHTIA', menuBtn: 'VALIKKO', menuSub: 'asetukset, ääni, kieli', trial: 'HAASTE', trial_gates: 'SYÖKSY PORTEISTA', trial_hold: 'PIDÄ RENGAS', trial_collect: 'KERÄÄ PALLOT', trial_combo: 'PIDÄ PUTKI', trial_protect: 'SUOJAA SYDÄN', trialMet: 'HAASTE SUORITETTU', trialMissed: 'HAASTE JÄI', skills: 'vaatii', sk_position: 'sijoittuminen', sk_priority: 'kohteiden järjestys', sk_aim: 'tähtäyksen säästö', sk_movement: 'liike', sk_risk: 'riski', whyDied: 'kaaduit', whyHit: 'osuma huoneessa ilman osumia', whyHeart: 'sydän menetettiin', whyClock: 'kello loppui ensin', yours: 'sinun', start: 'ALOITA', tierC: 'läpäisy', tierD: 'huoneen läpi', tierF: 'kuolema tai kello', hitCost: 'jokainen osuma vie arvosanan', endParts: '{play} peli + {time} kellon {cut} s lyhennyksestä − {lost} {hits} osumasta', downShare: 'kaadettu', yourBest: 'paras', notPlayed: 'ei vielä pelattu', gDodge: 'VÄISTÄ', gClear: 'KAADA KAIKKI', gGates: 'PORTIT', gHold: 'PIDÄ RENGAS', gProtect: 'SUOJAA SYDÄN', gOrder: 'JÄRJESTYKSESSÄ', gHunt: 'METSÄSTÄ', gStreak: 'PUTKI', gCollect: 'KERÄÄ', gBoss: 'POMO', gGauntlet: 'KUJANJUOKSU', gEscort: 'SAATA SYDÄN', gHills: 'PIDÄ RENKAAT', whyOrbs: 'liian moni pallo sammui', mNoGun: 'EI ASETTA', mDash: 'VAIN SYÖKSY', mAmmo: 'AMMUKSET', mFaster: 'KIIHTYY', mMoving: 'LIIKKUVA LATTIA', hits: 'osumaa', timeUp: 'AIKA', timeUpSub: 'kello loppui', teaches: 'opettaa', roomLocked: 'LUKITTU', grade: 'ARVOSANA', rooms: 'HUONEET', worldLocked: 'läpäise edellinen maailma', tierFScore: 'alle C, kuolema tai kello', whyScore: 'läpi, mutta alle C-rajan', pts: 'p', mBank: 'PANKKI — pisteet odottavat potissa, kunnes lämpö laskee; osuma vie potin', mCold: 'KYLMÄ ASE — jokainen laukaus viilentää lämpöä', mWhite: 'VALKOHEHKU — lämpö nousee yli ×8:n ×16:een asti; kaada koko ajan, älä ota osumaa', record: 'PELIHISTORIA', recordSub: 'kopioi huoneesi ja pelisi viestiin liitettäväksi', recordCopied: 'KOPIOITU — liitä se viestiin', recordShared: 'JAETTU', recordSaved: 'TALLENNETTU TIEDOSTOKSI', recordEmpty: 'ei vielä mitään: pelaa ensin huone tai kierros', recordPhone: 'viime peli: {hz} Hz · {late} % ruuduista myöhässä', recordSlow: ' · peli {sim}×', heatHint: 'kaada läheltä ja nopeasti, niin × lämpenee; osuma viilentää', banked: 'PANKKIIN', potLost: 'POTTI MENI', livesBack: 'ELÄMÄT TAKAISIN', lifeBack: 'ELÄMÄ TAKAISIN', campDone: 'KAMPANJA LÄPI', hardDone: 'HARD PAIN LÄPI', campDoneSub: 'kaikki kolmekymmentäkuusi huonetta läpi', hardDoneSub: 'kaikki kolmekymmentäkuusi, ja jokainen raato ampui takaisin', campDoneNext: 'seuraavaksi HARD PAIN: samat huoneet, ja jokainen raato ampuu takaisin', allS: 'jokainen huone S', sToGo: 'huonetta vielä alle S:n', total: 'yhteensä', daily: 'PÄIVÄN HAASTE', dailySub: 'samat aallot kaikille tänään', dailyBest: 'PÄIVÄN PARAS', tries: 'YRITYKSET', share: 'JAA', shareSub: 'päivän pisteet viestiin liitettäväksi', preview: 'ESIKATSELU — tämän näet, kun kaikki huoneet on läpi',
    best: 'ENNÄTYS', hard: 'VAIKEA', on: 'PÄÄLLÄ', off: 'POIS', hardSub: 'arcadesta tulee HARDCADE ja kampanjasta HARD PAIN: raadot ampuvat takaisin', campaignHard: 'samat huoneet, ja jokainen raato ampuu takaisin — läpäise huone ensin tavallisena', hardTag: 'VAIKEA', options: 'ASETUKSET', restart: 'ALOITA ALUSTA', optionsSub: 'syöksy, geelit, maailmat, ääni, kieli', back: 'TAKAISIN', nextRun: 'seuraavasta pelistä', resume: 'JATKA', quit: 'LOPETA', again: 'UUDESTAAN', retry: 'YRITÄ UUDESTAAN', toNext: '+{n} → {g}', menu: 'VALIKKO', paused: 'TAUKO',
    over: 'PELI OHI', gotyou: 'KAATAJA', lastHit: 'VIIMEKSI OSUI', lastShot: 'SEN VIIMEINEN LAUKAUS', itsStrand: 'SEN SÄIE', itsSlam: 'SEN ISKU', by_curtain: 'VERHO', by_sweep: 'PYYHKÄISEVÄ RIVI', time: 'AIKA', newbest: 'UUSI ENNÄTYS', soon: 'TULOSSA',
    wave: 'AALTO', clear: 'TYHJÄ', curtain: 'VERHO!', pod: 'KAPSELI', podUp: 'KAPSELI LV2!', podDown: 'KAPSELI PUTOSI LV1:EEN', soundOn: 'ÄÄNI PÄÄLLÄ', volume: 'ÄÄNENVOIMAKKUUS', music: 'MUSIIKKI', annOn: 'SELOSTAJA PÄÄLLÄ', annOff: 'SELOSTAJA POIS', arcadeShort: 'Yhdeksän maailmaa, kolme elämää', hardcadeShort: 'Yhdeksän maailmaa, raadot ampuvat', campShort: '36 huonetta, jokaisella oma kello', campHardShort: 'Samat huoneet, raadot ampuvat', startAt: 'ALOITUS', dailyShort: 'Päivän aallot, samat kaikille', setAnn: 'SELOSTAJA', setIntro: 'ALKUHUUTO', setMotion: 'VÄHENNÄ LIIKETTÄ', setHand: 'LIIKKUMINEN', handL: 'OIKEA PEUKALO', handR: 'VASEN PEUKALO', setStick: 'TATIN KOKO', setLang: 'KIELI', langVal: 'SUOMI', grpSound: 'ÄÄNI', grpControls: 'OHJAUS', grpGeneral: 'YLEISET', introOn: 'ALKUHUUTO PÄÄLLÄ', introOff: 'ALKUHUUTO POIS', annVol: 'SELOSTAJAN ÄÄNI', motionOn: 'VÄHENNÄ LIIKETTÄ PÄÄLLÄ', motionOff: 'VÄHENNÄ LIIKETTÄ POIS', motionOnH: 'ei kameran tärinää', motionOffH: 'täysi ruudun tärinä', cont: 'JATKA', contSub: 'ovelta:', fromWorld: 'MAAILMASTA', fromStart: 'alusta', fromSub: 'pisteet pidetään erillään oikeasta ennätyksestä', bestHere: 'ennätys täältä', handLeft: 'VASENKÄTINEN', handRight: 'OIKEAKÄTINEN', handH: 'vasen peukalo tähtää, oikea liikkuu', handHR: 'vasen peukalo liikkuu, oikea tähtää', stick: 'TATTI', dead: 'KUOLLUT ALUE', szSmall: 'PIENI', szNormal: 'TAVALLINEN', szLarge: 'SUURI', stickH: 'kuinka pitkälle peukalo liikkuu täyteen vauhtiin', deadH: 'kuinka pitkälle tähtäyspeukalo liikkuu ennen kuin se ampuu', autoOn: 'AUTOMAATTINEN LAATU PÄÄLLÄ', autoOff: 'AUTOMAATTINEN LAATU POIS', autoH: 'hidas puhelin saa pienemmän kuvan · nyt {q}', records: 'ENNÄTYKSET', recordsSub: 'ennätyksesi ja viime pelisi', recBests: 'ENNÄTYKSET', recRuns: 'VIIME PELIT', recRooms: 'huonetta läpi', recNone: 'ei vielä mitään: pelaa ensin huone tai kierros', recWon: 'LÄPI', recQuit: 'kesken', recWorld: 'M', recReached: 'saavutettu', langName: 'KIELI · SUOMI', gooOn: 'ROISKEET PÄÄLLÄ', gooOff: 'ROISKEET POIS', soundOff: 'ÄÄNI POIS', score: 'PISTEET', kills: 'KAATOJA', grazes: 'HIPAISUJA',
    greenRush: 'VIHREÄ RYNTÄYS! TUPLAPALKINTO', threaded: 'PUJOTETTU! KAIKKI KOLME', fuseBurst: 'SYTYTIN!', dud: 'SUUTARI! VIHREÄLLÄ MENNÄÄN', dashThrough: 'SYÖKSY LÄPI!', stepOut: 'ULOS RENKAASTA!', clearLane: 'POIS KAISTALTA!', gateChain: 'PORTTIKETJU', bounty: 'PALKKIO',
    world1: 'MAAILMA 1 · RUUDUKKO', worldClear: 'MAAILMA LÄPI', nextWorld: 'SEURAAVA', bossOf: 'POMO', world2: 'MAAILMA 2 · PIHATIE', world3: 'MAAILMA 3 · VIEMÄRI', world4: 'MAAILMA 4 · VESISÄILIÖ', world5: 'MAAILMA 5 · KATTILAHUONE', world6: 'MAAILMA 6 · JOKI', world7: 'MAAILMA 7 · JÄÄKENTTÄ', world8: 'MAAILMA 8 · SYVYYS', world9: 'MAAILMA 9 · YDIN', won: 'LÄPI PELATTU', wonSub: 'kaikki yhdeksän maailmaa',
    dashUp: 'SYÖKSY PARANI', dashDown: 'SYÖKSY PUTOSI LV1:EEN', fxInv: 'KUOLEMATON', fxRapid: 'PIKATULI', fxMult: 'PISTEET', fxDash: 'SYÖKSY',
    hintTouch: 'VASEN PEUKALO LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · NOSTA SE SYÖKSYÄKSESI', hintTouchFlick: 'VASEN PEUKALO LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · SIPAISE SYÖKSYÄKSESI',
    hintKeys: 'WASD LIIKKUU · HIIRI TÄHTÄÄ · PIDÄ PAINIKE POHJASSA AMPUAKSESI · VÄLILYÖNTI SYÖKSYY · ESC TAUKO',
    hintPad: 'VASEN TATTI LIIKKUU · OIKEA TÄHTÄÄ JA AMPUU · A SYÖKSYY · START TAUKO',
    gels: 'GEELIT', worlds: 'MAAILMAT', street: 'KATU', neon: 'NEON', streetSub: 'pihatie, sitten viemäri', neonSub: 'abstrakti kenno, sitten virta', classic: 'KLASSINEN', sdf: 'SDF', classicSub: 'tavalliset verkkogeelit', sdfSub: 'säteenmarssatut kentät',
    style: 'TYYLI', physical: 'FYSIKAALINEN', cel: 'CEL-VARJOSTUS', watercolor: 'AKVARELLI', physicalSub: 'valoa taittava hyytelö', celSub: 'tasaiset sävyt ja tussiviiva', watercolorSub: 'pigmenttiä, tummat reunat',
    lens: 'LINSSI', tilt: 'TILT-SHIFT', none: 'EI', tiltSub: 'pienoismalli: terävä siellä missä pelaat', noneSub: 'kaikki terävää',
  },
};
// the language: the one picked in OPTIONS (toko2.lang), else the browser's
export const LANGS = ['en', 'fi', 'ja'];
const pickLang = () => { let l = ''; try { l = localStorage.getItem('toko2.lang') || ''; } catch { /* private mode */ }
  if (!STR[l]) l = (navigator.language || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };
let lang = pickLang();
export const getLang = () => lang;
export function setLang(l) { if (!STR[l]) return; lang = l; try { localStorage.setItem('toko2.lang', l); } catch { /* private mode */ } document.documentElement.lang = l; }
export const t = (k) => STR[lang][k] ?? STR.en[k] ?? k;
// what a campaign room asks, in the words the list and the HUD use (1.x goalLabel)
// (sim/challenge.js): the goal, then what the room takes away. `r` carries its level when there is one.
export function goalText(r) {
  const g = goalOf(r), m = modsOf(r), L = r.level;
  const kind = g.kind ? TUNING.species[speciesOf(g.kind)]?.name : '';
  const head = {
    survive: g.metric === 'hits' ? t('gDodge') : t('goalSurvive'), quota: `${t('goalQuota')} ${g.kills}`, clear: t('gClear'),
    gates: `${t('gGates')} ${L?.gates?.length ?? ''}`, hold: t('gHold'), protect: t('gProtect'), order: t('gOrder'),
    hunt: `${t('gHunt')} ${kind}`, combo: `${t('gStreak')} ${g.streak}`, collect: `${t('gCollect')} ${g.need ?? g.orbs?.length ?? ''}`,
    boss: t('gBoss'), gauntlet: t('gGauntlet'), escort: t('gEscort'), hills: `${t('gHills')} ${g.zones?.length ?? ''}`,
  }[g.type] ?? t('goalSurvive');
  const tail = [m.flawless && t('goalFlawless'), m.dash && m.noGun ? t('mDash') : m.noGun && t('mNoGun'), m.ammo && `${t('mAmmo')} ${m.ammo}`,
    m.escalate && t('mFaster'), (L?.arena?.shapes ?? []).some((p) => p.orbit || p.pulse) && t('mMoving')].filter(Boolean);
  return [head.trim(), ...tail].join(' · ');
}
// the room's progress, for the HUD: the goal's count and what is left
export function goalProgress(w) {
  const ch = w.ch, g = ch?.goal;
  if (!g) return goalText(w.room);
  const n = Math.floor(ch.n + 1e-9), of = ch.of;
  const head = {
    survive: g.metric === 'hits' ? `${t('gDodge')} · ${w.hits || 0} ${t('hits')}` : t('goalSurvive'),
    quota: `${t('goalQuota')} ${Math.min(w.kills, g.kills)}/${g.kills}`, clear: t('gClear'), gates: `${t('gGates')} ${n}/${of}`,
    hold: `${t('gHold')} ${Math.round((100 * ch.n) / of)}%`, protect: `${t('gProtect')} ${Math.max(0, ch.heart?.hp ?? 0)}/${ch.heart?.max ?? 0}`,
    order: `${t('gOrder')} ${n}/${of}`, hunt: `${t('gHunt')} ${n}/${of}`, combo: `${t('gStreak')} ${ch.arcade ? n : Math.max(w.streak, 0)}/${of}`,
    collect: `${t('gCollect')} ${n}/${of}`, boss: t('gBoss'), gauntlet: `${t('gGauntlet')} ${Math.max(1, ch.stage + 1)}/${ch.stages?.length ?? 1}`,
    escort: `${t('gEscort')} ${Math.max(0, ch.heart?.hp ?? 0)}/${ch.heart?.max ?? 0}`,
    hills: `${t('gHills')} ${Math.min(of, (ch.zi ?? 0) + 1)}/${of} · ${Math.round(100 * Math.min(1, (ch.zone?.fill ?? 0) / (g.need || 1)))}%`,
  }[g.type] ?? t('goalSurvive');
  const ammo = w.gun && w.gun.ammo !== Infinity ? ` · ${t('mAmmo')} ${w.gun.ammo}` : '';
  return `${ch.mods.flawless ? `${t('goalFlawless')} · ` : ''}${head}${ammo}`;
}

// a score as it reads on a line or the HUD (v51)
const pts = (v) => Math.round(v ?? 0).toLocaleString('en-US');
// v155: the grade above a room's result and the points it still needed — only when the points decided it
// (an F for dying, a hit or the clock is not a matter of points); null at S or with no lines
export function nextGrade(room) {
  const H = room?.level ? tiersFor(room, room.level) : null, order = ['F', 'D', 'C', 'B', 'A', 'S'];
  if (!H || room.value == null || room.grade === 'S') return null;
  if (room.grade === 'F') return null;   // (v157: an F is a run that did not get through, never a matter of points)
  const g = order[order.indexOf(room.grade) + 1];
  const need = Math.ceil(H[g] - room.value);
  return g && need > 0 ? { grade: g, need } : null;
}
// a room's score mutators (sim/heat.js) and the line its card says about each
const MUTATOR_KEY = { bank: 'mBank', coldgun: 'mCold', white: 'mWhite' };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// The modes the title offers, top to bottom. SURVIVAL was off it from v17
// (owner, 2026-10-22: "forget survival for now") and is back from v20, its
// floor changing size as you play (owner, 2026-10-23: "like Sektori").
// the title's modes (owner, 2026-10-23): ARCADE, with a HARD switch that
// turns it into HARDCADE, and the CAMPAIGN. SURVIVAL still runs (main.js
// MODES) but is off the title for now
const TITLE_MODES = ['arcade'];

// run time as m:ss
// a boss by the name its fight goes by: the prisms come as a pair (sim/bossfight.js)
export const bossName = (kind) => (kind === 'prism' ? 'TWIN PRISMS' : TUNING.species[kind]?.name ?? kind.toUpperCase());

export function timeText(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.screen = 'none';   // v125: the panel up (hide() and each panel set it)
    document.documentElement.lang = lang;
    this.hudEl = document.getElementById('hud');
    this.scoreEl = document.getElementById('score');
    this.multEl = document.getElementById('mult');
    this.heatEl = document.getElementById('heat');
    this.potEl = document.getElementById('pot');
    this.livesEl = document.getElementById('lives');
    this.clockEl = document.getElementById('clock');
    this.bossBarEl = document.getElementById('bossbar');
    this.fxEl = document.getElementById('fx');
    this.menuEl = document.getElementById('menu');
    this.bannerEl = document.getElementById('banner');
    this.cardEl = document.getElementById('card');   // v109: a boss's name as it comes in, WORLD CLEAR as it goes
    this.vignetteEl = document.getElementById('vignette');
    this.sticks = document.getElementById('sticks');
    this.sctx = this.sticks.getContext('2d');
    this.pauseBtn = document.getElementById('pausebtn');
    this.pauseBtn.addEventListener('click', () => this.h.onPause());
    this.focusIndex = 0;
    this._padPrev = {};
    this._bannerT = 0;
    addEventListener('keydown', (e) => this._menuKey(e));
  }

  // HEAT (v52): the × pops as it climbs a level; a hit that throws it away flashes it cold
  heatPop(m, cold = false) {
    const el2 = this.multEl;
    if (!el2) return;
    if (cold) { el2.textContent = '×1'; this._mult = '×1'; }
    el2.classList.remove('pop', 'cold'); void el2.offsetWidth; el2.classList.add(cold ? 'cold' : 'pop');
  }
  // the HUD; the MENU button on it is always there while you play, in the language you play in
  setHud(visible) {
    const was = !this.hudEl.hidden;
    this.hudEl.hidden = !visible;
    // v121: what a run said over itself (a wave's banner, a boss's card) goes when the HUD comes or goes — a run started,
    // ended or left. The banner and the card count down by frames, so one up as a run ended rode on into the results
    // and the next run (a boss's card over the next world's banner). Only on a change: the intro sets the HUD a frame
    if (was !== !!visible) {
      this.bannerEl.hidden = true; this._bannerT = 0;
      if (this.cardEl) { this.cardEl.hidden = true; this._cardT = 0; }
    }
    if (visible && this.pauseBtn) { this.pauseBtn.textContent = `≡ ${t('menuBtn')}`; this.pauseBtn.setAttribute('aria-label', t('menuBtn')); }
  }

  hud(w) {
    this.scoreEl.textContent = w.score.toLocaleString('en-US');
    // HEAT (v51): the × every point is paid at, a bar for how far into it you
    // are (it drains when you go quiet), and BANK's unbanked pot
    const m = heatMult(w), into = Math.max(0, Math.min(1, (w.heat || 0) - (m - 1)));
    const mt = m > 1 || w.heat > 0 ? `×${m}` : '';
    // past ×8 (a WHITE HEAT room, v60) the × and its bar burn white: `w` in the page's styles
    const dm = m > TUNING.heat.levels ? 'w' : String(m);
    if (this._mult !== mt) { this._mult = mt; this.multEl.textContent = mt; this.multEl.dataset.m = dm; }
    if (this.heatEl) { this.heatEl.hidden = !(w.heat > 0); this.heatEl.firstElementChild.style.width = `${(into * 100).toFixed(0)}%`; this.heatEl.dataset.m = dm; }
    if (this.potEl) { const pt = w.pot > 0 ? `+${pts(w.pot)}` : ''; if (this.potEl.textContent !== pt) this.potEl.textContent = pt; }
    if (this._lives !== w.hero.lives) {
      this._lives = w.hero.lives;
      this.livesEl.replaceChildren(...Array.from({ length: Math.max(0, w.hero.lives) }, () => el('i')));
    }
    // a campaign room's clock is its goal and the seconds it has left (1.x v265)
    if (w.room && w.dir) {
      const left = Math.max(0, Math.ceil(w.dir.duration - w.dir.t));
      // and the grade it is on course for: for a timed room, how long that line has left
      const k = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.ceil(v)));
      const oc = onCourse(w), tag = oc ? `${oc.grade}${oc.next ? ` → ${oc.next} ${k(oc.need)}` : ''}` : '';
      // v121: two lines, the goal over its seconds and grade, the second kept whole — one line wrapped on a phone
      // wherever the width ran out, and left "F →" on one line and "C 36k" on the next
      const goal = goalProgress(w), secs = `${left}s`;
      if (this._clockStr !== goal + secs + tag) {
        this._clockStr = goal + secs + tag;
        const g = el('span', 'course', tag);
        g.style.color = oc ? GRADE_COLORS[oc.grade] : '';
        const l2 = el('span', 'ln whole'); l2.append(secs, ...(tag ? [' · ', g] : []));
        this.clockEl.replaceChildren(el('span', 'ln', goal), l2);
      }
    } else if (w.fight && !w.fight.done) {
      // a boss wave on the clock (v42, sim/bossfight.js): the boss, and the grade
      // the fight is on course for with the seconds that line has left
      // (v157: an ENDURANCE boss shows its clock, HOLD OUT 23s, and the grade its hits so far are on)
      const oc = fightCourse(w), tag = !oc ? '' : oc.hold ? `${oc.grade} · ${t('holdOut')} ${Math.ceil(oc.left)}s` : `${oc.grade}${oc.left != null ? ` ${Math.ceil(oc.left)}s` : ''}`;
      const str = bossName(w.fight.kind);
      if (this._clockStr !== str + tag) {
        this._clockStr = str + tag;
        const g = el('span', 'course', tag);
        g.style.color = oc ? GRADE_COLORS[oc.grade] : '';
        this.clockEl.replaceChildren(str, ...(tag ? [' · ', g] : []));
      }
    } else if (w.ch?.arcade) {
      // an arcade challenge wave (v36): the run's clock, and under it the goal's count and the challenge's seconds
      // (v121: on a line of their own, kept whole)
      const run = timeText(w.time), ch = `${goalProgress(w)} · ${Math.max(0, Math.ceil(w.ch.limit - w.ch.t))}s`;
      if (this._clockStr !== run + ch) { this._clockStr = run + ch; this.clockEl.replaceChildren(el('span', 'ln', run), el('span', 'ln whole', ch)); }
    } else { this._clockStr = null; this.clockEl.textContent = timeText(w.time); }
    // and under the clock, the boss's health: every boss of the wave in one bar, in its colour
    const F = w.fight, bar = !!(F && !F.done && F.max > 0);
    if (this.bossBarEl) {
      this.bossBarEl.hidden = !bar;
      if (bar) {
        const k = Math.max(0, Math.min(1, F.hp / F.max)), fill = this.bossBarEl.firstElementChild;
        if (fill) { fill.style.width = `${(k * 100).toFixed(1)}%`; fill.style.background = `#${(TUNING.species[F.kind]?.barColor ?? TUNING.species[F.kind]?.color ?? 0xff5566).toString(16).padStart(6, '0')}`; }
      }
    }
    this._effects(w);
  }

  // What the pickups have given you, under the lives: the pod and the dash
  // you hold (1.x's [S LV2], main.js:5826-5838), and every timer still
  // running — ★ invincible, » rapid fire, ×2 score (1.x showed the ×2 and its
  // bar, main.js:5805-5815, 5850-5857), to a tenth of a second.
  _effects(w) {
    if (!this.fxEl) return;
    const h = w.hero, P = TUNING.pickups, chips = [];
    // 1.x's bracketed weapon chip, [B] or [S LV2] (main.js:5834)
    if (h.weapon) chips.push([`[${P.podGlyph[h.weapon.fam]}${h.weapon.level >= 2 ? ' LV2' : ''}]`, TUNING.hero.weapons[h.weapon.fam].color[h.weapon.level >= 2 ? 1 : 0]]);
    if (h.dashLevel > 0) chips.push([`${t('fxDash')} LV${h.dashLevel}`, P.colors.dash]);
    if (h.invinc > 0) chips.push([`${P.glyphs.invincible} ${t('fxInv')} ${h.invinc.toFixed(1)}`, P.colors.invincible]);
    if (h.rapid > 0) chips.push([`${P.glyphs.firerate} ${t('fxRapid')} ${h.rapid.toFixed(1)}`, P.colors.firerate]);
    if (w.pk?.multT > 0) chips.push([`${P.glyphs.scoremult} ${t('fxMult')} ${w.pk.multT.toFixed(1)}`, P.colors.scoremult]);
    const key = chips.map((c) => c[0]).join('|');
    if (key === this._fxKey) return;
    this._fxKey = key;
    this.fxEl.replaceChildren(...chips.map(([text, hex]) => { const e = el('span', null, text); e.style.color = '#' + hex.toString(16).padStart(6, '0'); return e; }));
  }

  banner(text, seconds = 1.6) {
    // v121: the newer word wins: a banner takes the band from a card there, as a card in the band takes it from a banner
    if (this.cardEl && !this.cardEl.hidden && this.cardEl.classList.contains('band')) { this.cardEl.hidden = true; this._cardT = 0; }
    this.bannerEl.textContent = text; this.bannerEl.hidden = false;
    this.bannerEl.classList.remove('pop'); void this.bannerEl.offsetWidth; this.bannerEl.classList.add('pop');
    this._bannerT = seconds;
  }
  // v109: a CARD — a title and a line under it, bigger than a banner: in the banner's band (`band`, over a fight:
  // never the middle of one, owner 2026-10-24), or in the middle of the screen when nothing is being fought (`center`)
  // v154: `side` — all the way on the right, slid in from the edge: WORLD CLEAR and where the run goes next, kept off
  // the middle of the floor so the boss's death plays out under nothing (owner, 2026-11-15). `next` is its third line
  card(title, sub, seconds = 2, where = 'center', next = '') {
    const c = this.cardEl;
    if (!c) return;
    c.querySelector('.t').textContent = title; c.querySelector('.s').textContent = sub ?? '';
    const n = c.querySelector('.n'); if (n) n.textContent = next ?? '';
    c.className = where; c.hidden = false; void c.offsetWidth; c.classList.add('pop');
    this._cardT = seconds;
    if (where === 'band') { this.bannerEl.hidden = true; this._bannerT = 0; }
  }
  tick(dt) {
    if (this._bannerT > 0 && (this._bannerT -= dt) <= 0) this.bannerEl.hidden = true;
    if (this._cardT > 0 && (this._cardT -= dt) <= 0) this.cardEl.hidden = true;
  }
  // 1.x's red screen edge on a hit (main.js:5550-5564), 0.32 s; CSS plays it
  vignette() { const v = this.vignetteEl; if (!v) return; v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); }

  // ── panels ─────────────────────────────────────────────────────
  _panel(children) {
    // v121: a panel over a run (the pause, OPTIONS from it) hides the run's MENU button, which stood over the panel's corner
    this.hudEl?.classList.add('under');
    this.menuEl.classList.remove('hardmode', 'two');
    this.menuEl.replaceChildren(...children);
    this.menuEl.hidden = false;
    this.buttons = [...this.menuEl.querySelectorAll('button')];
    this.focusIndex = 0;
    this._focus();
  }
  // v125 (the state audit): `screen` — which panel is up ('title', 'rooms', 'room', 'options', 'records', 'pause',
  // 'results', 'ending', 'none'), set by each panel as it draws. What main.js redraws on a switch, what Start and P
  // do in a pause, and what a test or an agent reads (`__toko.machines.screen`) instead of a heading's English text
  hide() { this.menuEl.hidden = true; this.buttons = []; this.hudEl?.classList.remove('under'); this.screen = 'none'; }
  _button(label, sub, fn, disabled = false) {
    const b = el('button', 'item');
    if (disabled) { b.classList.add('off'); b.setAttribute('aria-disabled', 'true'); }
    b.append(el('span', 'label', label));
    if (sub) b.append(el('span', 'sub', sub));
    b.addEventListener('click', () => { if (!disabled) fn(); });
    b.addEventListener('pointerenter', () => { this.focusIndex = this.buttons.indexOf(b); this._focus(); });
    return b;
  }
  _focus() {
    (this.buttons || []).forEach((b, i) => b.classList.toggle('focus', i === this.focusIndex));
    this.buttons?.[this.focusIndex]?.scrollIntoView?.({ block: 'nearest' });
  }

  // `keep` holds the focus where it was (on OPTIONS, coming back from it).
  title(best, sound, source, test = { dash: 'pass', hp: 1, by: 'lift' }, keep = false) {
    const prev = this.focusIndex;
    const logo = el('div', 'logo'); logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', 'TOKO DROP');   // v89: the icon's logo (index.html --logo), no numeral
    const hint = el('p', 'hint', t(source === 'pad' ? 'hintPad' : source === 'keys' ? 'hintKeys' : test?.by === 'flick' ? 'hintTouchFlick' : 'hintTouch'));
    const fmt = (v) => (v ? `${t('best')} ${v.toLocaleString('en-US')}` : '');
    // the start screen (owner, 2026-10-27): two big buttons, ARCADE and
    // CAMPAIGN, a small HARD switch between them, and a small MENU under them.
    // HARD turns them into HARDCADE and HARD PAIN, and the screen goes red.
    // Every setting is behind MENU; the intro film is not here (?intro still
    // plays it, for a look check)
    // v156 (owner, 19 Nov: the start menu is "a bit" messy): six boxes in six sizes and alignments became one
    // family. The order is the owner's (v89): ARCADE, HARD under it, CAMPAIGN. The modes (ARCADE, CAMPAIGN; CONTINUE,
    // DAILY) are the same full-width boxes with one short line each; what changes ARCADE (HARD, and START AT, which
    // was FROM WORLD) are rows like SETTINGS', its name left and its switch or value right; SETTINGS is a row last.
    // A phone held sideways keeps v89's two columns: how you play on the left, CONTINUE, DAILY and SETTINGS right
    const startRow = el('div', 'stack');
    const hard = !!this.h.hard?.(), m = hard ? 'hardcade' : 'arcade';
    // HARD is a switch, drawn as one (owner, 2026-10-26: "like an actual toggle"): a track and a knob, lit red when
    // on. The title is rebuilt on every flip, so the knob's slide is a keyframe from the side it was on
    const hardBtn = this._setting(t('hard'), '', () => this.h.onHard?.());
    hardBtn.classList.add('hard'); hardBtn.querySelector('.val').remove();
    hardBtn.setAttribute('role', 'switch'); hardBtn.setAttribute('aria-checked', String(hard)); hardBtn.title = t('hardSub');
    const sw = el('span', `switch${hard ? ' on' : ''}${this._hardWas !== undefined && this._hardWas !== hard ? ' flip' : ''}`);
    sw.setAttribute('aria-hidden', 'true'); sw.append(el('span', 'knob'));
    hardBtn.append(sw); this._hardWas = hard;
    // v85: a run set to start at a later world; v156: START AT, a row, its world on the right, a tap moving it on
    const sa = this.h.startAtInfo?.() ?? { at: 1, reached: 1, bestFrom: 0 };
    const worldName = (n) => t(`world${n}`).split(' · ')[0];
    const startBtn = sa.reached > 1 ? this._setting(t('startAt'), worldName(sa.at), () => this.h.onStartAt?.()) : null;
    const line = (txt, b) => [txt, b].filter(Boolean).join(' · ');
    const arcadeBtn = this._button(m.toUpperCase(), line(t(`${m}Short`), sa.at > 1 ? fmt(sa.bestFrom) : fmt(best[m])), () => this.h.onStart(m));
    const campBtn = this._button(hard ? 'HARD PAIN' : 'CAMPAIGN', t(hard ? 'campHardShort' : 'campShort'), () => this.h.onCampaign?.());
    arcadeBtn.classList.add('big', 'mode'); campBtn.classList.add('big', 'mode');
    const rows = el('div', 'list mods'); rows.append(hardBtn, ...(startBtn ? [startBtn] : []));
    startRow.append(arcadeBtn, rows);   // CAMPAIGN heads the side column: under these in portrait, at the top right sideways
    // v80: a run kept at a world's door (main.js saveContinue) can be taken up again
    const c = this.h.continueInfo?.();
    const contBtn = c ? this._button(t('cont'), line(worldName(c.world), c.score.toLocaleString('en-US')), () => this.h.onContinue?.()) : null;
    // v118: DAILY — the day's waves, the same for everyone (the HARD switch makes it HARDCADE's); its best today
    const dy = this.h.dailyInfo?.();
    const dailyBtn = dy ? this._button(t('daily'), line(t('dailyShort'), dy.best ? fmt(dy.best) : ''), () => this.h.onDaily?.()) : null;
    for (const b of [contBtn, dailyBtn]) if (b) b.classList.add('mode');
    if (dailyBtn) dailyBtn.classList.add('daily');
    const menuBtn = this._setting(t('options'), '›', () => this.openOptions(() => { this.h.onTitle?.(); this._focusOn(t('options')); }, { records: true }));   // v156: SETTINGS, and the title's settings carry RECORDS
    const side = el('div', 'side'), last = el('div', 'list'); last.append(menuBtn);
    side.append(campBtn, ...(contBtn ? [contBtn] : []), ...(dailyBtn ? [dailyBtn] : []), last);
    this.optBack = null;
    this._panel([logo, startRow, side, hint]);
    this.screen = 'title';
    this.menuEl.classList.toggle('hardmode', hard);
    if (keep && prev > 0 && prev < this.buttons.length) { this.focusIndex = prev; this._focus(); }
  }

  // THE CAMPAIGN: its rooms on one GRID, a row per world in its rail
  // colour and a tile per room — its number, its goal as a picture, the grade
  // it has paid, or a lock. A tile opens the room's CARD (roomCard), which is
  // the only place a room starts from: you read a room before you play it.
  // `played` is the room just left; `focus` a tile to come back to.
  campaign(list, played = null) {
    this.optBack = () => this.h.onTitle?.(); this._list = list;   // Esc or B: back to the title
    this.screen = 'rooms';
    const GC = GRADE_COLORS, flat = list.flatMap((wd) => wd.rooms);
    // the HARD CAMPAIGN (v49): the same grid on its own grades, behind the title's HARD switch
    const hard = !!this.h.hard?.();
    // v54: how many rooms are an S on this route, and a crown on a world that is all S
    const nS = flat.filter((r) => r.grade === 'S').length, tallyS = el('span', 'stally', ` · S ${nS}/${flat.length}`);
    const head = el('h2', hard ? 'hard' : null, hard ? 'HARD PAIN' : 'CAMPAIGN'); if (nS) head.append(tallyS);
    const items = [head, el('p', 'mode camp', t(hard ? 'campaignHard' : 'campaign'))];
    const at = played?.focus ?? played?.next ?? flat.find((r) => r.open && !r.grade)?.id ?? flat[0]?.id;
    // the route: every room, how hard each is, and what you have paid on it
    const route = el('div', 'route-wrap');
    route.append(routeChart(flat, { width: Math.min(560, Math.max(260, (window.innerWidth || 600) - 80)), height: (window.innerHeight || 800) < 520 ? 36 : 54, focus: at }));
    items.push(route);
    if (played?.grade) {
      // the room just cleared: its grade, its number, and the S line when it is not an S yet
      const pr = flat.find((r) => r.id === played.id), H = pr?.level ? tiersFor(pr, pr.level) : null;
      const num = `${pts(played.value)} ${t('pts')}`;
      const toS = played.grade !== 'S' && H ? ` · S ${pts(H.S)}` : '';
      // v160: an ENDURANCE room's number in its three parts (sim/director/campaign.js `endure`)
      const P = played.parts, parts = P ? ` (${t('endParts').replace('{play}', pts(P.play)).replace('{time}', pts(P.time)).replace('{cut}', P.cut).replace('{lost}', pts(P.lost)).replace('{hits}', P.hits)})` : '';
      const p = el('p', 'played', `${played.name} — ${t('grade')} ${played.grade} · ${num}${parts}${toS}`);
      p.style.color = GC[played.grade];
      items.push(p);
    }
    const grid = el('div', 'grid');
    grid.style.setProperty('--cols', String(Math.max(1, ...list.map((wd) => wd.rooms.length))));
    list.forEach((wd, wi) => {
      const allS = wd.rooms.length && wd.rooms.every((r) => r.grade === 'S');
      const name = el('span', `wname${allS ? ' crown' : ''}`, allS ? `♛ ${wd.name}` : wd.name);
      name.style.color = allS ? '' : wd.open ? wd.rail : '';
      grid.append(name);
      wd.rooms.forEach((r, ri) => {
        const b = el('button', 'tile');
        b.dataset.gr = wi; b.dataset.gc = ri; b.dataset.id = r.id;
        b.setAttribute('aria-label', r.open ? `${r.index + 1} ${r.name}` : `${r.index + 1} ${t('roomLocked')}`);
        if (!r.open) { b.classList.add('off'); b.setAttribute('aria-disabled', 'true'); }
        b.append(el('span', 'num', String(r.index + 1)), goalGlyph(goalOf(r).type, { size: 26, color: wd.rail, locked: !r.open }));
        if (r.grade) { const g = el('span', 'grade', r.grade); g.style.color = GC[r.grade]; b.append(g); b.style.borderColor = GC[r.grade]; }
        b.addEventListener('click', () => { if (r.open) this.roomCard(r, wd); });
        b.addEventListener('pointerenter', () => { this.focusIndex = this.buttons.indexOf(b); this._focus(); });
        grid.append(b);
      });
    });
    items.push(grid);
    items.push(this._button(t('back'), null, () => this.h.onTitle?.()));
    this._panel(items);
    const i = this.buttons.findIndex((b) => b.dataset.id === at);
    if (i >= 0) { this.focusIndex = i; this._focus(); }
  }

  // A room's CARD: what it asks, its chart, the lines it is graded on in its
  // own number (the seconds, the hits, the heart, the share), your best, and
  // START. BACK (or Esc, or B) is the grid, with this room's tile in focus.
  roomCard(r, wd) {
    const GC = GRADE_COLORS, L = r.level;
    this.optBack = () => this.campaign(this._list, { focus: r.id });
    this.screen = 'room';
    const tiers = L ? tiersFor(r, L) : null;
    const fmt = (v) => `≥ ${pts(v)}`;
    const rows = el('div', 'tiers');
    const line = (g, text) => { const k = el('span', 'tg', g); k.style.color = GC[g]; rows.append(k, el('span', 'tt', text)); };
    // v51: a room is graded on its score — four lines; v157: D through the room under C, F not through
    if (tiers) for (const g of ['S', 'A', 'B', 'C']) line(g, fmt(tiers[g]));
    line('D', t('tierD'));
    line('F', t('tierF'));
    const head = el('p', 'mode', `${wd?.name ?? ''} · ${r.index + 1} / ${this._list?.reduce((n, w) => n + w.rooms.length, 0) ?? ''}`);
    head.style.color = wd?.rail ?? '';
    const best = r.grade ? `${t('yourBest')}: ${r.grade}${r.best != null ? ` · ${pts(r.best)} ${t('pts')}` : ''}` : t('notPlayed');
    const bestEl = el('p', 'best', best);
    if (r.grade) bestEl.style.color = GC[r.grade];
    const chart = L ? roomChart(L, { width: 300, height: 56 }) : null;
    const startBtn = this._button(t('start'), `${L?.duration ?? ''} s`, () => this.h.onRoom?.(r.id));
    startBtn.classList.add('go');
    // a HARD PAIN room says so on its card (owner, 2026-10-27): a tag over its
    // name, and the card in red, so nobody starts the wrong one
    const tag = r.hard ? [el('p', 'hardtag', 'HARD PAIN')] : [];
    if (r.hard) startBtn.classList.add('hard-go');
    this._panel([...tag, el('h2', r.hard ? 'card hard' : 'card', r.name), head, el('p', 'goal', goalText(r)), ...(chart ? [chart] : []),
      ...(L?.plan?.teaches ? [el('p', 'teaches', `${t('teaches')}: ${L.plan.teaches}`)] : []),
      ...(L?.plan?.strategy?.length ? [el('p', 'skills', `${t('skills')}: ${L.plan.strategy.map((k) => t(`sk_${k}`)).join(' · ')}`)] : []),
      rows, ...(L?.score?.mutators ?? []).map((k) => el('p', 'mutator', t(MUTATOR_KEY[k] ?? 'mBank'))), bestEl,
      startBtn, this._button(t('back'), null, () => this.closeOptions())]);
  }

  // OPTIONS, 1.x's way (its title OPTIONS opened the pause menu's settings,
  // v109): one page of every switch, reached from the title, the pause menu
  // and the death screen, and BACK (or Esc, or B) to where it was opened.
  // `back` redraws that menu. The test switches (DASH, GEL HP) take effect
  // from the next run; the rest at once.
  // v156 (owner, 18 Nov: the pause menu "is insanely cluttered and not for the public"): the page a player sees is
  // 1.x's settings page (designer.js renderSettings: volume, the announcer and its volume, reduce motion) plus the
  // music, the language and the two thumb controls, 8 switches in 4 rows. RECORDS is on it only from the title (it is
  // about the whole game, not the run paused). Everything else — the test switches, the look comparisons, splatter,
  // the dead zone, auto quality, the play record — is the DEVELOPER block, shown only with ?dev. Nothing is removed,
  // and a stored choice still applies with or without ?dev.
  openOptions(back, { records = false } = {}) {
    if (back) { this.optBack = back; this.optRecords = records; }
    const o = this.h.optionsState?.() ?? { sound: true, test: { dash: 'pass', hp: 1, by: 'lift' } }, keep = this.optBack && this.menuEl.querySelector('h2.opt') ? this.focusIndex : 0;
    const items = [el('h2', 'opt', t('options')), ...this._playerRows(o)];
    if (this.optRecords) { const r = el('div', 'list'); r.append(this._setting(t('records'), '›', () => this.h.onRecords?.())); items.push(r); }
    if (this.h.dev?.()) items.push(...this._devRows(o));
    items.push(this._button(t('back'), null, () => this.closeOptions()));
    this._panel(items);
    this.screen = 'options';
    if (keep > 0 && keep < this.buttons.length) { this.focusIndex = keep; this._focus(); }
  }
  _focusOn(label) { const i = this.buttons.findIndex((b) => b.querySelector('.label')?.textContent === label); if (i >= 0) { this.focusIndex = i; this._focus(); } }

  // RECORDS (v87, the owner's fourth QoL pick): what this phone has done, on
  // one page from OPTIONS — the bests (the real one per mode, each from-world
  // best, how far a run has reached), the campaigns' rooms cleared and S
  // grades, the last dozen rooms and runs, and how the phone ran the last run
  records(d) {
    const fmt = (v) => (v ? v.toLocaleString('en-US') : '—'), mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    // v121: `recs`: on a phone each row stands its name over its value (the values are long, and wrapped a word at a time)
    const bests = el('dl', 'stats recs'), row = (l, k, v) => l.append(el('dt', null, k), el('dd', null, v));
    for (const m of ['arcade', 'hardcade']) {
      row(bests, m.toUpperCase(), `${fmt(d.best[m])}${d.reached[m] > 1 ? ` · ${t('recReached')} ${t(`world${d.reached[m]}`).split(' · ')[0]}` : ''}`);
      for (const [n, v] of Object.entries(d.from[m] ?? {})) row(bests, `${m.toUpperCase()} · ${t('fromWorld')} ${n}`, fmt(v));
    }
    for (const [tag, c] of [['CAMPAIGN', d.campaign], ['HARD PAIN', d.hard]]) if (c.played) row(bests, tag, `${c.cleared}/${c.total} ${t('recRooms')} · ${c.s} S`);
    for (const m of ['arcade', 'hardcade']) { const g = d.daily?.[m]; if (g?.tries) row(bests, `${t('daily')} ${d.daily.day}${m === 'hardcade' ? ' · HARD' : ''}`, `${fmt(g.best)} · ${t('tries')} ${g.tries}`); }   // v118
    const runs = el('dl', 'stats recs');
    for (const e of d.recent) {
      const when = (e.at ?? '').slice(5, 16), who = e.k === 'r' ? e.id : `${e.dy ? `${t('daily')} · ` : ''}${e.k === 'h' ? 'HARDCADE' : 'ARCADE'}`;
      const what = e.k === 'r' ? `${e.g ?? t('recQuit')} · ${fmt(e.s)}` : `${t('recWorld')}${e.w} · ${fmt(e.s)} · ${mmss(e.t || 0)}${e.won ? ` · ${t('recWon')}` : e.q ? ` · ${t('recQuit')}` : ''}${e.w0 ? ` · ${t('fromWorld')} ${e.w0}` : ''}`;
      row(runs, `${when} ${who}`, what);
    }
    const num = (x) => (lang === 'fi' ? String(x).replace('.', ',') : String(x)), f = d.phone;
    this._panel([el('h2', 'opt', t('records')), el('p', 'mode', t('recBests')), bests, el('p', 'mode', t('recRuns')), d.recent.length ? runs : el('p', 'hint', t('recNone')),
      ...(f ? [el('p', 'hint', t('recordPhone').replace('{hz}', f[3]).replace('{late}', num(f[2])) + (f[4] < 0.98 ? t('recordSlow').replace('{sim}', num(f[4])) : ''))] : []),
      this._button(t('back'), null, () => this.closeOptions())]);
    // v125: one way back, whichever way it is asked — BACK opened OPTIONS, while Esc and B skipped past OPTIONS to
    // wherever OPTIONS had been opened from (one back slot, inherited); OPTIONS' own way back is kept for it
    const toOptions = this.optBack;
    this.optBack = () => { this.optBack = toOptions; this.openOptions(); this._focusOn(t('records')); };
    this.screen = 'records';
  }
  closeOptions() { const b = this.optBack; this.optBack = null; b?.(); }
  get inOptions() { return this.screen === 'options'; }   // v125: the screen up, not a back-target (true on the grid, and through a room)

  _pair(...buttons) { const r = el('div', 'row'); r.append(...buttons); return r; }
  // v156 (owner, 19 Nov: "Pause menu is hard to read, page full of buttons. Should be neat list of toggles or
  // options"): a setting is a ROW — its name on the left, what it is set to on the right, a hairline under it — and a
  // tap (or Enter, or Cross) steps it, as the box did. It is still a button, so the pad, the keys and focus walk it
  _setting(label, value, fn) {
    const b = el('button', 'item setting');
    b.append(el('span', 'label', label), el('span', 'val', value));
    b.addEventListener('click', () => fn());
    b.addEventListener('pointerenter', () => { this.focusIndex = this.buttons.indexOf(b); this._focus(); });
    return b;
  }
  // what a player sets (v156): SOUND — volume, music (1.x v81, v58), the announcer, the owner's recorded INTRO VOICE
  // (1.x v122) and the announcer's own volume (1.x v137); CONTROLS — the hand and the stick's size (v86); GENERAL —
  // reduce motion and the language (1.x). One list, three small headings
  _playerRows(o) {
    const pct = (v) => `${Math.round((v ?? 1) * 100)}%`, sz = (k) => t(`sz${k[0].toUpperCase()}${k.slice(1)}`), onOff = (v) => t(v ? 'on' : 'off');
    const list = el('div', 'list');
    list.append(
      el('p', 'group', t('grpSound')),
      this._setting(t('volume'), pct(o.volume), () => this.h.onVolume?.()),
      this._setting(t('music'), pct(o.music), () => this.h.onMusic?.()),
      this._setting(t('setIntro'), onOff(o.introVoice !== false), () => this.h.onIntroVoice?.()),
      el('p', 'group', t('grpControls')),
      this._setting(t('setHand'), t(o.hand === 'left' ? 'handL' : 'handR'), () => this.h.onHand?.()),
      this._setting(t('setStick'), sz(o.stick ?? 'normal'), () => this.h.onStick?.()),
      el('p', 'group', t('grpGeneral')),
      this._setting(t('setMotion'), onOff(o.reduceMotion), () => this.h.onMotion?.()),
      this._setting(t('setLang'), t('langVal'), () => this.h.onLang?.()),
    );
    return [list];
  }
  // ?dev only (v156): the test switches (DASH, DASH BY, GEL HP: from the next run), the look comparisons (GELS,
  // render/sdf.js; WORLDS, v23; STYLE, render/style.js; LENS, render/lens.js), SPLATTER (render/goo.js), the DEAD
  // ZONE and AUTO QUALITY (v86), and the PLAY RECORD (v61, js/record.js) with how the last run went on this phone (v63)
  _devRows(o) {
    const sz = (k) => t(`sz${k[0].toUpperCase()}${k.slice(1)}`), num = (x) => (lang === 'fi' ? String(x).replace('.', ',') : String(x));
    const g = this.h.gels?.() === 'sdf' ? 'sdf' : 'classic', wl = this.h.worlds?.() === 'neon' ? 'neon' : 'street';
    const st = ['physical', 'cel', 'watercolor'].includes(this.h.style?.()) ? this.h.style() : 'physical', ln = this.h.lens?.() === 'tilt' ? 'tilt' : 'none';
    const tests = el('div', 'row');
    tests.append(
      this._button(`${t('dash')} · ${t(o.test.dash)}`, t(`${o.test.dash}Sub`), () => this.h.onDash?.()),
      this._button(`${t('dashBy')} · ${t(o.test.by ?? 'lift')}`, t(`${o.test.by ?? 'lift'}Sub`), () => this.h.onDashBy?.()),   // v124
      this._button(`${t('gelHp')} ×${o.test.hp}`, t('gelHpSub'), () => this.h.onGelHp?.()),
    );
    const rec = this._button(`${t('record')} · ${o.records ?? 0}`, t(o.recordSaid ?? 'recordSub'), () => this.h.onRecord?.()), f = o.frames;
    if (f) rec.append(el('span', 'sub', t('recordPhone').replace('{hz}', f[3]).replace('{late}', num(f[2])) + (f[4] < 0.98 ? t('recordSlow').replace('{sim}', num(f[4])) : '')));
    return [
      el('p', 'mode', 'DEVELOPER · ?dev'),
      tests,
      this._pair(this._button(`${t('gels')} · ${t(g)}`, t(`${g}Sub`), () => this.h.onGels?.()),
        this._button(`${t('worlds')} · ${t(wl)}`, t(`${wl}Sub`), () => this.h.onWorlds?.())),
      // v156 (owner, 19 Nov: "No announcer needed for now"): the commentary voice is off for players; here to try it
      this._pair(this._setting(t('setAnn'), t(o.announcer ? 'on' : 'off'), () => this.h.onAnnouncer?.()),
        this._setting(t('annVol'), `${Math.round((o.annVolume ?? 1) * 100)}%`, () => this.h.onAnnVolume?.())),
      this._pair(this._button(`${t('style')} · ${t(st)}`, t(`${st}Sub`), () => this.h.onStyle?.()),
        this._button(`${t('lens')} · ${t(ln)}`, t(`${ln}Sub`), () => this.h.onLens?.())),
      this._pair(this._button(this.h.goo?.() === false ? t('gooOff') : t('gooOn'), null, () => this.h.onGoo?.()),
        this._button(`${t('dead')} · ${sz(o.dead ?? 'normal')}`, t('deadH'), () => this.h.onDead?.())),
      // v156: the sticks' centres following the thumb (TUNING.input.follow), OFF for 1.x's fixed centre, to compare
      this._pair(this._button(`STICK FOLLOW · ${o.follow === false ? 'OFF' : 'ON'}`, o.follow === false ? "1.x's: the centre stays where the thumb landed" : 'the centre trails the thumb: the full 360°', () => this.h.onFollow?.())),
      this._pair(this._button(o.autoQ === false ? t('autoOff') : t('autoOn'), t('autoH').replace('{q}', `${Math.round((o.autoQ === false ? 1 : o.qShare ?? 1) * 100)}%`), () => this.h.onAutoQ?.())),
      this._pair(rec),
      el('p', 'hint', `${t('dash')} · ${t('gelHp')}: ${t('nextRun')}`),
    ];
  }

  // the card for the gel that got you (or, paused, the last to land a hit):
  // its name, a box main.js draws the gel itself into (render/specimen.js),
  // and one line on how to read it next time
  _gelCard(kind, head) {
    const S = kind && TUNING.species[kind];
    if (!S) return null;
    const card = el('div', 'gelcard'), box = el('div', 'specimen'), words = el('div', 'words');
    words.append(el('p', 'head', head), el('p', 'name', S.name), el('p', 'line', GEL_LINES[lang]?.[kind] ?? GEL_LINES.en[kind] ?? ''));
    card.append(box, words);
    card.style.setProperty('--gel', `#${S.color.toString(16).padStart(6, '0')}`);
    queueMicrotask(() => this.h.onSpecimen?.(kind, box));
    return card;
  }

  // v156 (owner, 18 Nov: "Pause menu needs a restart if you want to abandon run but no enemy card"): 1.x's pause
  // was PAUSED, RESUME and its settings page; this is that, plus RESTART, which is the result screen's AGAIN
  // (main.js onRestart: the run is recorded as quit, then the same run starts again), and QUIT to the title
  pause() {
    this.optBack = null;
    this._panel([el('h2', null, t('paused')), this._button(t('resume'), null, () => this.h.onResume()),
      this._button(t('restart'), null, () => this.h.onRestart()),
      this._button(t('options'), null, () => this.openOptions(() => { this.pause(); this._focusOn(t('options')); })), this._button(t('quit'), null, () => this.h.onMenu())]);
    this.screen = 'pause';
  }

  results(r) {
    this.optBack = null;
    this.screen = 'results';
    const rows = el('dl', 'stats');
    const row = (k, v) => rows.append(el('dt', null, k), el('dd', null, v));
    row(t('score'), r.score.toLocaleString('en-US') + (r.newBest ? `  ${t('newbest')}` : ''));
    row(r.from ? `${t('best')} · ${t('fromWorld')} ${r.from}` : t('best'), r.best.toLocaleString('en-US'));   // v85: a run from a later world against its own best
    row(t('time'), r.time);
    if (r.gotYou && !r.gotYouKind) row(t('gotyou'), r.gotYou);
    row(t('kills'), String(r.kills));
    row(t('grazes'), String(r.grazes));
    // v118: a DAILY run: today's best and how many tries, and SHARE hands the day's line to a message
    if (r.daily) { row(t('dailyBest'), r.daily.best.toLocaleString('en-US') + (r.daily.newBest ? `  ${t('newbest')}` : '')); row(t('tries'), String(r.daily.tries)); }
    const share = r.daily ? this._button(t('share'), t('shareSub'), async () => { const said = await this.h.onShare?.(r.daily.text); const s = share.querySelector('.sub'); if (said && s) s.textContent = t(said); }) : null;
    const card = this._gelCard(r.gotYouKind, r.gotYouRevenge ? `${t('gotyou')} · ${t(r.gotYouRevenge === 'strand' ? 'itsStrand' : r.gotYouRevenge === 'slam' ? 'itsSlam' : 'lastShot')}` : t('gotyou'));
    // v155 (DESIGN §6 row 10): how far the next grade is — "+3,200 for B" — when the points decided the grade
    if (r.room) { const nx = nextGrade(r.room); row(t('grade'), r.room.grade + (nx ? `  ·  ${t('toNext').replace('{n}', pts(nx.need)).replace('{g}', nx.grade)}` : '')); }
    // a room: your number against its lines, or what the F was
    const lines = r.room ? this._roomLines(r.room) : null;
    const modeLine = `${r.daily ? `${t('daily')} ${r.daily.day} · ` : ''}${r.mode.toUpperCase()}`;
    // v155 (DESIGN §6 row 5): a room's retry is RETRY, and it stands under the heading, in reach on a phone
    // before the card, the numbers and the lines (a run's AGAIN keeps its place under them)
    const again = this._button(r.room ? t('retry') : t('again'), null, () => this.h.onAgain());
    this._panel([el('h2', null, r.won ? t('won') : r.room?.outcome === 'fail' ? t('timeUp') : t('over')), el('p', 'mode', r.won ? `${modeLine} · ${t('wonSub')}` : r.room ? `${r.room.name} · ${goalText(r.room)}` : modeLine), ...(r.room ? [again] : []), ...(card ? [card] : []), rows, ...(lines ? [lines] : []),
      ...(r.room ? [] : [again]), ...(share ? [share] : []), r.room ? this._button(t('rooms'), null, () => this.h.onCampaign?.()) : this._button(t('menu'), null, () => this.h.onMenu()),
      this._button(t('options'), null, () => this.openOptions(() => { this.results(r); this._focusOn(t('options')); }))]);
  }

  // A room's result against its lines: S, A, B in its own number, C, F —
  // with a marker on the line you landed on and your number beside it; an F
  // says why (`why` from sim/director/campaign.js end()).
  _roomLines(room) {
    const GC = GRADE_COLORS, L = room.level, H = L ? tiersFor(room, L) : null;
    const box = el('div', 'tiers result');
    const why = { died: t('whyDied'), hit: t('whyHit'), heart: t('whyHeart'), clock: t('whyClock'), orbs: t('whyOrbs'), score: t('whyScore') }[room.why] ?? t('tierFScore');
    // v157: D is through the room under C; F is a run that did not get through
    for (const g of ['S', 'A', 'B', 'C', 'D', 'F']) {
      if (!H && g !== 'F' && g !== 'D') continue;
      const k = el('span', 'tg', g); k.style.color = GC[g];
      const here = room.grade === g;
      const mine = here && room.value != null && g !== 'F' ? ` ${pts(room.value)}` : '';
      const text = g === 'D' ? t('tierD') : g !== 'F' ? `≥ ${pts(H[g])}` : room.grade === 'F' ? why : t('tierF');
      const line = el('span', 'tt', `${text}${here ? `  ◀ ${t('yours')}${mine}` : ''}`);
      if (here) { line.style.color = GC[g]; line.style.fontWeight = '700'; }
      box.append(k, line);
    }
    return box;
  }

  // THE CAMPAIGN'S END (v54): every room through on this route, for the first time —
  // what each grade came to, the points, and where to go from here
  campaignDone(r, onRooms) {
    this.optBack = onRooms;
    this.screen = 'ending';
    const T2 = r.tally, n = r.rooms, GC = GRADE_COLORS;
    const tally = el('div', 'tiers');
    for (const g of ['S', 'A', 'B', 'C', 'D']) { const k = el('span', 'tg', g); k.style.color = GC[g]; tally.append(k, el('span', 'tt', `× ${T2[g] || 0}`)); }
    const sLeft = n - (T2.S || 0);
    this._panel([
      ...(r.preview ? [el('p', 'mutator', t('preview'))] : []),   // v120: ?ending — a look, not an ending earned
      el('h2', r.hard ? 'hard win' : 'win', t(r.hard ? 'hardDone' : 'campDone')),
      el('p', 'mode', t(r.hard ? 'hardDoneSub' : 'campDoneSub')),
      tally,
      el('p', 'best', `${t('total')} ${pts(r.pts)} ${t('pts')}`),
      el('p', 'mutator', sLeft ? `${sLeft} ${t('sToGo')}` : t('allS')),
      ...(r.hard ? [] : [el('p', 'hint', t('campDoneNext'))]),
      this._button(t('rooms'), null, onRooms),
      this._button(t('menu'), null, () => this.h.onMenu()),
    ]);
  }

  // ── pad and keys in menus ──────────────────────────────────────
  _move(d) { if (!this.buttons?.length) return; this.focusIndex = (this.focusIndex + d + this.buttons.length) % this.buttons.length; this._focus(); }
  // a direction in a menu: on the campaign's grid, to the tile that way (off
  // its top or bottom, to what is above or below the grid); anywhere else,
  // up and left are back a button and down and right on a button
  _dir(dx, dy) {
    const b = this.buttons?.[this.focusIndex];
    if (!b || b.dataset.gr == null) { this._move(dy || dx); return; }
    const r = +b.dataset.gr + dy, c = +b.dataset.gc + dx, tiles = this.buttons.filter((x) => x.dataset.gr != null);
    let i = this.buttons.findIndex((x) => x.dataset.gr != null && +x.dataset.gr === r && +x.dataset.gc === c);
    if (i < 0 && dx) { this._move(dx); return; }
    if (i < 0) i = dy < 0 ? this.buttons.indexOf(tiles[0]) - 1 : this.buttons.indexOf(tiles[tiles.length - 1]) + 1;
    if (i >= 0 && i < this.buttons.length) { this.focusIndex = i; this._focus(); }
  }
  _pick() { this.buttons?.[this.focusIndex]?.click(); }
  _menuKey(e) {
    if (this.menuEl.hidden) return;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { this._dir(0, 1); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { this._dir(0, -1); e.preventDefault(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { this._dir(1, 0); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this._dir(-1, 0); e.preventDefault(); }
    else if (e.code === 'Enter' || e.code === 'Space') { this._pick(); e.preventDefault(); }
    else if (e.code === 'Escape') { if (this.optBack) this.closeOptions(); else this.h.onBack?.(); }
    else if (e.code === 'KeyP' && this.screen === 'pause') { this.h.onResume?.(); e.preventDefault(); }   // v125: P pauses, so P resumes
  }
  // The pad is read every frame, menu or not, so a button already held when
  // a menu opens is not a press in it: Options pauses on its way down, and
  // the same press must not then pick RESUME a frame later.
  pollPad() {
    const p = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((x) => x && x.connected);
    if (!p) { this._padPrev = {}; return; }
    const now = { up: p.buttons[12]?.pressed || p.axes[1] < -0.6, down: p.buttons[13]?.pressed || p.axes[1] > 0.6, left: p.buttons[14]?.pressed || p.axes[0] < -0.6, right: p.buttons[15]?.pressed || p.axes[0] > 0.6, a: p.buttons[0]?.pressed, b: p.buttons[1]?.pressed, start: p.buttons[9]?.pressed };
    if (this.menuEl.hidden) { this._padPrev = now; return; }
    const edge = (k) => now[k] && !this._padPrev[k];
    if (edge('down')) this._dir(0, 1);
    if (edge('up')) this._dir(0, -1);
    if (edge('right')) this._dir(1, 0);
    if (edge('left')) this._dir(-1, 0);
    // v125: Start in a pause resumes, whatever has the focus — it pressed the focused button, QUIT if focus had moved there
    if (edge('start') && this.screen === 'pause') this.h.onResume?.();
    else if (edge('a') || edge('start')) this._pick();
    if (edge('b')) { if (this.optBack) this.closeOptions(); else this.h.onBack?.(); }
    this._padPrev = now;
  }

  // ── the touch sticks, drawn where the thumbs landed ────────────
  // `pips`: the bodies off the screen on a world bigger than it (main.js),
  // each an arrow on the edge pointing at it, in its colour: { x, y, a, hex, big }
  drawSticks(input, pips = null) {
    const c = this.sticks, dpr = Math.min(devicePixelRatio, 2);
    if (c.width !== Math.round(innerWidth * dpr)) { c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
    const g = this.sctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (pips) {
      for (const p of pips) {
        const r = p.big ? 9 : 6;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a);
        g.fillStyle = `#${p.hex.toString(16).padStart(6, '0')}`; g.globalAlpha = p.alpha;
        g.beginPath(); g.moveTo(r * 1.4, 0); g.lineTo(-r * 0.8, r); g.lineTo(-r * 0.8, -r); g.closePath(); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
    }
    if (input.source !== 'touch' || !input.enabled) return;   // v125: no stick drawn over a pause card or a menu (a thumb left down)
    const R = input.stickRadius ?? TUNING.input.stickRadius;   // v125: OPTIONS' STICK size (SMALL / LARGE drew the NORMAL ring)   // v125: OPTIONS' STICK size (SMALL / LARGE drew the NORMAL ring)
    for (const s of [input.left, input.right]) {
      if (!s.active) continue;
      const l = Math.hypot(s.dx, s.dy), k = l > R ? R / l : 1;
      g.strokeStyle = 'rgba(217,220,226,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(s.ox, s.oy, R, 0, Math.PI * 2); g.stroke();
      g.fillStyle = s === input.right ? 'rgba(255,180,104,0.55)' : 'rgba(217,220,226,0.45)';
      g.beginPath(); g.arc(s.ox + s.dx * k, s.oy + s.dy * k, 22, 0, Math.PI * 2); g.fill();
    }
  }
}
