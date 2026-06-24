"""
Suds Jack Playtester Agent

Evaluates game.js against two genre frameworks:
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

SYSTEM_PROMPT = """You are an expert game designer and playtester for Suds Jack, a vector tube shooter (Tempest 2000 x Bomb Jack x Suds 51).

You evaluate the game across TWO genre tracks:

ARCADE TRACK — inspired by Nex Machina:
- Tight, responsive controls with no input lag or awkward movement
- Instant feedback: every action has a clear, satisfying visual/audio response
- Flow state: difficulty ramps so the player is always challenged but not overwhelmed
- Score chasing: are there meaningful score mechanics, multipliers, risk/reward moments?
- Bullet clarity: can the player read the threat space at a glance?
- "One more run" feel: is death fair and motivating rather than frustrating?

ROGUELIKE TRACK — inspired by Sektori:
- Run-to-run variance: does each run feel meaningfully different?
- Build variety: can the player make meaningful choices that shape their playstyle?
- Risk/reward decisions: are there moments where the player gambles for bigger payoff?
- Meta-progression: does the player feel like they're unlocking/discovering something?
- Emergent moments: do mechanics combine in surprising, delightful ways?

For each track, rate the current game 1-10 and explain specifically what's working, what's missing, and what's broken.

Also evaluate:
- DIFFICULTY BALANCE: enemy speeds, wave timing, lives, superzapper cooldown
- FUN GAPS: boring moments, frustrating moments, where the game loses engagement
- BUG RISKS: edge cases in collision, state transitions, infinite loops
- PROGRESSION: does difficulty ramp well across levels? meaningful variety?

Be specific — reference actual values from game.js (speeds, timers, counts).
After your report, ask ONE focused question to understand what direction the developer wants to take next."""

def read_game_files():
    base = os.path.join(os.path.dirname(__file__), '..', 'game')
    files = {}
    for fname in ['game.js', 'levels.json', 'index.html']:
        path = os.path.join(base, fname)
        try:
            with open(path) as f:
                files[fname] = f.read()
        except FileNotFoundError:
            files[fname] = f"[{fname} not found]"
    return files

def print_header():
    print(f"\n{BOLD}{CYAN}╔══════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{CYAN}║   SUDS JACK — PLAYTESTER AGENT       ║{RESET}")
    print(f"{BOLD}{CYAN}╚══════════════════════════════════════╝{RESET}")
    print(f"{DIM}Evaluating against: Nex Machina (arcade) + Sektori (roguelike){RESET}\n")

def print_agent(text):
    print(f"{CYAN}{BOLD}[PLAYTESTER]{RESET} {text}\n")

def print_user_prompt():
    print(f"{GREEN}{BOLD}[YOU]{RESET} ", end="")

def run():
    client = anthropic.Anthropic()
    print_header()

    print(f"{YELLOW}Reading game files...{RESET}")
    files = read_game_files()
    file_summary = "\n\n".join(
        f"=== {name} ===\n{content}" for name, content in files.items()
    )

    messages = [
        {
            "role": "user",
            "content": f"Please analyse Suds Jack and give me your playtester report across both genre tracks.\n\n{file_summary}"
        }
    ]

    print(f"{YELLOW}Running analysis...{RESET}\n")

    # Initial analysis
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    reply = response.content[0].text
    messages.append({"role": "assistant", "content": reply})
    print_agent(reply)

    # Iterative Q&A loop
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
            max_tokens=2000,
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
