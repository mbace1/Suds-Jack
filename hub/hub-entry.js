import { GAMES } from './games.js?v=66';

// Live Toko Move catalogue correction. The deployed game is v2.24 and no longer
// contains player-drawn transit lines; keep the hub copy aligned with the actual
// cabinet without replacing the rest of the live catalogue.
const move = GAMES.find(g => g.id === 'tokomove');
if (move) {
  move.status = 'active';
  move.live = true;
  move.title = 'Toko Move';
  move.tagline = 'Courier across a living Helsinki: read the fixed HSL network, catch moving trams and metro, transfer, walk, and deliver against the clock.';
  move.lineage = 'Mini Metro × real Helsinki × real-time tactics';
  move.tags = ['courier', 'transit', 'helsinki'];
  move.controls = 'pick a job · catch an arriving service · get off / transfer · walk to intercept';
  move.note = 'v2.24 — exact HSL network geometry, five-minute shifts, real ground data, camera scales, transfer timing, landmarks and no player-drawn lines';
  move.fi = {
    tagline: 'Kuriiripeli elävässä Helsingissä: lue kiinteää HSL-verkkoa, nappaa liikkuva ratikka tai metro, vaihda, kävele ja toimita ajoissa.',
    lineage: 'Mini Metro × oikea Helsinki × reaaliaikataktiikka',
    controls: 'valitse keikka · nappaa saapuva vuoro · jää pois / vaihda · kävele seuraavaan kiinni',
    note: 'v2.24 — tarkka HSL-verkko, viiden minuutin vuorot, oikea karttapohja, kameratasot, vaihtojen ajoitus ja maamerkit',
  };
  move.ja = {
    tagline: '動くヘルシンキを走る配達ゲーム。固定されたHSL網を読み、走っているトラムや地下鉄に乗り、乗り換え、歩いて時間内に届ける。',
    lineage: 'Mini Metro × 実在のヘルシンキ × リアルタイム戦術',
    controls: '仕事を選ぶ · 到着便に乗る · 降りる / 乗り換える · 歩いて先回りする',
    note: 'v2.24 — 正確なHSL網、5分シフト、実データの地面、3段階カメラ、乗換時間、ランドマーク',
  };
}

import('./hub.js?v=77').then(() => import('./toko-cabinet-dom.js?v=5'));
