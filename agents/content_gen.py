"""ContentGeneratorAgent — generates level configs for Suds Jack using Claude."""

import json
import os
import anthropic

SYSTEM_PROMPT = """You are a game designer for Suds Jack, a psychedelic vector tube shooter.
The game is a mashup of Tempest 2000, Bomb Jack, and Suds 51.

Game mechanics you must understand:
- The playfield is a 3D tube/web with 8 spokes and 5 concentric rings.
- The player sits at the outer ring and moves between 8 spoke positions.
- Enemies spawn at the center (vanishing point) and crawl outward along spokes.
  - "basic": simple enemy, moves straight down a spoke
  - "flipper": moves between spokes unpredictably, harder to hit
  - "tanker": slow but splits into two basic enemies at midpoint — very dangerous
- Bombs are golden collectibles that drift slowly and award 500 pts when collected.
- Players shoot inward (toward the vanishing point) to destroy enemies.
- "speed_multiplier" scales enemy movement speed (1.0 = normal, 2.0 = very fast).
- "wave_count" determines how many waves spawn per level (each wave = 2-4 enemies).
- Higher level numbers should be harder: more enemies, more dangerous types, faster.

You must return ONLY valid JSON — no explanation text, just the JSON array or object.
"""

GAME_LEVELS_PATH = os.path.join(os.path.dirname(__file__), '..', 'game', 'levels.json')


class ContentGeneratorAgent:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = 'claude-opus-4-5'  # fallback-safe name

    def generate_level(self, level_num: int, feedback: str | None = None) -> dict:
        """Generate a level config dict for the given level number.

        Args:
            level_num: 1-based level number (higher = harder).
            feedback: Optional user feedback from previous iteration.

        Returns:
            A level config dict with keys: level, wave_count, enemy_types,
            speed_multiplier, bomb_count.
        """
        feedback_text = ''
        if feedback:
            feedback_text = f'\n\nUser feedback on the previous version: {feedback}'

        prompt = f"""Generate a level configuration for level {level_num} of Suds Jack.
{feedback_text}

Return a single JSON object (not an array) with these exact keys:
- "level": integer, the level number ({level_num})
- "wave_count": integer 3-8, how many enemy waves to spawn
- "enemy_types": array of strings from ["basic", "flipper", "tanker"]
- "speed_multiplier": float 0.8-3.0, scales enemy speed
- "bomb_count": integer 2-8, number of collectible bombs

Make level {level_num} appropriately challenging. Level 1 should be easy (only basic enemies,
slow speed). Higher levels should introduce flippers and tankers, increase wave count and speed.
Provide creative but balanced difficulty scaling.

Return ONLY the JSON object, nothing else."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': prompt}]
        )

        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        raw = raw.strip()

        config = json.loads(raw)
        config['level'] = level_num  # ensure correct level number
        return config

    def generate_all_levels(self, count: int = 5, feedback: str | None = None) -> list[dict]:
        """Generate `count` levels and save to game/levels.json."""
        levels = []
        for i in range(1, count + 1):
            print(f'  Generating level {i}...')
            lv = self.generate_level(i, feedback=feedback if i == 1 else None)
            levels.append(lv)
        self._save(levels)
        return levels

    def _save(self, levels: list[dict]) -> None:
        path = os.path.abspath(GAME_LEVELS_PATH)
        with open(path, 'w') as f:
            json.dump(levels, f, indent=2)
        print(f'  Saved {len(levels)} levels to {path}')
