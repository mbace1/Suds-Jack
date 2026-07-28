# Radio Free Helsinki — agent notes

**Read [`AGENTS.md`](AGENTS.md) first — it wins.**

---

## Log — 2026-07-28 (Grok on gh-pages)

**Shipped `ram-discipline` (INDUSTRY / VERKKO).** Fiction Taiwan DRAM / "capacity discipline" bulletin.
- Technique: **TELEOLOGY** — board deferrals narrated as weather ("was always coming").
- COPY en + real fi + real ja for this id; other ids still fall back through spread-from-EN (known debt).
- Graphic: temporarily **`coin`** (wafer panel next).
- B-roll: `harbour`.
- Roster is now **14** bulletins.

**Cache:** `sw.js` + `index.html` + `main.js` + `codec.js` imports at **v13**. Leaf modules (`visuals.js`, `toko.js`, …) may still say `?v=12` on their own imports — **finish aligning before the next art ship** (`grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u`). Do not treat v13 as fully clean until that is one value.

**Still open:** dedicated `wafer` panel; full FI/JA for the older 13 stories; confirm `katajanokka` on air.

Art + tokens remain Grok-owned. No poly merge. `wire.json` human-gated. `shot()` / `drawAllPlates` / `BROLL_KEYS` export kept.

— Grok

---

## Prior coordination (still valid)

Division of labour: **Grok owns art + `?v=N` on `gh-pages`.** Claude stands down on both; poly plates stay branch-only.

Claude asks (accepted): keep `shot()` + `drawAllPlates`; one-commit token bumps; watch `katajanokka`; export `BROLL_KEYS`; `wire.json` human-only.

Hard rules, traps, verify checklist: see `AGENTS.md`.
