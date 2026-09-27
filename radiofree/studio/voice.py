#!/usr/bin/env python3
"""Voice every spoken line of a studio episode, and measure it for lip-sync.

    python radiofree/studio/voice.py you-looked-at-it --models <dir with kokoro-v1.0.int8.onnx + voices-v1.0.bin>

Reads   studio/episodes/<id>.script.json
Writes  studio/voice/<id>/<line>.wav      (48 kHz mono — not committed)
        studio/voice/<id>/lines.json      (committed: timing and mouths)

The voices are Kokoro (Apache-2.0), run locally through kokoro-onnx. This is a
desk tool, not the station app: the station's rule against an 82 MB model
download (js/tts.js) is about listeners, and nothing here ships to one.

For each line, lines.json carries its length and one MOUTH per exposure — the
film is shot on twos, twelve exposures a second, and a stop-motion mouth is
replaced on the same beat. A mouth is [open, bright]: loudness in the window
(0 = shut) and how much of the energy is high (sibilants and 'ee' — a wide
mouth — against 'oo' and 'oh', which round it). The puppet picks a
replacement mouth from those two numbers.
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
EXPOSURES = 12
SR = 48000

# A device voice: thinned, a hair of flange, and a very short slap — it should
# sound like it comes out of the glasses, not out of a person.
FX = {
    "device": "highpass=f=320,lowpass=f=6500,aphaser=type=t:speed=0.6:decay=0.35,aecho=0.8:0.6:7:0.25,volume=1.2",
}


def ffmpeg(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def mouths(sig, sr):
    hop = sr // EXPOSURES
    n = int(np.ceil(len(sig) / hop))
    rms, zcr = [], []
    for i in range(n):
        w = sig[i * hop:(i + 1) * hop]
        if len(w) < 8:
            w = np.pad(w, (0, 8 - len(w)))
        rms.append(float(np.sqrt(np.mean(w * w))))
        # high-band share: energy of the first difference against the signal
        d = np.diff(w)
        zcr.append(float(np.sqrt(np.mean(d * d)) / (np.sqrt(np.mean(w * w)) + 1e-6)))
    rms = np.array(rms); zcr = np.array(zcr)
    loud = np.percentile(rms, 92) or 1.0
    open_ = np.clip(rms / loud, 0, 1)
    open_[open_ < 0.12] = 0.0
    bright = np.clip((zcr - 0.08) / 0.5, 0, 1)
    return [[round(float(o), 3), round(float(b), 3)] for o, b in zip(open_, bright)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--models", required=True)
    a = ap.parse_args()
    from kokoro_onnx import Kokoro
    script = json.load(open(os.path.join(HERE, "episodes", f"{a.episode}.script.json")))
    out = os.path.join(HERE, "voice", a.episode)
    os.makedirs(out, exist_ok=True)
    k = Kokoro(os.path.join(a.models, "kokoro-v1.0.int8.onnx"), os.path.join(a.models, "voices-v1.0.bin"))
    result = []
    for line in script["lines"]:
        v = script["voices"][line["who"]]
        samples, sr = k.create(line["text"], voice=v["voice"], speed=v.get("speed", 1.0), lang=v.get("lang", "en-us"))
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "raw.wav")
            sf.write(raw, samples, sr)
            dst = os.path.join(out, f"{line['id']}.wav")
            chain = ",".join(x for x in [FX.get(v.get("fx", ""), ""), "silenceremove=start_periods=1:start_threshold=-45dB",
                                          "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"] if x)
            ffmpeg(["-i", raw, "-af", chain, "-ar", str(SR), "-ac", "1", dst])
        sig, _ = sf.read(dst)
        dur = len(sig) / SR
        result.append({**line, "dur": round(dur, 3), "mouth": mouths(sig, SR)})
        print(f"  {line['id']:8s} {line['who']:7s} {dur:5.2f}s  {line['text']}")
    json.dump({"episode": a.episode, "exposures": EXPOSURES, "lines": result}, open(os.path.join(out, "lines.json"), "w"), indent=1)
    with open(os.path.join(out, ".gitignore"), "w") as f:
        f.write("*.wav\n")
    print(f"{len(result)} lines, {sum(r['dur'] for r in result):.1f}s of speech -> {out}")


if __name__ == "__main__":
    sys.exit(main())
