# Idea drop — The Game of Life

Copy this file (or just its relevant section), fill in what you have, and get
it to Claude either way:

- **Paste it straight into a Claude session** — a filled template, half a
  template, or three loose sentences all work; gaps get filled in.
- **Commit it to this folder** (`gameoflife/ideas/your-idea.md`) on any branch
  and mention it in a session — "there's a new idea file" is enough.

Any of the three languages (en/fi/ja) is fine — the other two get translated
during implementation. Nothing here needs to be complete: **a strong single
image or one true fact is a better seed than a finished design.**

---

## Story (the 70%)

```
Title / working name:
Setting (place + era, if historical):
The one true thing it teaches:      # one sentence — the fact or idea that stays with the player
Scene beats (3–6 lines):            # what the player sees, in order
Choice moments (1–2):               # where the player decides, and the two options
The nature revert:                  # what real-world thing it sends the player to do — REQUIRED, this is the point
Mood / references:                  # optional — a painting, a memory, a photo, a song
```

## Game / puzzle (the 20%)

```
Title / working name:
Core interaction:                   # ONE verb: rotate / trace / pour / time / balance / sort...
What it teaches while being fun:
The win moment:                     # what the player sees when it clicks (water flows, stars connect...)
Rough difficulty arc:               # e.g. 3 levels, or one puzzle that deepens
The nature revert:
```

## Kernel of wisdom (the 10%)

```
Source story:                       # zen koan, folk tale, proverb — must be public domain / traditional
The single interaction:             # the ONE thing the player does that makes the point land
                                    # (in A Cup of Tea, the player does the overpouring themselves)
The nature revert:
```

## Graphics / scenes

Everything is drawn in code on a 192×128 pixel canvas (the hub scene is
192×44), flat colours from `js/palette.js`, no image assets. Best formats,
in order of usefulness:

1. **Words** — "a bog at dawn, mist in two layers, one crooked pine on the
   left, cloudberries glowing orange low in the frame." Scene descriptions
   translate almost directly into code.
2. **Any image as a mood reference** — a photo, a painting link, a child's
   drawing, a screenshot from another game. It gets re-composed in the
   project palette, not copied.
3. **A rough grid sketch** — ASCII art or an actual low-res PNG mock at
   192×128 (or any size; it gets adapted). Same idea as hyperdagger's
   string-art voxels: rows of characters where each letter is a colour.
4. **Palette suggestions** — new colours go into `palette.js` with a name;
   say what feeling the colour is for, not just the hex.

## Poems (for the evening pool)

Public domain only (author dead 70+ years, or traditional). Give the original
+ author + year; translations into the other two languages happen during
implementation. All cultures welcome — the pool mixes them on purpose.
