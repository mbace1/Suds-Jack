#!/usr/bin/env python3
"""Suds Jack Agent Orchestrator — interactive CLI for game content and code iteration."""

import os
import sys
import json

# ANSI color codes
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
BOLD = '\033[1m'
RESET = '\033[0m'
DIM = '\033[2m'

GAME_DIR = os.path.join(os.path.dirname(__file__), '..', 'game')
GAME_JS = os.path.join(GAME_DIR, 'game.js')


def print_banner():
    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════════════╗
║          SUDS JACK — AGENT PIPELINE v1.0                 ║
║    Tempest 2000 × Bomb Jack × Suds 51 × Claude AI        ║
╚══════════════════════════════════════════════════════════╝{RESET}
""")


def print_menu():
    print(f"""
{BOLD}What would you like to do?{RESET}

  {CYAN}1{RESET}  Generate new level content  (Suds Jack)
  {CYAN}2{RESET}  Review game.js code         (Suds Jack)
  {CYAN}3{RESET}  Apply a code suggestion     (Suds Jack)
  {CYAN}4{RESET}  Playtester report           (Suds Jack)
  {CYAN}5{RESET}  Playtester report           (Toko Drop)
  {CYAN}6{RESET}  Exit

""", end='')


def ask(prompt: str) -> str:
    """Prompt user and return stripped input."""
    try:
        return input(f'{CYAN}{prompt}{RESET} ').strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return '4'  # treat as exit


def print_level(level: dict) -> None:
    print(f"""
  {BOLD}Level {level.get('level', '?')}{RESET}
    Wave count     : {YELLOW}{level.get('wave_count', '?')}{RESET}
    Enemy types    : {YELLOW}{', '.join(level.get('enemy_types', []))}{RESET}
    Speed mult     : {YELLOW}{level.get('speed_multiplier', '?')}{RESET}
    Bomb count     : {YELLOW}{level.get('bomb_count', '?')}{RESET}
