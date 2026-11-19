#!/usr/bin/env python3
# campaign-rooms.py — the thirty-six campaign rooms (CAMPAIGN_PLAN.md): twenty-four
# as patterns here, twelve designed by hand (campaign-hand.json).
# `python3 scripts/campaign-rooms.py levels` rewrites levels/*.json WITHOUT tiers:
# run `node scripts/room-tiers.mjs --write` after it, which plays every room and
# sets them. Spawn positions come from small helpers so a room reads as a
# composition (rings, lines, bursts from one side) rather than a scatter.
import json, math, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def rect(hx, hz, **m): return {"kind": "rect", "hx": hx, "hz": hz, **m}
def circ(x, z, r, **m): return {"kind": "circle", "c": [x, z], "r": r, **m}

def edge(arena, a, inset=1.6):
    """a point just inside the room's outline at angle a (radians)"""
    s = arena["shapes"][0]
    if s["kind"] == "circle" and len(arena["shapes"]) == 1:
        r = s["r"] - inset
        return round(s["c"][0] + math.cos(a) * r, 2), round(s["c"][1] + math.sin(a) * r, 2)
    hx = max(p.get("hx", 0) or (abs(p["c"][0]) + p["r"] if p["kind"] == "circle" else 0) for p in arena["shapes"]) - inset
    hz = max(p.get("hz", 0) or (abs(p["c"][1]) + p["r"] if p["kind"] == "circle" else 0) for p in arena["shapes"]) - inset
    dx, dz = math.cos(a), math.sin(a)
    k = min(hx / abs(dx) if abs(dx) > 1e-9 else 1e9, hz / abs(dz) if abs(dz) > 1e-9 else 1e9)
    return round(dx * k, 2), round(dz * k, 2)

def sp(t, typ, x, z, **o): return {"t": round(t, 2), "type": typ, "px": x, "pz": z, **o}

def ring(arena, t, typ, n, a0=0.0, inset=1.6, **o):
    return [sp(t, typ, *edge(arena, a0 + i * 2 * math.pi / n, inset), **o) for i in range(n)]

def stream(arena, t0, every, types, n, a0=0.0, step=2.39996, **o):
    """one at a time from round the edge, the golden angle apart"""
    return [sp(t0 + i * every, types[i % len(types)], *edge(arena, a0 + i * step), **o) for i in range(n)]

def side(arena, t, typ, n, a, spread=0.8, **o):
    """a burst from one side"""
    return [sp(t, typ, *edge(arena, a + (i - (n - 1) / 2) * spread / max(1, n - 1) * 2), **o) for i in range(n)]

ROOMS = []
def room(id, name, world, d, teaches, arena, duration, goal, spawns, bandNote=None, **extra):
    L = {"format": 2, "id": id, "name": name, "arena": arena, "duration": duration, "goal": goal,
         "plan": {"world": world, "d": d, "teaches": teaches}, "spawns": sorted(spawns, key=lambda s: s["t"])}
    if bandNote: L["plan"]["bandNote"] = bandNote
    L.update(extra)
    ROOMS.append(L)

B = lambda hx, hz, **m: {"shapes": [rect(hx, hz, **m)]}

# ── THE SURFACE — learn the hands ─────────────────────────────────────
A = B(17, 10)
room("gate-run", "GATE RUN", 0, 6, "the gates, the dash", A, 35, {"type": "gates"},
     stream(A, 0.5, 1.2, ["GLOBBO", "FANNER", "YELA_CUBE", "SPITTOR"], 28, 0.4),
     gates=[{"t": 0, "x": -8, "z": 0, "angle": 0}, {"t": 0, "x": 8, "z": 0, "angle": 0},
            {"t": 7, "x": 0, "z": 5.5, "angle": 1.5708}, {"t": 14, "x": -10, "z": -5, "angle": 0.8},
            {"t": 20, "x": 10, "z": 5, "angle": 2.3}, {"t": 24, "x": -12, "z": 6, "angle": 0.4}, {"t": 24, "x": 4, "z": -6, "angle": 1.2}])
