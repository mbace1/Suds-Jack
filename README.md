# Suds Jack
**Bomb Jack × Suds 51 × Tempest 2000** — A psychedelic vector tube shooter for the browser.

Pilot a neon claw around the outer ring of a 3D wire-frame tube, blast enemies crawling out of
the vanishing point, collect golden bomb orbs, and survive as long as you can while the geometry
throbs with rainbow colour.

---

## Running the Game

```bash
python server.py
```

Open **http://localhost:8080** in any modern browser.

### Controls

| Key | Action |
|-----|--------|
| `←` / `A` | Move left along the outer ring |
| `→` / `D` | Move right along the outer ring |
| `Space` | Shoot (hold to auto-fire) |
| `Z` | Superzapper — clears all enemies in a rainbow explosion (15 s cooldown) |
| `Enter` | Start / Restart |

---

## Enemies

| Type | Colour | Behaviour | Points |
|------|--------|-----------|--------|
| Basic | White | Crawls straight down a spoke | 100 |
| Flipper | Cyan-shifted | Jumps unpredictably between spokes | 250 |
| Tanker | Orange-shifted | Slow but splits into two Basics at midpoint | 500 |

Collect **golden orbs** drifting on the web for **500 bonus points** each.

---

## Python Agent Pipeline

The `agents/` directory contains a Claude-powered pipeline for generating level content and
reviewing the game code.

### Setup

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-...
```

### Running the Orchestrator

```bash
python agents/orchestrator.py
```

Interactive CLI menu:

1. **Generate new level content** — Claude designs balanced wave patterns and saves them to
   `game/levels.json`, which the game loads at start.
2. **Review game code** — Claude reads `game/game.js` and returns structured findings:
   issues (with severity), suggestions (by category), and an overall verdict.
3. **Apply a code suggestion** — Pick a suggestion from the last review; Claude describes the
   exact targeted code changes needed.
4. **Exit**

After each action the orchestrator asks what you'd like to change, letting you iterate rapidly.

### Agent Modules

| Module | Class | Purpose |
|--------|-------|---------|
| `agents/content_gen.py` | `ContentGeneratorAgent` | `generate_level(n, feedback)` → level dict; `generate_all_levels(count)` → saves `levels.json` |
| `agents/code_reviewer.py` | `CodeReviewerAgent` | `review_file(path)` → `{issues, suggestions, verdict, summary}` |
| `agents/orchestrator.py` | — | Interactive CLI wiring the agents together |

---

## Project Structure

```
Suds-Jack/
├── game/
│   ├── index.html       # Canvas + HUD overlay
│   ├── game.js          # Full game engine (requestAnimationFrame loop)
│   ├── style.css        # Neon HUD styling
│   └── levels.json      # Level wave definitions (editable / AI-generated)
├── agents/
│   ├── __init__.py
│   ├── content_gen.py   # Level generation agent
│   ├── code_reviewer.py # Code review agent
│   └── orchestrator.py  # Interactive pipeline CLI
├── server.py            # Python HTTP server on :8080
├── requirements.txt     # anthropic SDK
└── README.md
```

---

## Psychedelic Effects

- **Rainbow web** — hue cycles through 360 degrees on every spoke and ring, 0.5 degrees/frame
- **Neon glow** — `ctx.shadowBlur = 15` on all geometry draws
- **Particle bursts** — 18 colour-spread particles on every enemy kill
- **Superzapper** — expanding concentric rainbow rings sweep the screen
- **Screen shake** — exponentially-decaying shake on player death
- **Motion blur** — `rgba(0,0,0,0.88)` clear each frame leaves faint trails