""")


def handle_generate_levels():
    from agents.content_gen import ContentGeneratorAgent

    print(f'\n{CYAN}How many levels to generate? (default: 5){RESET} ', end='')
    raw = input().strip()
    count = int(raw) if raw.isdigit() else 5

    print(f'\n{CYAN}Any feedback or theme for the levels? (Enter to skip){RESET} ', end='')
    feedback = input().strip() or None

    print(f'\n{YELLOW}Generating {count} levels with Claude...{RESET}\n')

    agent = ContentGeneratorAgent()
    levels = agent.generate_all_levels(count=count, feedback=feedback)

    print(f'\n{GREEN}Generated levels:{RESET}')
    for lv in levels:
        print_level(lv)

    print(f'\n{GREEN}Saved to game/levels.json{RESET}')

    # Ask if happy
    verdict = ask('Happy with these levels? (y/n/feedback):')
    if verdict.lower() not in ('y', 'yes'):
        if len(verdict) > 2:
            feedback2 = verdict
        else:
            feedback2 = ask('What should be different?')
        print(f'\n{YELLOW}Regenerating with feedback...{RESET}\n')
        levels2 = agent.generate_all_levels(count=count, feedback=feedback2)
        print(f'\n{GREEN}Updated levels:{RESET}')
        for lv in levels2:
            print_level(lv)
        print(f'\n{GREEN}Saved to game/levels.json{RESET}')


def handle_review_code():
    from agents.code_reviewer import CodeReviewerAgent

    filepath = ask(f'File to review (default: game/game.js):')
    if not filepath:
        filepath = GAME_JS
    elif not os.path.isabs(filepath):
        filepath = os.path.join(os.path.dirname(__file__), '..', filepath)

    filepath = os.path.abspath(filepath)
    print(f'\n{YELLOW}Reviewing {os.path.basename(filepath)} with Claude...{RESET}\n')

    agent = CodeReviewerAgent()
    review = agent.review_file(filepath)

    # Print verdict
    verdict = review.get('verdict', 'needs_work')
    verdict_color = GREEN if verdict == 'good' else YELLOW
    print(f'{verdict_color}{BOLD}Verdict: {verdict.upper()}{RESET}')
    print(f'{DIM}{review.get("summary", "")}{RESET}\n')

    # Print issues
    issues = review.get('issues', [])
    if issues:
        print(f'{RED}{BOLD}Issues ({len(issues)}):{RESET}')
        for issue in issues:
            sev = issue.get('severity', 'info')
            sev_color = RED if sev == 'error' else YELLOW if sev == 'warning' else CYAN
            line_str = f'L{issue["line"]} ' if issue.get('line') else ''
            print(f'  {sev_color}[{sev.upper()}]{RESET} {line_str}{issue.get("description", "")}')
        print()

    # Print suggestions
    suggestions = review.get('suggestions', [])
    if suggestions:
        print(f'{CYAN}{BOLD}Suggestions ({len(suggestions)}):{RESET}')
        for i, s in enumerate(suggestions, 1):
            cat = s.get('category', 'general')
            cat_color = GREEN if cat == 'fun_factor' else CYAN if cat == 'game_feel' else YELLOW
            print(f'  {BOLD}{i}.{RESET} {cat_color}[{cat}]{RESET} {s.get("description", "")}')
            if s.get('example'):
                print(f'     {DIM}→ {s["example"]}{RESET}')
        print()

    return suggestions


def handle_apply_suggestion(suggestions: list):
    if not suggestions:
        print(f'{YELLOW}No suggestions loaded. Run a code review first (option 2).{RESET}')
        return

    print(f'\n{BOLD}Pick a suggestion number to apply (1-{len(suggestions)}), or describe your own:{RESET} ', end='')
    raw = input().strip()

    description = ''
    if raw.isdigit() and 1 <= int(raw) <= len(suggestions):
        s = suggestions[int(raw) - 1]
        description = f"{s.get('description', '')}. Example: {s.get('example', '')}"
    else:
        description = raw

    if not description:
        print(f'{YELLOW}No description given.{RESET}')
        return

    print(f'\n{YELLOW}Generating patch description with Claude...{RESET}\n')

    import anthropic
    client = anthropic.Anthropic()

    with open(os.path.abspath(GAME_JS), 'r') as f:
        game_code = f.read()

    prompt = f"""Here is the current game.js for Suds Jack (a vector tube shooter):

```javascript
{game_code}
```

A developer wants to apply this improvement:
"{description}"

Describe EXACTLY what code changes to make: which lines/functions to modify, what to change them to,
and why this improves the game. Be specific and reference actual function names and line patterns.
Do NOT rewrite the whole file — just describe the targeted changes needed."""

    message = client.messages.create(
        model='claude-opus-4-5',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}]
    )

    print(f'{CYAN}{BOLD}Patch description:{RESET}')
    print(f'{CYAN}{message.content[0].text}{RESET}')


def main():
    print_banner()
    print(f'{DIM}Suds Jack agent pipeline. Type Ctrl+C or choose 4 to exit.{RESET}\n')

    # Fix import path so agents package is found
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    last_suggestions = []

    while True:
        print_menu()
        choice = ask('Choice:')

        if choice == '1':
            handle_generate_levels()
        elif choice == '2':
            last_suggestions = handle_review_code() or []
        elif choice == '3':
            handle_apply_suggestion(last_suggestions)
        elif choice == '4':
            from agents.playtester import run as run_suds_playtester
            run_suds_playtester()
        elif choice == '5':
            from agents.toko_playtester import run as run_toko_playtester
            run_toko_playtester()
        elif choice == '6':
            print(f'\n{GREEN}Goodbye! Keep it psychedelic.{RESET}\n')
            break
        else:
            print(f'{YELLOW}Please enter 1–6.{RESET}')

        print()
        follow_up = ask('What would you like to change or improve? (Enter to continue to menu)')
        if follow_up:
            print(f'\n{CYAN}Noted: "{follow_up}"{RESET}')
            print(f'{DIM}(Use the menu options above to act on this feedback){RESET}')


if __name__ == '__main__':
    main()