A = B(15, 9)
room("hands-up", "HANDS UP", 0, 5, "the gates as a weapon", A, 30, {"type": "survive"},
     stream(A, 1, 1.45, ["GLOBBO"], 20, 0.2, speedMult=0.72),
     mods={"noGun": True},
     gates=[{"t": 0, "x": -6, "z": 0, "angle": 0}, {"t": 0, "x": 6, "z": 0, "angle": 0},
            {"t": 12, "x": 0, "z": -4, "angle": 1.5708}, {"t": 12, "x": 0, "z": 4, "angle": 1.5708}])

# ── THE WELL (current) — the floor moves ──────────────────────────────
A = B(19, 11)
room("undertow", "UNDERTOW", 1, 6, "the current", A, 30, {"type": "survive"},
     stream(A, 0, 1.3, ["GLOBBO", "GLOBBO", "FANNER"], 22, 0.0))
A = {"shapes": [circ(0, 0, 11)]}
room("eddy", "EDDY", 1, 2, "where you stand", A, 24, {"type": "hold", "need": 15, "zone": {"x": 0, "z": 0, "r": 1.9, "orbit": {"r": 6, "period": 9, "phase": 0}}, "drain": 2},
     stream(A, 1, 1.5, ["GLOBBO", "YELA_CUBE", "FANNER", "SPITTOR"], 26, 0.7, speedMult=1.15))
A = B(15, 10)
order_pts = [(-10, -6), (10, 6), (-10, 6), (10, -6), (0, -7), (0, 7), (-12, 0), (12, 0)]
room("in-order", "ONE BY ONE", 1, 2, "weeva", A, 40, {"type": "order"},
     [sp(0.3 * i, "WEEVA" if i % 3 == 2 else "GLOBBO", x, z, order=i + 1) for i, (x, z) in enumerate(order_pts)])
A = {"shapes": [circ(0, 0, 12)]}
room("the-sludge", "THE SLUDGE", 1, 3, "the boss wave", A, 55, {"type": "boss"},
     [sp(0, "sludge", 0, -6, boss=True, hp=150)] + stream(A, 3, 3.2, ["GLOBBO", "YELA_CUBE", "SPITTOR"], 15, 1.2, speedMult=1.1))

# ── THE VEIN (sweep) — lines and pressure ─────────────────────────────
A = B(18, 11, pulse={"from": 1, "to": 0.45, "period": 36, "mode": "shrink", "steps": 4})
room("pulse", "PULSE", 2, 5, "a floor that closes in", A, 40, {"type": "survive"},
     stream(A, 0, 1.15, ["GLOBBO", "YELA_CUBE", "REDD_CUBE", "GLOBBO"], 35, 0.3))
A = {"combine": "union", "shapes": [rect(19, 5), rect(6, 11)]}
room("crossfire", "CROSSFIRE", 2, 9, "the curtain wave", A, 30, {"type": "survive", "metric": "hits"},
     [sp(0, "WEEVA", -16, 0, intervalMult=1.4), sp(0, "WEEVA", 16, 0, intervalMult=1.4), sp(4, "PYRA", 0, -9, intervalMult=1.4), sp(4, "PYRA", 0, 9, intervalMult=1.4),
      sp(10, "FANNER", -16, 3, intervalMult=1.4), sp(10, "FANNER", 16, -3, intervalMult=1.4), sp(16, "WEEVA", 0, -9, intervalMult=1.4), sp(16, "WEEVA", 0, 9, intervalMult=1.4), sp(21, "PYRA", -16, -3, intervalMult=1.4), sp(21, "PYRA", 16, 3, intervalMult=1.4)] + stream(A, 1, 2.0, ["GLOBBO"], 14, 0.3))
A = {"shapes": [circ(0, 0, 12)]}
room("clot", "CLOT", 2, 4, "holding a crowd", A, 40, {"type": "protect", "heart": {"x": 0, "z": 0, "r": 1.4, "hp": 8}},
     stream(A, 0, 1.3, ["GLOBBO", "GLOBBO", "YELA_CUBE", "REDD_CUBE"], 28, 0.0),
     hard={"cap": 4, "near": 4})
