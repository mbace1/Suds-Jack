// Real-world anchors for the authored delivery locations.
// Resolution always comes from the committed/generated HSL GTFS stop pack;
// no screen coordinates or hand-drawn transit geometry live here.

export const HELSINKI_ANCHORS = {
  pasila: ['Pasila','Pasilan asema'],
  toolontori: ['Töölöntori'],
  kallionkirkko: ['Karhupuisto','Kallion virastotalo'],
  sornainen: ['Sörnäinen','Sörnäinen (M)','Sörnäisten metroasema'],
  kalasatama: ['Kalasatama','Kalasatama (M)','Kalasataman metroasema'],
  hakaniemi: ['Hakaniemi','Hakaniemen metroasema'],
  kamppi: ['Kamppi','Kamppi (M)','Kampin metroasema'],
  rautatientori: ['Rautatientori','Päärautatieasema','Rautatientorin metroasema'],
  senaatintori: ['Senaatintori'],
  ruoholahti: ['Ruoholahti','Ruoholahden metroasema'],
  kauppatori: ['Kauppatori'],
  katajanokka: ['Katajanokan puisto','Katajanokan terminaali','Vyökatu'],
};

const norm = s => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function resolveHslAnchors(pack, anchors = HELSINKI_ANCHORS) {
  const stops = pack?.stops ?? [];
  const byName = new Map();
  for (const stop of stops) {
    const key = norm(stop.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(stop);
  }

  const out = {};
  for (const [id, aliases] of Object.entries(anchors)) {
    let match = null;
    for (const alias of aliases) {
      const exact = byName.get(norm(alias));
      if (exact?.length) { match = exact[0]; break; }
    }
    if (!match) {
      for (const alias of aliases) {
        const q = norm(alias);
        match = stops.find(stop => norm(stop.name).includes(q) || q.includes(norm(stop.name)));
        if (match) break;
      }
    }
    out[id] = match ?? null;
  }
  return out;
}
