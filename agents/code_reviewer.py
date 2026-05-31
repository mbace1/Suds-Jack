"""CodeReviewerAgent — reviews game source files using Claude."""

import os
import anthropic

SYSTEM_PROMPT = """You are an expert game developer reviewing code for Suds Jack, a psychedelic
vector tube shooter built with HTML5 Canvas and vanilla JavaScript.

The game is inspired by Tempest 2000 (tube shooter), Bomb Jack (collectible bombs), and Suds 51.
Core mechanics:
- 3D perspective tube with 8 spokes, player at outer ring
- Enemies crawl inward-to-outer along spokes; player shoots inward
- Rainbow hue cycling, neon glow (shadowBlur), particle explosions
- Three enemy types: basic, flipper (jumps spokes), tanker (splits)
- Golden bomb collectibles, superzapper screen-clear power-up
- requestAnimationFrame game loop, delta-time based movement

When reviewing code, evaluate:
1. CORRECTNESS: Does the logic actually work? Are there bugs in collision detection,
   movement math, or game state transitions?
2. GAME FEEL: Is the pacing good? Do the controls feel responsive? Is difficulty appropriate?
3. PERFORMANCE: Any expensive operations in the render loop? Memory leaks? DOM thrashing?
4. FUN FACTOR: Is this actually enjoyable? What would make it more exciting or satisfying?

Return ONLY valid JSON — no markdown, no explanation outside the JSON structure.
"""


class CodeReviewerAgent:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = 'claude-opus-4-5'

    def review_file(self, filepath: str) -> dict:
        """Review a source file and return structured findings.

        Args:
            filepath: Absolute or relative path to the file to review.

        Returns:
            Dict with keys:
              - issues: list of dicts {line, severity, description}
              - suggestions: list of dicts {category, description, example}
              - verdict: "good" | "needs_work"
              - summary: short overall assessment string
        """
        filepath = os.path.abspath(filepath)
        if not os.path.exists(filepath):
            return {
                'issues': [{'line': 0, 'severity': 'error', 'description': f'File not found: {filepath}'}],
                'suggestions': [],
                'verdict': 'needs_work',
                'summary': 'File not found.'
            }

        with open(filepath, 'r') as f:
            code = f.read()

        filename = os.path.basename(filepath)
        lang = 'JavaScript' if filepath.endswith('.js') else 'Python' if filepath.endswith('.py') else 'text'

        prompt = f"""Review this {lang} file from the Suds Jack game: {filename}

```{lang.lower()}
{code}
```

Return a JSON object with these exact keys:
- "issues": array of objects, each with:
    - "line": approximate line number (integer) or 0 if general
    - "severity": "error" | "warning" | "info"
    - "description": clear explanation of the issue
- "suggestions": array of objects, each with:
    - "category": "correctness" | "game_feel" | "performance" | "fun_factor"
    - "description": what to improve
    - "example": brief code example or description of the improvement
- "verdict": "good" if the code is solid and fun, "needs_work" if there are important issues
- "summary": 1-2 sentence overall assessment

Focus on the most impactful findings. Return ONLY the JSON object."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
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

        import json
        result = json.loads(raw)

        # Ensure required keys exist
        result.setdefault('issues', [])
        result.setdefault('suggestions', [])
        result.setdefault('verdict', 'needs_work')
        result.setdefault('summary', '')

        return result