A = B(17, 10)
room("splitter", "SPLITTER", 2, 4, "splitta", A, 40, {"type": "quota", "kills": 20},
     stream(A, 0, 3.5, ["SPLITTA"], 9, 0.5) + stream(A, 2, 3.5, ["GLOBBO", "FANNER"], 9, 2.0))
A = B(19, 11)
room("spike", "SPIKE", 2, 6, "the spike wave", A, 35, {"type": "clear"},
     ring(A, 0, "GLOBBO", 3, 0.5) + ring(A, 6, "REDD_CUBE", 6, 0.2) + ring(A, 6, "SHEPHERD", 3, 1.0)
     + ring(A, 6.5, "GLOBBO", 8, 0.4) + ring(A, 7, "YELA_CUBE", 4, 0.0) + ring(A, 7.5, "REDD_CUBE", 3, 0.7, speedMult=1.2))

# ── THE VOID (dark) — what you cannot see ─────────────────────────────
A = B(19, 11)
room("lights-out", "LIGHTS OUT", 3, 4, "cloaker", A, 45, {"type": "hunt", "kind": "CLOAKER"},
     stream(A, 0, 1.2, ["GLOBBO", "GLOBBO", "YELA_CUBE"], 36, 0.3) + [sp(2, "CLOAKER", -15, 7), sp(4, "CLOAKER", 15, -7), sp(6, "CLOAKER", 0, 8), sp(8, "CLOAKER", 0, -8), sp(10, "CLOAKER", 15, 7)])
A = {"shapes": [circ(0, 0, 12)]}
room("the-pull", "THE PULL", 3, 2, "magna", A, 40, {"type": "quota", "kills": 18},
     [sp(0, "MAGNA", 0, 0)] + stream(A, 0.5, 0.75, ["GLOBBO", "GLOBBO", "YELA_CUBE", "SPITTOR"], 40, 0.0) + [sp(14, "MAGNA", 6, 6), sp(26, "MAGNA", -6, -6)])
A = B(15, 9)
room("six-shots", "SIX SHOTS", 3, 5, "aiming", A, 45, {"type": "clear"},
     stream(A, 0, 2.1, ["GLOBBO", "GLOBBO", "YELA_CUBE"], 13, 0.9), mods={"ammo": 60})
A = {"combine": "intersect", "shapes": [circ(0, 0, 10, orbit={"r": 3.5, "period": 14, "phase": 0}),
                                         circ(0, 0, 10, orbit={"r": 3.5, "period": 14, "phase": 2.094}),
                                         circ(0, 0, 10, orbit={"r": 3.5, "period": 14, "phase": 4.189})]}
