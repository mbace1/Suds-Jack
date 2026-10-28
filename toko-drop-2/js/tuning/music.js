// tuning/music.js — the music (v58), as data: js/music.js plays it. Synthesised,
// never sampled, in the intro's register (intro/sfx.js, owner 2026-10-22:
// "classic 16bit sounds"): pulse waves at 12.5 / 25 / 50 % duty, a triangle
// bass, a short noise loop for the drums, two-operator FM where a world wants
// a bell or a brass, and the SNES's one luxury, an echo.
//
// Every arcade world has a song, and the campaign's six worlds play the song
// of the arcade world that shares their rule (a rule sounds the same wherever
// you meet it). A song is two eight-bar sections, `a` then `b`, looped, and a
// four-bar `boss` section that loops while a boss lives. What plays is set by
// the game, bar by bar: the HEAT multiplier lifts it a layer at a time (the
// music is your heat — a hit throws it back down), an empty floor rests the
// drums, a boss takes the song to its `boss` section, and a room's last
// seconds double the hats.
//
// Notation. `chords`: one chord a bar (C, Cm, C7, Cm7, Cmaj7, Csus4, Csus2,
// Cdim, C5, Cadd9; X/Y puts Y in the bass). `lead`: bars split by `|`, each
// note NAME+OCTAVE:STEPS (C4 is middle C; r is a rest), and every bar adds up
// to the song's `bar` steps (test/music.mjs holds them to it). Patterns are a
// character a step: drums x hit, X accent, o ghost, O an open hat; bass R the
// chord's root, O its octave, 3 5 7 its third, fifth and seventh, L the fifth
// below, - holds, . rests.
export default {
  // the music bus under the master, × OPTIONS' MUSIC. Measured (scripts/music-render.mjs measure,
  // through a phone speaker's high-pass): a song at level 2+ sits 8-12 dB under a kill's loudest
  // 50 ms and 3-7 dB under a hit taken, so the effects carry the game and the music carries the world
  level: 0.2,
  lookahead: 0.3,       // s of notes laid down ahead of the clock (a frame is at most 0.1 s)
  resync: 0.35,         // fallen this far behind (a hidden tab, a long frame): skip ahead, never burst
  fade: { in: 1.4, out: 0.9, world: 1.1 },   // s: a song in, a song out, the fall between worlds
  duck: { pause: 0.32, cut: 1100 },          // PAUSED: the music at this share, through a low-pass at `cut` Hz
  // the music's low-pass: open; at THE VOID's darkest; the flinch a hit gives it, and how long it takes to come back
  cut: { open: 9500, dark: 700, hurt: 420, back: 0.55 },
  echo: { feedback: 0.34, cut: 2700, wet: 0.55 },
  // a part plays from this level up (0 an empty floor and no heat, 4 the hottest); the drums rest on an empty floor.
  // The tune is forward from 2, not higher: measured with the line bots (v58), a first-timer spends most of a
  // world at ×1-×2 and would otherwise hardly hear it, while a good player is at ×3 or more most of the time
  levels: { pad: 0, bass: 0, ping: 0, kick: 1, arp: 1, drip: 1, lead: 1, snare: 2, hat: 2, stab: 2, metal: 3, ride: 3, double: 4 },
  // the tune at level 1 is there, quietly (this share of its level); ×2 brings it forward. Without it a
  // first-timer, at ×1 most of a world, heard the music 8-10 dB under where it is from ×2 (measured on a phone)
  leadSoft: 0.4,
  heat: [1, 2, 3, 5],   // the heat multiplier at which levels 1, 2, 3 and 4 begin; level 1 also needs bodies on the floor
  hold: 1,              // bars a level is held before it falls, so a level does not flicker
  urgent: 10,           // a room's last seconds: the hats double
  pan: 0.7,             // THE RIVER: how far across the speakers its current carries the arpeggio
  // each part's envelope, [attack, decay, sustain, release] in s and share: up, down to the
  // sustain, let go when the note ends
  env: {
    lead: [0.006, 0.3, 0.72, 0.08], arp: [0.003, 0.07, 0.28, 0.03], bass: [0.004, 0.25, 0.85, 0.05], pad: [0.12, 0.6, 0.9, 0.35],
    stab: [0.003, 0.09, 0.35, 0.05], drip: [0.002, 0.08, 0, 0.06], ping: [0.004, 0.8, 0, 0.3], sting: [0.004, 0.3, 0.75, 0.15],
  },
  vib: { rate: 5.6, delay: 0.18, min: 0.28 },   // a lead note held `min` s or more sings, `delay` s in
  doubleVol: 0.38,                              // level 4's lead an octave up, on the thinnest pulse, × the lead's level
  riser: { f0: 320, f1: 3600, q: 3.5, vol: 0.09, tone: 0.035 },   // a rule's warning, swelling into its hit
  // the drum kit and the stings' voices, as levels and envelopes
  // the levels measured one part at a time (scripts/music-render.mjs parts), on a phone, against the tune's loudest
  // 50 ms: the kick about 8 dB under it, the snare 5, the hats 13, the ride 16
  kit: {
    kick: { f0: 200, f1: 48, dur: 0.22, vol: 0.42, click: 0.1 },   // starting high, so a phone's speaker hears its knock
    snare: { f: 1900, q: 0.8, dur: 0.16, vol: 0.55, tone: 185, toneVol: 0.25 },
    hat: { f: 8000, dur: 0.045, open: 0.22, vol: 0.14 },
    ride: { f: 6200, dur: 0.06, vol: 0.065 },
    crash: { f: 4500, dur: 1.3, vol: 0.14 },
    metal: { f: 3400, q: 9, dur: 0.12, vol: 0.45 },
  },
  // ARCADE: a song per world, in TUNING.worlds.list's order; the campaign's worlds by their rule; the title's own
  byWorld: ['grid', 'driveway', 'sewer', 'cistern', 'boiler', 'river', 'ice', 'deep', 'core'],
  byRule: { none: 'grid', current: 'river', sweep: 'cistern', dark: 'deep', slip: 'ice', updraft: 'boiler' },
  // the game's big moments, in the playing song's key: each note SEMITONES:STEPS
  // over the song's tonic (in octave 4), the bass two octaves under it; steps at `bpm`
  stings: {
    bpm: 132, bassVol: 0.3,
    over: { wave: 'p25', vol: 0.2, notes: '0:3 -2:3 -5:4 -9:10', bass: 20 },        // a run down and out
    won: { wave: 'p25', vol: 0.2, notes: '0:2 4:2 7:2 12:14', bass: 20, crash: true },  // the last world's boss: major, whatever the key
    boss: { wave: 'p25', vol: 0.18, notes: '0:2 7:2 12:12', crash: true },           // a boss down, a room cleared
    lost: { wave: 'p25', vol: 0.16, notes: '12:3 7:3 0:10' },                         // a room lost
  },

  songs: {
    // the title and the campaign's rooms list
    title: {
      name: 'TOKO DROP', bpm: 100, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'p50', vol: 0.2, vib: 0.006, echo: 0.5, cut: 3200 },
      arp: { wave: 'p12', vol: 0.14, oct: 4, pattern: 'up', rate: 2, echo: 0.35 },
      bass: { wave: 'tri', vol: 0.2, pattern: 'R---5---O---5---' },
      pad: { wave: 'p25', vol: 0.028, oct: 3, cut: 1300 },
      drums: { kick: 'x.......x.......', hat: '..o...o...o...o.', ride: 'o.o.o.o.o.o.o.o.' },
      a: { chords: 'Fmaj7 G Em7 Am Fmaj7 G Csus4 C',
        lead: 'E5:4 C5:4 A4:4 C5:4 | D5:6 B4:2 G4:8 | E5:4 G5:4 B5:4 G5:4 | A5:6 G5:2 E5:8 | F5:4 E5:4 C5:4 A4:4 | B4:4 D5:4 G5:4 F5:4 | F5:8 E5:4 D5:4 | C5:8 r:8' },
      b: { chords: 'Dm7 Em7 Fmaj7 G Dm7 Em7 Am G',
        lead: 'A4:4 C5:4 F5:4 E5:4 | G5:6 E5:2 B4:8 | A5:4 G5:4 F5:4 E5:4 | D5:8 r:4 G4:4 | F5:4 E5:4 D5:4 C5:4 | B4:4 E5:4 G5:4 B5:4 | A5:6 G5:2 E5:4 C5:4 | D5:8 B4:4 G4:4' },
    },

    // 1 · THE GRID: 1.x's arena, the neon floor
    grid: {
      name: 'NEON DROP', bpm: 124, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'p25', vol: 0.26, vib: 0.007, echo: 0.45, cut: 4200 },
      arp: { wave: 'p12', vol: 0.18, oct: 4, pattern: 'up', rate: 1, echo: 0.3 },
      bass: { wave: 'tri', vol: 0.22, pattern: 'R.O.R.O.R.O.R.O.' },
      pad: { wave: 'p50', vol: 0.024, oct: 3, cut: 1500 },
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', ride: 'xoxoxoxoxoxoxoxo' },
      a: { chords: 'Am F C G Am F G E',
        lead: 'A4:4 C5:2 E5:2 D5:2 C5:2 B4:2 C5:2 | A4:6 G4:2 F4:2 G4:2 A4:4 | E5:4 G5:2 E5:2 D5:2 C5:2 D5:2 E5:2 | D5:8 B4:4 G4:4 | A4:4 C5:2 E5:2 A5:4 G5:2 E5:2 | F5:6 E5:2 D5:2 C5:2 A4:4 | B4:4 D5:4 G5:4 F5:2 D5:2 | E5:8 G#4:4 B4:4' },
      b: { chords: 'Dm Am F G Dm Am E E7',
        lead: 'F5:2 E5:2 D5:4 A4:4 D5:4 | C5:2 B4:2 A4:4 E4:4 A4:4 | A4:2 C5:2 F5:4 E5:2 F5:2 G5:4 | G5:4 F5:2 E5:2 D5:4 B4:4 | F5:2 E5:2 D5:4 A5:6 G5:2 | E5:4 C5:4 A4:4 C5:4 | B4:4 E5:4 G#5:4 B5:4 | D5:4 B4:4 G#4:4 E4:4' },
      boss: { chords: 'Am Bb Am E',
        lead: 'A4:2 A4:2 C5:2 A4:2 E5:4 D5:2 C5:2 | D5:2 D5:2 F5:2 D5:2 Bb4:4 A4:2 Bb4:2 | C5:2 C5:2 E5:2 C5:2 A5:4 G5:2 E5:2 | G#5:4 E5:4 D5:2 C5:2 B4:2 G#4:2',
        drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' } },
    },

    // 2 · THE DRIVEWAY: the street at night, the curb and the lawn
    driveway: {
      name: 'CURB APPEAL', bpm: 112, bar: 16, beat: 4, swing: 0.16, echo: 3,
      lead: { wave: 'p50', vol: 0.22, vib: 0.005, echo: 0.35, cut: 3000 },
      stab: { wave: 'p25', vol: 0.1, oct: 4, pattern: '..x...x...x..x..', len: 1, echo: 0.2, cut: 2600 },
      bass: { wave: 'fm', ratio: 1, index: 2.2, decay: 0.12, vol: 0.2, pattern: 'R..R.O.R..R.7.O.' },
      drums: { kick: 'x.....x...x.....', snare: '....x.......x..o', hat: 'xoxoxoxoxoxoxoxo', ride: 'x.x.x.x.x.x.x.x.' },
      a: { chords: 'Em7 A7 Em7 A7 Cmaj7 Bm7 Am7 B7',
        lead: 'B4:3 D5:3 E5:2 r:2 G5:2 E5:2 D5:2 | C#5:4 E5:2 C#5:2 B4:4 A4:4 | B4:3 D5:3 E5:2 r:2 G5:2 A5:2 G5:2 | E5:8 r:4 C#5:2 D5:2 | E5:2 G5:2 B5:4 A5:2 G5:2 E5:4 | F#5:4 D5:2 B4:2 A4:2 B4:2 D5:4 | C5:4 E5:2 C5:2 A4:2 G4:2 A4:4 | D#5:4 F#5:4 A5:4 F#5:4' },
      b: { chords: 'Gmaj7 F#m7 Em7 A7 Cmaj7 D Em7 B7',
        lead: 'D5:2 F#5:2 B5:6 A5:2 F#5:4 | E5:2 C#5:2 A4:4 E5:4 C#5:4 | G5:3 F#5:3 E5:2 D5:4 B4:4 | C#5:4 E5:4 G5:4 E5:4 | B5:6 G5:2 E5:4 C5:4 | D5:2 F#5:2 A5:4 F#5:4 D5:4 | E5:4 G5:2 B5:2 A5:2 G5:2 E5:4 | D#5:6 C#5:2 B4:4 F#4:4' },
      boss: { chords: 'Em F Em B7',
        lead: 'E5:2 E5:1 E5:1 G5:2 E5:2 B5:4 A5:2 G5:2 | F5:2 F5:1 F5:1 A5:2 F5:2 C6:4 A5:2 G5:2 | G5:2 G5:1 G5:1 B5:2 G5:2 E6:4 D6:2 B5:2 | D#6:4 B5:4 A5:2 F#5:2 D#5:2 B4:2',
        drums: { kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' } },
    },

    // 3 · THE SEWER: a long tunnel of water; dub, and the drips
    sewer: {
      name: 'DRIP FEED', bpm: 94, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'tri', vol: 0.27, vib: 0.008, echo: 0.6 },
      stab: { wave: 'p50', vol: 0.07, oct: 4, pattern: '....x.......x...', len: 1, echo: 0.65, cut: 1800 },
      drip: { wave: 'sine', vol: 0.1, oct: 6, pattern: '..x.....x..x....', echo: 0.7 },
      bass: { wave: 'tri', vol: 0.26, pattern: 'R-------..R.O.R.' },
      pad: { wave: 'p12', vol: 0.02, oct: 3, cut: 1100 },
      drums: { kick: 'x.........x.....', snare: '........x.......', hat: '....x.......x...', ride: '..x...x...x...x.' },
      a: { chords: 'Dm Dm Bb C Dm Dm Gm A7',
        lead: 'A5:6 F5:2 D5:8 | r:4 E5:2 F5:2 A5:4 G5:4 | F5:6 D5:2 Bb4:8 | r:4 C5:2 E5:2 G5:4 E5:4 | A5:6 C6:2 D6:8 | r:4 F5:2 E5:2 D5:4 C5:4 | Bb5:6 A5:2 G5:4 D5:4 | C#5:4 E5:4 A5:8' },
      b: { chords: 'Gm Dm Bb A Gm Dm Eb A7',
        lead: 'D5:4 G5:4 Bb5:8 | A5:4 F5:4 D5:8 | F5:4 Bb5:4 D6:8 | E5:4 A5:4 C#6:8 | D6:6 C6:2 Bb5:8 | A5:6 G5:2 F5:8 | G5:6 F5:2 Eb5:4 Bb4:4 | A4:4 C#5:4 E5:4 G5:4' },
      boss: { chords: 'Dm Eb Dm A',
        lead: 'D5:2 r:2 D5:2 F5:2 A5:4 G5:2 F5:2 | Eb5:2 r:2 Eb5:2 G5:2 Bb5:4 A5:2 G5:2 | F5:2 r:2 F5:2 A5:2 D6:4 C6:2 A5:2 | C#6:4 A5:4 E5:4 C#5:4',
        drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' } },
    },

    // 4 · THE CISTERN (sweep): columns standing in water, and the line coming off the rail
    cistern: {
      name: 'SWEEP LINE', bpm: 128, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'p25', vol: 0.24, vib: 0.006, echo: 0.4, cut: 3800 },
      arp: { wave: 'p12', vol: 0.14, oct: 4, pattern: 'updown', rate: 1, echo: 0.25 },
      bass: { wave: 'p50', vol: 0.12, cut: 900, pattern: 'R.RO.RRO.RRO.RO.' },
      pad: { wave: 'p25', vol: 0.03, oct: 3, cut: 1300 },
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ride: 'oxxxoxxxoxxxoxxx' },
      a: { chords: 'F#m G F#m E F#m G A G',
        lead: 'F#4:2 G4:2 A4:2 G4:2 F#4:4 C#5:4 | D5:2 C#5:2 B4:2 A4:2 G4:4 B4:4 | F#4:2 G4:2 A4:2 B4:2 C#5:4 F#5:4 | E5:4 D5:2 C#5:2 B4:4 G#4:4 | A5:2 G5:2 F#5:2 E5:2 F#5:4 C#5:4 | D5:2 E5:2 F#5:2 G5:2 B5:4 G5:4 | E5:2 C#5:2 A4:2 C#5:2 E5:4 A5:4 | G5:4 F#5:4 D5:4 B4:4' },
      b: { chords: 'D E F#m F#m D E G G',
        lead: 'F#5:4 A5:4 D5:4 F#5:4 | G#5:4 B5:4 E5:4 G#5:4 | A5:6 G#5:2 F#5:8 | C#5:4 E5:4 F#5:4 A5:4 | F#5:2 E5:2 D5:4 A4:4 D5:4 | G#5:2 F#5:2 E5:4 B4:4 E5:4 | B5:4 A5:2 G5:2 D5:4 B4:4 | G5:2 A5:2 B5:2 D6:2 B5:4 G5:4' },
      boss: { chords: 'F#m G F#m C#7',
        lead: 'F#5:1 F#5:1 r:2 F#5:2 A5:2 C#6:4 B5:2 A5:2 | G5:1 G5:1 r:2 G5:2 B5:2 D6:4 C#6:2 B5:2 | A5:1 A5:1 r:2 A5:2 C#6:2 F#6:4 E6:2 C#6:2 | F6:4 C#6:4 B5:4 G#5:4',
        drums: { kick: 'x.x.x...x.x.x...', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx' } },
    },

    // 5 · THE BOILER (updraft): plate steel, the grate's glow, the shove from the middle
    boiler: {
      name: 'PRESSURE', bpm: 136, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'fm', ratio: 1, index: 2.4, decay: 0, vol: 0.17, vib: 0.006, echo: 0.3 },
      stab: { wave: 'fm', ratio: 1, index: 3, decay: 0.18, vol: 0.05, oct: 4, pattern: 'x.....x.........', len: 2, echo: 0.2 },
      metal: { pattern: '..x...x...x.x...' },
      bass: { wave: 'p25', vol: 0.13, cut: 1100, pattern: 'R.RR.RR.R.RR.RO.' },
      pad: { wave: 'p50', vol: 0.02, oct: 3, cut: 1000 },
      drums: { kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ride: 'xxxxxxxxxxxxxxxx' },
      a: { chords: 'Cm Cm Ab Bb Cm Cm Fm G',
        lead: 'C5:2 C5:2 Eb5:2 G5:4 F5:2 Eb5:2 D5:2 | C5:6 Bb4:2 G4:8 | Ab4:2 Ab4:2 C5:2 Eb5:4 D5:2 C5:2 Bb4:2 | D5:6 C5:2 Bb4:4 F5:4 | G5:2 G5:2 Bb5:2 C6:4 Bb5:2 G5:2 Eb5:2 | F5:4 Eb5:4 D5:4 Eb5:4 | Ab5:4 G5:2 F5:2 C5:4 F5:4 | G5:4 D5:4 B4:4 G4:4' },
      b: { chords: 'Ab Bb Cm Cm Ab Bb G G7',
        lead: 'Eb5:4 Ab5:4 C6:4 Ab5:4 | D5:4 F5:4 Bb5:4 F5:4 | G5:6 F5:2 Eb5:4 D5:4 | C5:8 r:4 G4:2 C5:2 | C6:6 Bb5:2 Ab5:4 Eb5:4 | D6:6 C6:2 Bb5:4 F5:4 | B5:4 G5:4 D5:4 B4:4 | F5:4 D5:4 B4:2 G4:2 F4:2 D4:2' },
      boss: { chords: 'Cm Db Cm G',
        lead: 'C5:2 Eb5:2 G5:2 C6:2 B5:2 C6:2 G5:4 | Db6:2 C6:2 Ab5:2 F5:2 Db5:4 F5:4 | Eb6:2 D6:2 C6:2 G5:2 Eb5:4 G5:4 | D6:4 B5:4 G5:4 F5:4',
        drums: { kick: 'x.xx..x.x.xx..x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' } },
    },

    // 6 · THE RIVER (current): 12/8, and the arpeggio rolls like the water
    river: {
      name: 'UNDERCURRENT', bpm: 84, bar: 24, beat: 6, swing: 0, echo: 4,
      lead: { wave: 'p50', vol: 0.21, vib: 0.007, echo: 0.4, cut: 3400 },
      arp: { wave: 'p12', vol: 0.16, oct: 4, pattern: 'updown', rate: 1, echo: 0.3, pan: true },
      bass: { wave: 'tri', vol: 0.22, pattern: 'R-----5-----O-----5-----' },
      pad: { wave: 'p25', vol: 0.03, oct: 3, cut: 1400 },
      drums: { kick: 'x...........x...........', snare: '......x...........x.....', hat: 'x.o.o.x.o.o.x.o.o.x.o.o.', ride: 'xoooooxoooooxoooooxooooo' },
      a: { chords: 'G A/G Em D G A/G C D',
        lead: 'D5:6 G5:6 F#5:4 E5:2 D5:6 | C#5:6 E5:6 A5:12 | B4:6 E5:6 G5:4 F#5:2 E5:6 | F#5:12 A5:6 F#5:6 | D5:6 G5:6 B5:6 A5:6 | C#6:6 B5:6 A5:6 E5:6 | G5:6 E5:6 C5:6 E5:6 | F#5:12 D5:6 A4:6' },
      b: { chords: 'Em C G D Em C A D',
        lead: 'G5:12 F#5:6 E5:6 | E5:12 D5:6 C5:6 | D5:6 B4:6 G4:6 B4:6 | A4:12 D5:12 | B5:12 A5:6 G5:6 | G5:12 E5:6 C5:6 | C#6:6 A5:6 E5:6 C#5:6 | D5:12 F#5:6 A5:6' },
      boss: { chords: 'Em C Am B7',
        lead: 'E5:3 E5:3 G5:3 B5:3 E6:6 D6:3 B5:3 | C6:3 B5:3 G5:3 E5:3 G5:6 E5:3 C5:3 | A5:3 C6:3 E6:6 D6:3 C6:3 A5:6 | D#6:6 B5:6 A5:3 F#5:3 D#5:6',
        drums: { kick: 'x.....x.....x.....x.....', snare: '......x...........x..x..', hat: 'xxxxxxxxxxxxxxxxxxxxxxxx' } },
    },

    // 7 · THE ICE (slip): a floe under you; bells and glass
    ice: {
      name: 'BLACK ICE', bpm: 104, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'fm', ratio: 3.5, index: 1.6, decay: 0.6, vol: 0.21, vib: 0.004, echo: 0.55 },
      arp: { wave: 'fm', ratio: 7, index: 0.9, decay: 0.08, vol: 0.095, oct: 5, pattern: 'broken', rate: 2, echo: 0.45 },
      bass: { wave: 'tri', vol: 0.22, pattern: 'R.....R.O.....R.' },
      pad: { wave: 'p12', vol: 0.036, oct: 3, cut: 1700 },
      drums: { kick: 'x.......x.x.....', snare: '....o.......x...', hat: '..o...o...o...o.', ride: 'xoxoxoxoxoxoxoxo' },
      a: { chords: 'Bm Gmaj7 D A Bm Gmaj7 Em7 F#',
        lead: 'F#5:4 B5:4 A5:2 F#5:2 D5:4 | F#5:6 D5:2 B4:8 | A5:4 F#5:4 E5:2 D5:2 A4:4 | C#5:8 E5:4 A5:4 | B5:4 D6:4 C#6:2 B5:2 F#5:4 | G5:6 F#5:2 D5:8 | E5:4 G5:4 B5:4 D6:4 | C#6:8 A#5:4 F#5:4' },
      b: { chords: 'Gmaj7 A F#m Bm Gmaj7 A F#sus4 F#',
        lead: 'D6:6 B5:2 G5:8 | C#6:6 A5:2 E5:8 | A5:6 F#5:2 C#5:8 | D5:4 F#5:4 B5:8 | B5:2 A5:2 G5:4 F#5:4 D5:4 | C#6:2 B5:2 A5:4 E5:4 C#5:4 | B5:8 C#6:4 B5:4 | A#5:8 C#6:4 F#6:4' },
      boss: { chords: 'Bm C Bm F#7',
        lead: 'B5:2 F#5:2 B5:2 D6:2 C#6:4 B5:4 | C6:2 G5:2 C6:2 E6:2 D6:4 C6:4 | D6:2 B5:2 F#5:2 B5:2 D6:4 F#6:4 | E6:4 C#6:4 A#5:4 F#5:4',
        drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
    },

    // 8 · THE DEEP (dark): the light closes in; a sonar ping in the black
    deep: {
      name: 'LIGHTS OUT', bpm: 84, bar: 16, beat: 4, swing: 0, echo: 4,
      lead: { wave: 'tri', vol: 0.25, vib: 0.009, echo: 0.6 },
      ping: { wave: 'sine', note: 'C#6', every: 2, vol: 0.12, echo: 0.75 },
      bass: { wave: 'tri', vol: 0.27, pattern: 'R.......R.....O.' },
      pad: { wave: 'p50', vol: 0.022, oct: 3, cut: 900 },
      drums: { kick: 'x..x....x.......', snare: '............o...', hat: '..o...o...o...o.', ride: 'x.x.x.x.x.x.x.x.' },
      a: { chords: 'C#m A E B C#m A F#m G#',
        lead: 'G#4:8 C#5:4 E5:4 | E5:8 C#5:4 A4:4 | B4:8 E5:4 G#5:4 | F#5:8 D#5:4 B4:4 | C#6:8 B5:4 G#5:4 | A5:8 G#5:4 E5:4 | F#5:8 A5:4 C#6:4 | C6:8 G#5:4 D#5:4' },
      b: { chords: 'A B C#m C#m A B G#sus4 G#',
        lead: 'C#5:6 B4:2 A4:8 | D#5:6 C#5:2 B4:8 | E5:4 G#5:4 C#6:8 | B5:4 G#5:4 E5:8 | A5:6 G#5:2 E5:8 | B5:6 A5:2 F#5:8 | C#6:8 D#6:8 | C6:8 G#5:8' },
      boss: { chords: 'C#m D C#m G#7',
        lead: 'C#5:2 r:2 E5:2 G#5:2 C#6:4 B5:2 G#5:2 | D5:2 r:2 F#5:2 A5:2 D6:4 C#6:2 A5:2 | E5:2 r:2 G#5:2 C#6:2 E6:4 D#6:2 C#6:2 | C6:4 G#5:4 F#5:4 D#5:4',
        drums: { kick: 'x..x..x.x..x....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
    },

    // 9 · THE CORE (every rule in turn): the last world, everything at once
    core: {
      name: 'OMEGA', bpm: 146, bar: 16, beat: 4, swing: 0, echo: 3,
      lead: { wave: 'saw', vol: 0.29, vib: 0.006, echo: 0.35, cut: 3000 },
      arp: { wave: 'p25', vol: 0.135, oct: 4, pattern: 'up', rate: 1, echo: 0.25 },
      bass: { wave: 'p50', vol: 0.12, cut: 1000, pattern: 'RORORORORORORORO' },
      pad: { wave: 'p25', vol: 0.022, oct: 3, cut: 1500 },
      drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', ride: 'xxxxxxxxxxxxxxxx' },
      a: { chords: 'Am F Dm E Am F Dm E7',
        lead: 'A4:2 C5:2 E5:2 A5:2 G#5:2 A5:2 B5:2 C6:2 | A5:4 F5:4 C5:4 A4:4 | D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 D5:2 | E5:4 G#5:4 B5:4 E6:4 | C6:6 B5:2 A5:4 E5:4 | F5:6 E5:2 F5:4 A5:4 | D6:6 C6:2 A5:4 F5:4 | G#5:4 B5:4 D6:4 B5:4' },
      b: { chords: 'F G E Am F G E E7',
        lead: 'C6:4 A5:4 F5:4 A5:4 | D6:4 B5:4 G5:4 B5:4 | E6:8 B5:4 G#5:4 | A5:8 E5:4 C5:4 | F5:2 G5:2 A5:2 C6:2 F6:4 E6:4 | D6:2 C6:2 B5:2 A5:2 G5:4 B5:4 | G#5:4 B5:4 E6:4 G#6:4 | E6:4 D6:4 B5:4 G#5:4' },
      boss: { chords: 'Am Bb F E',
        lead: 'A4:1 A4:1 A4:2 C5:2 E5:2 A5:4 G#5:2 E5:2 | Bb4:1 Bb4:1 Bb4:2 D5:2 F5:2 Bb5:4 A5:2 F5:2 | A4:1 A4:1 A4:2 C5:2 F5:2 A5:4 G5:2 F5:2 | G#5:4 E5:4 B4:4 G#4:4',
        drums: { kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx' } },
    },
  },
};
