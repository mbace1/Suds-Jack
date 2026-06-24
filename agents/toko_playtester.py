"""
Toko Drop Playtester Agent

Evaluates Toko Drop (HTML5 twin-stick shooter) against two genre frameworks:
  - ARCADE track: Nex Machina (flow state, tight controls, score chasing, instant feedback)
  - ROGUELIKE track: Sektori (build variance, run-to-run progression, risk/reward decisions)
"""

import os
import json
import anthropic

CYAN  = "\033[96m"
GREEN = "\033[92m"
YELLOW= "\033[93m"
RED   = "\033[91m"
BOLD  = "\033[1m"
DIM   = "\033[2m"
RESET = "\033[0m"

SYSTEM_PROMPT = """You are an expert game designer and playtester for Toko Drop, an HTML5 twin-stick bullet-hell shooter built with Three.js. It features gelatin physics, 15 distinct enemy types across Blob/Cube/Unique families, dash mechanics, and wave-based progression.

You evaluate the game across TWO genre tracks:

ARCADE TRACK — inspired by Nex Machina:
- Tight, responsive controls with no input lag or awkward movement
- Instant feedback: every action has a clear, satisfying visual/audio response
- Flow state: difficulty ramps so the player is always challenged but not overwhelmed
- Score chasing: are there meaningful score mechanics, multipliers, risk/reward moments?
- Bullet clarity: can the player read the threat space at a glance in 3D?
- "One more run" feel: is death fair and motivating rather than frustrating?
- Twin-stick feel: does move + independent aim create interesting spatial decisions?

ROGUELIKE TRACK — inspired by Sektori:
- Run-to-run variance: does each run feel meaningfully different?
- Build variety: can the player make meaningful choices that shape their playstyle?
- Risk/reward decisions: are there moments where the player gambles for bigger payoff?
- Meta-progression: does the player feel like they're unlocking/discovering something?
- Emergent moments: do mechanics combine in surprising, delightful ways?
- Enemy family synergies: do Blob/Cube/Unique types create varied strategic scenarios?

For each track, rate the current game 1-10 and explain specifically what's working, what's missing, and what's broken.

Also evaluate:
- CONTROLS & FEEL: WASD+mouse aim, dash (space), fire rate, dash cooldown — does it feel good?
- ENEMY VARIETY: 15 enemy types — are they all meaningfully distinct in feel and counter-play?
- DIFFICULTY BALANCE: wave scaling, enemy speeds, bullet patterns, HP values
- FUN GAPS: boring moments, frustrating moments, where engagement drops
- BUG RISKS: edge cases in 3D collision, state machines, death FX pooling, gelatin physics
- VISUAL CLARITY: 3D perspective — can the player read threats, projectiles, hit feedback?
- AUDIO: does the procedural Web Audio API sound design support game feel?
- PROGRESSION: does difficulty ramp across waves? meaningful enemy introduction pacing?

Be specific — reference actual values from the code (speeds, timers, counts, class names).
Reference specific enemy types by name (GLOBBO, SPITTOR, FANNER, WEEVA, SPLITTA, YELA_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, ORANGE_CUBE, TORO, BAMBU, PYRA).

After your report, ask ONE focused question to understand what direction the developer wants to take next."""

TOKO_FILES = [
    'toko-drop/index.html',
    'toko-drop/js/main.js',
    'toko-drop/js/player.js',
    'toko-drop/js/enemy.js',
    'toko-drop/js/bullet.js',
    'toko-drop/js/input.js',
    'toko-drop/js/audio.js',
]

def read_game_files():
    base = os.path.join(os.path.dirname(__file__), '..')
    files = {}
    for rel_path in TOKO_FILES:
        path = os.path.join(base, rel_path)
        try:
            with open(path) as f:
                files[rel_path] = f.read()
        except FileNotFoundError:
            files[rel_path] = f"[{rel_path} not found]"
    return files

def print_header():
    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{CYAN}║   TOKO DROP — PLAYTESTER AGENT       ║{RESET}")
    print(f"{BOLD}{CYAN}╚══════════════════════════════════════╝{RESET}")
    print(f"{DIM}Evaluating against: Nex Machina (arcade) + Sektori (roguelike){RESET}\n")

def print_agent(text):
    print(f"{CYAN}{BOLD}[PLAYTESTER]{RESET} {text}\n")

def print_user_prompt():
    print(f"{GREEN}{BOLD}[YOU]{RESET} ", end="")

def run():
    client = anthropic.Anthropic()
    print_header()

    print(f"{YELLOW}Reading Toko Drop source files...{RESET}")
    files = read_game_files()

    found = [k for k, v in files.items() if not v.startswith('[')]
    missing = [k for k, v in files.items() if v.startswith('[')]
    print(f"{GREEN}  Loaded: {', '.join(found)}{RESET}")
    if missing:
        print(f"{RED}  Missing: {', '.join(missing)}{RESET}")
    print()

    file_summary = "\n\n".join(
        f"=== {name} ===\n{content}" for name, content in files.items()
    )

    messages = [
        {
            "role": "user",
            "content": (
                "Please analyse Toko Drop and give me your playtester report across both genre tracks.\n\n"
                + file_summary
            )
        }
    ]

    print(f"{YELLOW}Running analysis (this may take ~30s for full codebase review)...{RESET}\n")

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=3000,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    reply = response.content[0].text
    messages.append({"role": "assistant", "content": reply})
    print_agent(reply)

    while True:
        print_user_prompt()
        try:
            user_input = input().strip()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{DIM}Session ended.{RESET}\n")
            break

        if user_input.lower() in ("exit", "quit", "q", ""):
            print(f"\n{DIM}Session ended.{RESET}\n")
            break

        messages.append({"role": "user", "content": user_input})

        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=messages
        )
        reply = response.content[0].text
        messages.append({"role": "assistant", "content": reply})
        print()
        print_agent(reply)

if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print(f"{RED}Error: ANTHROPIC_API_KEY environment variable not set.{RESET}")
        raise SystemExit(1)
    run()
