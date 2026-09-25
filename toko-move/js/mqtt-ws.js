// Toko Move — a minimal MQTT 3.1.1 client over a browser WebSocket (v2.56).
//
// LIVE reads HSL's high-frequency positioning (HFP) feed, which is published on
// an open MQTT broker (wss://mqtt.hsl.fi, no key). The game has no build step
// and no dependencies, and what it needs from MQTT is four packets: CONNECT,
// SUBSCRIBE at QoS 0, PUBLISH coming in, and a ping to keep the socket open.
// That is small enough to write out rather than vendor a library for.
//
// The framing is pure (`encode*`, `Reader`) so test/live.mjs holds it in bare
// node; `connectMqtt` is the only part that touches a WebSocket.
const te = new TextEncoder(), td = new TextDecoder();

function str(s) { const b = te.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
function varint(n) { const out = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; out.push(d); } while (n > 0); return out; }
function packet(first, body) { return new Uint8Array([first, ...varint(body.length), ...body]); }

export function encodeConnect(clientId, keepAlive = 60) {
  // protocol "MQTT", level 4, flags: clean session
  return packet(0x10, [...str('MQTT'), 4, 0x02, keepAlive >> 8, keepAlive & 255, ...str(clientId)]);
}
export function encodeSubscribe(id, topics) {
  const body = [id >> 8, id & 255]; for (const t of topics) body.push(...str(t), 0);
  return packet(0x82, body);
}
export const PINGREQ = new Uint8Array([0xc0, 0]);
export const DISCONNECT = new Uint8Array([0xe0, 0]);
// For tests and the mock broker: what the server sends.
export function encodePublish(topic, payload) { return packet(0x30, [...str(topic), ...te.encode(payload)]); }
export const CONNACK = new Uint8Array([0x20, 2, 0, 0]);
export function encodeSuback(id, n = 1) { return packet(0x90, [id >> 8, id & 255, ...Array(n).fill(0)]); }

// A stream reader: WebSocket frames need not line up with MQTT packets — one
// frame can carry several, or half of one — so bytes are buffered and whole
// packets taken off the front.
export class Reader {
  constructor() { this.buf = new Uint8Array(0); }
  push(bytes) { const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); const n = new Uint8Array(this.buf.length + b.length); n.set(this.buf); n.set(b, this.buf.length); this.buf = n; }
  *packets() {
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      let len = 0, mul = 1, i = 1, d;
      do { if (i >= b.length) return; d = b[i++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
      if (b.length < i + len) return;
      const type = b[0] >> 4, flags = b[0] & 15, body = b.subarray(i, i + len);
      this.buf = b.slice(i + len);
      if (type === 3) {
        const tl = (body[0] << 8) | body[1], topic = td.decode(body.subarray(2, 2 + tl));
        const qos = (flags >> 1) & 3, start = 2 + tl + (qos ? 2 : 0);
        yield { type: 'publish', topic, payload: td.decode(body.subarray(start)) };
      } else if (type === 2) yield { type: 'connack', code: body[1] };
      else if (type === 9) yield { type: 'suback' };
      else if (type === 13) yield { type: 'pingresp' };
      else yield { type: 'other', code: type };
    }
  }
}

// Connect, subscribe, and hand every PUBLISH to `onMessage`. Returns a handle
// with `close()`; `onState` hears 'connecting' | 'live' | 'closed' | 'error'.
export function connectMqtt(url, topics, { onMessage, onState = () => {}, WS = globalThis.WebSocket, clientId = `toko-move-${Math.random().toString(36).slice(2, 10)}` } = {}) {
  let ws, ping = null, closed = false;
  const reader = new Reader();
  onState('connecting');
  try { ws = new WS(url, ['mqtt']); } catch (e) { onState('error', e); return { close() {} }; }
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => ws.send(encodeConnect(clientId));
  ws.onmessage = ev => {
    reader.push(new Uint8Array(ev.data));
    for (const p of reader.packets()) {
      if (p.type === 'connack') {
        if (p.code !== 0) { onState('error', new Error(`CONNACK ${p.code}`)); ws.close(); return; }
        ws.send(encodeSubscribe(1, topics));
        ping = setInterval(() => { try { ws.send(PINGREQ); } catch {} }, 30000);
      } else if (p.type === 'suback') onState('live');
      else if (p.type === 'publish') onMessage?.(p.topic, p.payload);
    }
  };
  ws.onerror = e => onState('error', e);
  ws.onclose = () => { clearInterval(ping); if (!closed) onState('closed'); };
  return { close() { closed = true; clearInterval(ping); try { ws.send(DISCONNECT); ws.close(); } catch {} } };
}