KO, RO, SO, NO, KINDS = 1.0, 7.5, 0.8, 99, ["YELA_CUBE", "GLOBBO", "FANNER", "YELA_CUBE", "SPITTOR", "GLOBBO"]
room("orbit", "ORBIT", 3, 8, "a floor that moves", A, 35, {"type": "survive"},
     # in threes round the floor, so the moving floor carries one toward you while you turn to the others
     [sp(0.5 + KO * (i // 3), KINDS[(i // 3) % len(KINDS)] if i % 3 == 0 else "GLOBBO", round(math.cos(i * 2.094 + (i // 3) * 0.7) * RO, 2), round(math.sin(i * 2.094 + (i // 3) * 0.7) * RO, 2), speedMult=SO) for i in range(NO)],
     hard={"cap": 4})
A = {"shapes": [circ(0, 0, 12)]}
room("siren", "SIREN", 3, 8, "siren, purp", A, 55, {"type": "boss"},
     [sp(0, "SIREN", 0, -7, boss=True, hp=170)] + stream(A, 2, 2.2, ["PURP_CUBE", "GLOBBO", "GLOBBO", "GLOBBO", "FANNER"], 22, 2.0))

# ── THE FOAM (slip) — carry it ────────────────────────────────────────
A = {"shapes": [circ(0, 0, 11)]}
room("rink", "RINK", 4, 1, "the dash's CUT", A, 40, {"type": "clear"},
     stream(A, 0, 1.45, ["GLOBBO", "YELA_CUBE", "GLOBBO"], 24, 0.4, speedMult=1.2), mods={"noGun": True, "dash": "cut"})
A = B(19, 11)
room("skate", "SKATE", 4, 9, "the streak; skata", A, 45, {"type": "combo", "streak": 25},
     [sp(0, "skata", -12, 5), sp(6, "skata", 12, -5), sp(14, "skata", -12, -5), sp(20, "skata", 12, 5), sp(26, "skata", 0, -7), sp(30, "skata", 12, -5), sp(34, "skata", -12, 5)] + stream(A, 0, 1.3, ["GLOBBO", "FANNER", "YELA_CUBE"], 26, 0.2) + [sp(22, "skata", 0, 7)],
     hard={"cap": 2})
A = B(19, 9)
orbs = [(-14, -5), (14, 5), (-14, 5), (14, -5), (0, 0), (-7, 0), (7, 0), (0, -6)]
room("salmon", "SALMON", 4, 3, "toro; salma", A, 40, {"type": "collect", "orbs": [{"t": 2 + i * 3, "x": x, "z": z} for i, (x, z) in enumerate(orbs)]},
     [sp(2, "FANNER", 0, 7), sp(10, "FANNER", 0, -7), sp(18, "FANNER", -15, 0), sp(26, "FANNER", 15, 0), sp(0, "TORO", 15, 0, speedMult=1.3), sp(4, "salma", -15, 4), sp(4, "salma", -15, -4), sp(8, "TORO", -15, 0, speedMult=1.3), sp(9, "salma", 0, 7), sp(12, "TORO", 0, -7, speedMult=1.3), sp(14, "salma", 15, 4), sp(16, "salma", 15, -4), sp(18, "TORO", 0, 7), sp(22, "salma", -15, 0), sp(24, "TORO", 15, -6), sp(26, "salma", 15, 0), sp(30, "TORO", -15, 6)])

# ── THE KILN (updraft) — everything ───────────────────────────────────
A = B(15, 11)
room("bellows", "BELLOWS", 5, 7, "steama", A, 45, {"type": "clear"},
     [sp(0, "steama", -11, -7), sp(0, "steama", 11, 7), sp(12, "steama", 0, 8), sp(22, "steama", 0, -8)] + stream(A, 1, 1.12, ["YELA_CUBE", "GLOBBO", "SPITTOR", "GLOBBO", "FANNER"], 32, 0.0, speedMult=1.25))
A = B(19, 11)
room("anvil", "ANVIL", 5, 7, "elites", A, 45, {"type": "quota", "kills": 14},
     stream(A, 0, 2.2, ["GLOBBO", "YELA_CUBE", "FANNER", "ORANGE_CUBE"], 18, 0.5, elite=True))
A = {"combine": "union", "shapes": [circ(-10, 0, 7), circ(10, 0, 7), rect(10, 1.8)]}
room("forge", "FORGE", 5, 7, "draper; two rooms", A, 40, {"type": "survive"},
     [sp(0, "DRAPER", 12, 0), sp(8, "DRAPER", -12, 0), sp(18, "DRAPER", 12, 3), sp(28, "DRAPER", -12, -3)] + [sp(1.05 * i, ["GLOBBO", "YELA_CUBE", "SPITTOR", "FANNER"][i % 4], (12 if i % 4 < 2 else -12), round(math.sin(i) * 4, 2), speedMult=1.35) for i in range(36)])
A = {"shapes": [circ(0, 0, 12)]}
room("crucible", "CRUCIBLE", 5, 10, "the later waves' speed", A, 45, {"type": "survive"},
     stream(A, 0, 1.0, ["GLOBBO", "YELA_CUBE", "GLOBBO", "REDD_CUBE", "FANNER", "GLOBBO", "steama"], 43, 0.0), mods={"escalate": {"every": 10, "speed": 0.17}})
A = B(17, 10)
room("the-core", "THE CORE", 5, 10, "everything; mirra, glowa", A, 60,
     {"type": "gauntlet", "stages": [{"at": 0, "rule": None}, {"at": 10, "rule": "current"}, {"at": 20, "rule": "sweep"},
                                     {"at": 30, "rule": "dark"}, {"at": 40, "rule": "slip"}, {"at": 50, "rule": "updraft"}]},
     [sp(0, "mirra", 0, -7)] + stream(A, 1.5, 1.3, ["GLOBBO", "YELA_CUBE", "glowa", "SPITTOR", "GLOBBO", "REDD_CUBE", "FANNER"], 42, 0.3) + [sp(20, "mirra", 0, 7), sp(40, "mirra", -12, 0)])

# the skills each room asks for (CAMPAIGN_PLAN.md, the strategy curve): one a
# room in THE SURFACE, all five of them; a pair in the next two worlds, every
# one of the ten pairs; three or more under the last three worlds' rules, and
# more still at the end. The hand rooms carry their own.
STRATEGY = {
 "gate-run": ["movement"],
 "hands-up": ["risk"],
 "undertow": ["position", "movement"],
 "eddy": ["position", "risk"],
 "in-order": ["priority", "position"],
 "the-sludge": ["priority", "movement"],
 "pulse": ["position", "aim"],
 "crossfire": ["movement", "aim"],
 "clot": ["risk", "priority"],
 "splitter": ["priority", "aim"],
 "spike": ["risk", "aim"],
 "lights-out": ["priority", "position", "risk"],
 "the-pull": ["position", "aim", "priority"],
 "six-shots": ["aim", "priority", "risk"],
 "orbit": ["position", "movement", "risk"],
 "siren": ["priority", "movement", "aim"],
 "rink": ["movement", "risk", "priority"],
 "skate": ["risk", "aim", "movement"],
 "salmon": ["movement", "position", "priority"],
 "bellows": ["priority", "position", "aim"],
 "anvil": ["priority", "aim", "risk"],
 "forge": ["position", "movement", "priority"],
 "crucible": ["aim", "movement", "position", "risk"],
 "the-core": ["position", "priority", "aim", "movement", "risk"]
}
for L in ROOMS:
    L["plan"]["strategy"] = STRATEGY[L["id"]]

# ── the rooms designed by hand (v46) ──────────────────────────────────
# (A room's `hard`, here or in a hand room, overrides TUNING.revenge.room for
# its HARD version: the corpse fire is tuned per room like everything else.)
# Twelve rooms were designed one at a time, each played by the bot at its
# three skills and tuned until it met the campaign's targets
# (scripts/room-eval.mjs): six rebuilt from nothing in the slots of the six
# that scored under 7, six new. They are kept as they were made, each its
# level file minus its tiers, in campaign-hand.json; each carries its own
# strategy.
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "campaign-hand.json")) as f:
    for L in json.load(f):
        L.pop("tiers", None); L.pop("tiersHard", None)
        ROOMS.append(L)

# ── THE CLOCKS (v51, owner 2026-10-27: "the times should change per room";
# "wider spread of clocks"). A room is graded on its score now, so its clock
# is how long it asks you to keep scoring: sprints of 18-25 s, standard rooms,
# and long ones of 60-100 s. A room cut shorter is COMPRESSED — the
# same bodies, gates and orbs sooner, its ring's need and moving floor scaled
# with it; a room made longer keeps what it was and LOOPS its bodies after it
# (each pass `LOOP_SPEED` faster), never its boss.
CLOCKS = {
 "first-light": 25, "high-ground": 60, "three-rings": 30, "first-swarm": 60, "hands-up": 25, "gate-run": 25,
 "in-order": 30, "eddy": 20, "the-sludge": 60, "flotsam": 60, "slug-run": 45, "undertow": 45,
 "splitter": 25, "clot": 60, "pulse": 45, "spike": 30, "needle": 40, "crossfire": 45,
 "the-pull": 30, "lights-out": 60, "six-shots": 30, "orbit": 50, "deep-end": 75, "siren": 90,
 "rink": 40, "salmon": 50, "pack-ice": 60, "breath": 50, "skate": 45, "bubble-bath": 55,
 "forge": 60, "anvil": 30, "bellows": 40, "boil-over": 75, "crucible": 50, "the-core": 100,
}
LOOP_SPEED = 0   # a loop at the same pace: v51's first cut sped each up 8% and the long rooms drowned the average bot
# THE MUTATORS (v51, sim/heat.js): HEAT is every room's multiplier; a few
# rooms change how it pays. BANK holds the points in a pot until the heat
# cools (a hit loses it); COLD GUN makes every shot cost heat (Rush's juggle —
# owner: "good for a room or two, likely not main system"). v60: WHITE HEAT lifts
# the ceiling from ×8 to ×16, in THE POUR (where every bot sat on ×8) and CRUCIBLE
# (where only the good player gets there); and THE BRAID BANKs, because there a
# first-timer, hit more but heating on close kills, out-scored the ordinary player.
# Every world now has a mutator room. Measured with scripts/room-tiers.mjs, never by eye
MUTATORS = {"the-pull": ["bank"], "forge": ["bank"], "bubble-bath": ["bank"], "slug-run": ["bank"],
            "spike": ["coldgun"], "skate": ["coldgun"], "first-swarm": ["white"], "crucible": ["white"]}

def retime(L, D):
    old = L["duration"]
    if D == old: return
    f = D / old
    if f < 1:
        for x in L["spawns"]: x["t"] = round(x["t"] * f, 2)
        for g in L.get("gates", []): g["t"] = round(g["t"] * f, 2)
        G = L["goal"]
        for o in G.get("orbs", []):
            o["t"] = round(o["t"] * f, 2)
            if "life" in o: o["life"] = round(o["life"] * f, 2)
        if "life" in G: G["life"] = round(G["life"] * f, 2)
        if G["type"] in ("hold", "hills") and "need" in G: G["need"] = round(G["need"] * f, 1)
        if G["type"] == "escort": G["speed"] = round(G.get("speed", 2) / f, 2)
        for st in G.get("stages", []): st["at"] = round(st["at"] * f, 2)
        for sh in L["arena"]["shapes"]:
            for k in ("orbit", "pulse"):
                if k in sh: sh[k]["period"] = round(sh[k]["period"] * f, 2)
        if L.get("mods", {}).get("escalate"): L["mods"]["escalate"]["every"] = round(L["mods"]["escalate"]["every"] * f, 2)
    else:
        base = [x for x in L["spawns"] if not x.get("boss") and x.get("kind") != "pickup"]
        k = 1
        while k * old < D - 2:
            for x in base:
                t = x["t"] + k * old
                if t >= D - 2: continue
                c = dict(x); c["t"] = round(t, 2); c["speedMult"] = round(x.get("speedMult", 1) * (1 + LOOP_SPEED * k), 3)
                c.pop("order", None)
                L["spawns"].append(c)
            k += 1
        L["spawns"].sort(key=lambda x: x["t"])
        G = L["goal"]
        for st in G.get("stages", []): st["at"] = round(st["at"] * f, 2)
    L["duration"] = D

for L in ROOMS:
    retime(L, CLOCKS[L["id"]])
    if L["id"] in MUTATORS: L["score"] = {"mutators": MUTATORS[L["id"]]}

# ── THE RETUNE (v57, owner 2026-10-28: "Retune"). v56's bots, which play like
# people, found ten rooms outside the difficulty band their `d` asks for
# (scripts/lines.mjs BANDS): the hardest ones too easy for an ordinary player,
# three a first-timer got through too often, and RINK too hard — that one was
# the bot's (it shied from the body it meant to CUT through), fixed in the bot.
# Each room moves with its own knobs, measured at room-tiers' 24 seeds, never by eye:
#   speed  × every body's speedMult          fire   × every body's intervalMult (under 1: fires sooner)
#   elite  every n-th body comes elite       more   every n-th body comes with a twin from the
#                                                   other side of the room, 0.4 s later
#   goal / mods   the room's own numbers (ammo, a streak, how fast it escalates)
RETUNE = {
 "crossfire": {"fire": 0.55},          # an ordinary player got through 92%: the curtain now asks something
 "bubble-bath": {"fire": 0.65},        # 92%
 "first-swarm": {"speed": 1.25},       # a first-timer got through 96-100%
 "hands-up": {"speed": 1.6},           # 100%: the gates are a weapon only if something comes at you
 "six-shots": {"mods": {"ammo": 55}},  # 96%: a first-timer's wild shots run the clip dry
 "skate": {"fire": 0.45},              # 100%, never hit once: its FANNERs now keep a streak honest
 "the-core": {"more": 2},              # 100%: the last room had room to breathe
 "breath": {"more": 4},                # 100%: a quarter more bodies while the floor breathes in
 "crucible": {"more": 2, "elite": 3, "mods": {"escalate": {"every": 10, "speed": 0.24}}},   # 100%: more, tougher, and faster sooner
}
def tune(L, R):
    body = lambda x: not x.get("boss") and x.get("kind") != "pickup"
    for x in L["spawns"]:
        if not body(x): continue
        if "speed" in R: x["speedMult"] = round(x.get("speedMult", 1) * R["speed"], 3)
        if "fire" in R: x["intervalMult"] = round(x.get("intervalMult", 1) * R["fire"], 3)
    if "elite" in R:
        n = 0
        for x in L["spawns"]:
            if not body(x): continue
            n += 1
            if n % R["elite"] == 0: x["elite"] = True
    if "more" in R:
        add, n = [], 0
        for x in L["spawns"]:
            if not body(x): continue
            n += 1
            if n % R["more"] == 0 and x["t"] + 0.4 < L["duration"] - 2:
                c = dict(x); c["t"] = round(x["t"] + 0.4, 2); c["px"] = -x["px"]; c["pz"] = -x["pz"]; c.pop("order", None)
                add.append(c)
        L["spawns"] = sorted(L["spawns"] + add, key=lambda s: s["t"])
    for k, v in R.get("goal", {}).items(): L["goal"][k] = v
    for k, v in R.get("mods", {}).items(): L.setdefault("mods", {})[k] = v
for L in ROOMS:
    if L["id"] in RETUNE: tune(L, RETUNE[L["id"]])

# the order the campaign walks them, world by world: each world's rooms from
# the easiest to the hardest as the bot measured them (scripts/room-eval.mjs),
# which is the order TUNING.campaign.worlds lists them in
ORDER = [["first-light", "high-ground", "three-rings", "first-swarm", "hands-up", "gate-run"],
         ["in-order", "eddy", "the-sludge", "flotsam", "slug-run", "undertow"],
         ["splitter", "clot", "pulse", "spike", "needle", "crossfire"],
         ["the-pull", "lights-out", "six-shots", "orbit", "deep-end", "siren"],
         ["rink", "salmon", "pack-ice", "breath", "skate", "bubble-bath"],
         ["forge", "anvil", "bellows", "boil-over", "crucible", "the-core"]]
assert len(ROOMS) == 36, len(ROOMS)
assert len({r["id"] for r in ROOMS}) == 36
assert sorted(sum(ORDER, [])) == sorted(r["id"] for r in ROOMS)
by = {r["id"]: r for r in ROOMS}
for w, ids in enumerate(ORDER):
    assert len(ids) == 6 and all(by[i]["plan"]["world"] == w for i in ids), (w, ids)
    assert [by[i]["plan"]["d"] for i in ids] == sorted(by[i]["plan"]["d"] for i in ids), (w, ids)
for L in ROOMS:
    assert 1 <= len(L["plan"].get("strategy", [])) <= 5, L["id"]
    with open(os.path.join(OUT, L["id"] + ".json"), "w") as f:
        json.dump(L, f, indent=1)
print(json.dumps(ORDER))
