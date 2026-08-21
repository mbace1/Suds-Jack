// Nano Banana — Gemini's image model — behind one function.
//
//   generateImage({ prompt, model, aspect, apiKey })  ->  { bytes, mime }
//
// The endpoint is the ordinary text endpoint. That is the whole trap: image
// generation is not a different URL, it is `generateContent` with IMAGE added
// to responseModalities, and if you leave that out the API cheerfully returns
// 200 with a paragraph of prose describing the picture it did not send you.
// The model generates the image tokens either way and discards them on the way
// out. So the single most common failure here is not an error at all, which is
// why `pickImage` below treats a text-only 200 as a hard failure and prints
// what the model said instead — a silent success is worse than a crash.

const HOST = 'https://generativelanguage.googleapis.com';

// The family, newest last. Pinned per-asset in the manifest rather than
// tracked here: a model id is part of an asset's hash, so "upgrade the model"
// restages every 2D asset in the batch and should be a decision someone makes
// on purpose. Listed so the choice is visible when they make it.
export const MODELS = [
  'gemini-2.5-flash-image',        // the original "nano banana"
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
];

export function keyFrom(env = process.env) {
  return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.NANO_BANANA_API_KEY || null;
}

function pickImage(body) {
  const cand = body?.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      return { bytes: Buffer.from(inline.data, 'base64'), mime: inline.mimeType ?? inline.mime_type ?? 'image/png' };
    }
  }
  // No image came back. Say WHY, in the model's own words where it gave them —
  // a refusal, a safety block and a dropped modality all look identical from
  // out here otherwise.
  const said = parts.map(p => p.text).filter(Boolean).join(' ').trim();
  const reason = cand?.finishReason ?? body?.promptFeedback?.blockReason ?? 'unknown';
  throw new Error(
    `no image in response (finishReason=${reason})` + (said ? `\n  model said: ${said.slice(0, 300)}` : '')
  );
}

export async function generateImage({ prompt, model, aspect, apiKey, image, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('no API key — set GEMINI_API_KEY');

  const parts = [{ text: prompt }];
  // An input image makes this an EDIT rather than a generation: same endpoint,
  // same model, the picture just goes in the parts list beside the words. That
  // is how a plate gets iterated ("same creature, wider") without starting over.
  if (image) parts.push({ inlineData: { mimeType: image.mime ?? 'image/png', data: image.bytes.toString('base64') } });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],       // the whole ballgame — see above
      ...(aspect ? { imageConfig: { aspectRatio: aspect } } : {}),
    },
  };

  const res = await fetchImpl(`${HOST}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${model}: non-JSON reply (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status} — ${json?.error?.message ?? text.slice(0, 200)}`);
  return pickImage(json);
}
