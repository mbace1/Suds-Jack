// The plate cut, OFF the main thread (v45). flattenImage is ~1.2s on a
// desktop for an 1100x619 plate and several seconds on a phone — run on the
// main thread that is a frozen board at the start of every encounter, which
// is a worse bug than the look is worth. The worker takes the pixels, cuts
// them in place and hands the buffer back; main.js keeps the photograph up
// until it does, and keeps it for good if a worker cannot start.
import { flattenImage } from './mstcut.js?v=2';

self.onmessage = e => {
  const { id, buf, w, h, opts } = e.data;
  const data = new Uint8ClampedArray(buf);
  try { flattenImage(data, w, h, opts); self.postMessage({ id, buf: data.buffer, w, h }, [data.buffer]); }
  catch (err) { self.postMessage({ id, error: String(err) }); }
};
