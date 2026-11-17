// Toko Move — ACT 1's DECK (v3.1; ACT1.md §3–5, owner 2026-11-02: "design
// random events and funny situations … card choices should also have some
// risk factors as well as added time, risks can add positive and negative
// multipliers … selling the package to someone else can gain big bucks, but
// also hint at what the packages might contain").
//
// Every card is the bible's grammar: one mood, one line, at most two buttons.
// A button is a price in TIME (`time`, seconds, the number on the button) and
// what it does:
//   { say }                     a line, and nothing else
//   { pay: 1.2 }                the current job's fee ×1.2 (×0.5 hurts)
//   { cash: 20 }                euros now (negative is a fine)
//   { sell: 120 }               the parcel is sold: €120 now, the job is gone
//   { reveal: true }            what is inside is named
//   { time: 90 }                extra time on top of the button's price
// A RISKY button carries `risk: { odds, win, lose }` — the odds are a WORD
// (signed off: "stakes, odds in words"), and the word is a fixed chance, so a
// player can learn them. `{contents}` in a line is the parcel's hidden
// contents — every buyer names them (the owner's "hint at what the packages
// might contain").
//
// `tone` is which runs deal it (EASY and MEDIUM are fun, HARD risky, NIGHT
// scary — signed off 2026-11-03); `where` is a stop, aboard, on foot or
// anywhere; `weather` and `cargo`, when set, are what it needs; an option with
// `needs` appears only for that parcel.
//
// `set` on an option is a FLAG for the rest of the run: its CALLBACK card
// (below) takes the next job's card slot — the city remembers this morning.
// ARCS are remembered across runs (ACT1.md §10): `keep` writes the device's
// memory when the card is answered, and a step is dealt only when the memory
// says it is next.
//
// Pure data: test/journey.mjs reads every card.

export const ODDS = { usually: 0.75, maybe: 0.5, 'long shot': 0.25 };

export const CARDS = [
  // ── fun: the everyday city ────────────────────────────────────────────
  { id: 'gull', tone: ['fun'], where: 'stop', mood: 'opportunity', text: 'A seagull lands on your parcel and looks at you like you owe it money.',
    options: [{ label: 'Shoo it', time: 10, say: 'It leaves. It will remember this.' },
      { label: 'Let it pose for a photo', time: 40, set: 'gull', risk: { odds: 'maybe', win: { cash: 10, say: 'A tourist pays €10 for the photo. The gull takes a cut.' }, lose: { say: 'Nobody wants the photo. The gull keeps posing anyway.' } } }] },
  { id: 'granny', tone: ['fun'], where: 'stop', mood: 'opportunity', text: 'An old lady wants to cross Mannerheimintie. The lights are short, and so is she.',
    options: [{ label: 'Walk her across', time: 90, pay: 1.1, set: 'granny', say: 'She gives you a pulla. Morale is a multiplier.' },
      { label: 'Walk on', time: 0, say: 'Someone else helps her. You feel it for the rest of the shift.' }] },
  { id: 'map', tone: ['fun'], where: 'stop', mood: 'info', text: 'A tourist is looking for the Moomin shop. Their paper map is of Stockholm.',
    options: [{ label: 'Show them the way', time: 40, cash: 5, say: 'They tip you five euros, in kronor. It counts.' },
      { label: 'Point vaguely east', time: 0, say: 'They thank you warmly and set off west.' }] },
  { id: 'choir', tone: ['fun'], where: 'aboard', mood: 'opportunity', text: "A men's choir gets on and starts Finlandia. Quietly. Then not quietly.",
    options: [{ label: 'Stand and listen', time: 30, pay: 1.15, say: 'Goosebumps. Worth every second.' },
      { label: 'Change carriages', time: 20, say: 'The next carriage is also singing.' }] },
  { id: 'spruce', tone: ['fun'], where: 'aboard', mood: 'opportunity', text: 'A man gets on with a whole spruce. It takes three seats and most of yours.',
    options: [{ label: 'Hold the top for him', time: 20, set: 'spruce', risk: { odds: 'usually', win: { cash: 10, say: 'He thanks you with a ten and a very firm handshake.' }, lose: { pay: 0.9, say: 'Needles in the parcel. Festive, though.' } } },
      { label: 'Stand by the door', time: 0, say: 'You and the spruce make eye contact all the way.' }] },
  { id: 'scratch', tone: ['fun'], where: 'stop', mood: 'opportunity', text: 'The R-kioski sells you a scratch card with your coffee.',
    options: [{ label: 'Scratch it', time: 10, risk: { odds: 'long shot', win: { cash: 50, say: 'Fifty euros! The cashier claps, once.' }, lose: { say: 'You win a free coffee. You are holding a coffee.' } } },
      { label: 'Just the coffee', time: 0, pay: 1.05, say: 'Good coffee. Faster legs.' }] },
  { id: 'sauna', tone: ['fun'], where: 'stop', mood: 'opportunity', text: 'Someone in a towel invites you into the public sauna. It is quarter to eight in the morning.',
    options: [{ label: 'Decline politely', time: 0, say: 'He respects it, and stays steaming in the doorway.' },
      { label: 'Five minutes, then', time: 300, risk: { odds: 'usually', win: { pay: 1.3, say: 'You come out a new person. A faster person.' }, lose: { pay: 0.9, say: 'You come out the same person, damp. So is the parcel.' } } }] },
  { id: 'quiet', tone: ['fun'], where: 'aboard', mood: 'info', text: 'Two people at the window are having the quietest argument you have ever seen.',
    options: [{ label: 'Look out of the window', time: 0, say: 'Very Finnish of you.' },
      { label: 'Offer them a pulla each', time: 20, risk: { odds: 'maybe', win: { pay: 1.2, say: 'They make up. They each nod at you. Twice.' }, lose: { say: 'Now three people are not talking.' } } }] },
  { id: 'swedish', tone: ['fun'], where: 'stop', mood: 'info', text: 'Someone asks you for directions in Swedish. You know three words of Swedish.',
    options: [{ label: 'Smile and point at the map', time: 10, say: 'The universal language. It works.' },
      { label: 'Use all three words', time: 30, risk: { odds: 'maybe', win: { cash: 10, say: '"Tack, tack!" They tip you. Now you know four words.' }, lose: { time: 60, say: 'You have sent them to Turku. You go after them to apologise.' } } }] },
  { id: 'sofa', tone: ['fun'], where: 'walking', mood: 'opportunity', text: 'Students in overalls are carrying a sofa down Aleksanterinkatu. They need one more pair of hands.',
    options: [{ label: 'Lift', time: 60, risk: { odds: 'usually', win: { cash: 15, say: 'They pay you in sima and fifteen euros.' }, lose: { time: 90, say: 'The sofa wins. The sofa always wins.' } } },
      { label: 'Wish them luck', time: 0, say: 'They sing you a song about the sofa.' }] },
  { id: 'busker', tone: ['fun'], where: 'stop', mood: 'info', text: 'A busker at the station starts the one song you actually like.',
    options: [{ label: 'Stay for the chorus', time: 30, pay: 1.1, say: 'You hum it for the rest of the shift.' },
      { label: 'Drop a coin and go', time: 0, cash: -2, say: 'Two euros. Cheaper than therapy.' }] },
  { id: 'inspector', tone: ['fun', 'risky'], where: 'aboard', mood: 'notice', text: 'Ticket inspection. Your phone is on 2%.',
    options: [{ label: 'Wave the documents', needs: 'documents', time: 0, pay: 1.1, say: 'The documents look terribly official. You are waved through.' },
      { label: 'Show the app', time: 20, risk: { odds: 'usually', win: { say: 'It opens. Barely. Waved on.' }, lose: { cash: -80, say: 'The phone dies. An €80 fine. The inspector is sorry. Not very.' } } },
      { label: 'Get off before they reach you', time: 120, say: 'You walk the last stop with great dignity.' }] },
  { id: 'dog', tone: ['fun'], where: 'stop', weather: ['rain'], mood: 'opportunity', text: 'A dog in a tiny yellow raincoat is walking itself to work.',
    options: [{ label: 'Walk it home', time: 120, cash: 20, say: 'Its owner pays a reward, and a sticker.' },
      { label: 'Nod at the dog', time: 0, say: 'The dog nods back. Professional respect.' }] },
  { id: 'umbrella', tone: ['fun'], where: 'stop', weather: ['rain'], mood: 'info', text: 'Eleven people under one shelter. The rain is horizontal. Welcome to the coast.',
    options: [{ label: 'Share your umbrella', time: 20, pay: 1.1, say: 'You make a friend. The friend has a better umbrella.' },
      { label: 'Squeeze in with the eleven', time: 0, say: 'Warm, at least.' }] },
  { id: 'iceswim', tone: ['fun'], where: 'walking', weather: ['snow'], mood: 'info', text: 'A man climbs out of a hole in the ice, steaming, and asks you the time.',
    options: [{ label: 'Tell him', time: 10, pay: 1.05, say: 'He thanks you and walks home in a towel. Respect.' },
      { label: "Ask if he's cold", time: 30, say: 'He looks at you as if you had asked whether water is wet.' }] },
  { id: 'slip', tone: ['fun', 'risky'], where: 'walking', weather: ['snow'], mood: 'warning', text: 'Black ice at the Stockmann corner. A pensioner is crossing it like it is nothing.',
    options: [{ label: 'Copy her steps exactly', time: 40, say: 'The penguin walk. It works. She nods at your form.' },
      { label: 'Walk normally', time: 0, risk: { odds: 'maybe', win: { say: 'Fine. You were fine all along.' }, lose: { time: 90, say: 'You slip. The pensioner lifts you up with one hand and keeps walking.' } } }] },
  // ── selling the parcel: the buyers, and what they find inside ─────────
  { id: 'vappu', tone: ['fun'], where: 'stop', mood: 'opportunity', sale: true, text: 'A student in a white cap offers €40 for "whatever is in the box". It is for vappu.',
    options: [{ label: 'Sell it', time: 0, sell: 40, say: 'He opens it on the spot: {contents}. "Perfect," he says, worryingly.' },
      { label: 'Not for sale', time: 0, say: 'He salutes and goes to ask the seagulls.' }] },
  { id: 'moomin', tone: ['fun'], where: 'stop', cargo: ['fragile', 'market goods'], mood: 'opportunity', sale: true, text: 'A tourist asks if your parcel is a Moomin mug. She is holding a lot of cash.',
    options: [{ label: 'Sell it to her', time: 0, sell: 90, say: 'She opens it. It is {contents}. She buys it anyway.' },
      { label: "It's not a mug", time: 0, say: 'She looks heartbroken, then buys an actual mug.' }] },
  { id: 'dentist', tone: ['fun', 'risky'], where: 'stop', mood: 'opportunity', sale: true, text: 'A dentist in a hurry asks if that is the crowns. "It is the crowns," she decides, and offers €70.',
    options: [{ label: 'Sell it', time: 0, sell: 70, say: 'She opens it: {contents}. "Close enough," she says.' },
      { label: 'It is not the crowns', time: 0, say: 'She runs off to find the crowns.' }] },
  { id: 'rival', tone: ['risky'], where: 'stop', mood: 'warning', sale: true, text: 'The other courier offers €120 cash for your parcel. "Easier than delivering it," he grins.',
    options: [{ label: 'Sell it', time: 0, risk: { odds: 'maybe', win: { sell: 120, say: 'Real notes. He peeks inside: {contents}. He looks less sure.' }, lose: { sell: 0, say: 'Monopoly money. He waves from the tram with your {contents}.' } } },
      { label: 'Not for sale', time: 0, say: 'He shrugs. He thinks he will beat you anyway.' }] },
  // ── risky: the rush, the shortcut, the gap in the fence ───────────────
  { id: 'runforit', tone: ['risky'], where: 'stop', mood: 'warning', text: 'A tram is pulling in across the road. The lights are red. The lights are always red.',
    options: [{ label: 'Run for it', time: 0, risk: { odds: 'maybe', win: { pay: 1.3, say: 'Made it. The driver waited a second longer. Respect.' }, lose: { time: 180, say: 'The doors close on your nose. Politely.' } } },
      { label: 'Wait for the green', time: 90, say: 'The green man arrives. So does the next tram.' }] },
  { id: 'fence', tone: ['risky'], where: 'walking', mood: 'warning', text: 'There is a gap in the fence by the rail yard. Everyone uses it. Nobody admits it.',
    options: [{ label: 'Through the gap', time: 0, risk: { odds: 'maybe', win: { pay: 1.25, say: 'Two minutes saved. The client will notice.' }, lose: { cash: -50, time: 60, say: 'A man in hi-vis has been waiting all morning for you.' } } },
      { label: 'The long way round', time: 120, say: 'Long, legal and very scenic.' }] },
  { id: 'crush', tone: ['risky'], where: 'aboard', mood: 'warning', text: 'Rush hour. You are holding the parcel above your head like a trophy.',
    options: [{ label: 'Hold on', time: 0, risk: { odds: 'usually', win: { say: 'It survives. You lift it at the stop like you won something.' }, lose: { pay: 0.5, say: 'It slips. Someone catches it. Someone else steps on it.' } } },
      { label: 'Get off and walk the last bit', time: 120, say: 'Fresh air. Arms finally down.' }] },
  { id: 'roadworks', tone: ['risky'], where: 'walking', mood: 'warning', text: 'The street is dug up. It has been dug up since 2019.',
    options: [{ label: 'Climb the barrier', time: 0, risk: { odds: 'maybe', win: { say: 'Over. Nobody saw.' }, lose: { cash: -40, time: 60, say: 'The foreman saw. A €40 fine and a talk about safety, in that order.' } } },
      { label: 'Go round', time: 150, say: 'Round it is. You count four more dug-up streets.' }] },
  { id: 'puffy', tone: ['risky'], where: 'stop', weather: ['snow'], mood: 'warning', text: 'The tram is full of puffy coats. One more puffy coat is you.',
    options: [{ label: 'Squeeze in', time: 0, risk: { odds: 'usually', win: { say: 'You fit. Mostly.' }, lose: { pay: 0.7, say: 'The parcel is now a slightly different shape.' } } },
      { label: 'Wait for the next one', time: 240, say: 'The next one is also full of puffy coats, but fewer.' }] },
  { id: 'wet', tone: ['fun', 'risky'], where: 'walking', weather: ['rain'], cargo: ['documents', 'express'], mood: 'warning', text: 'Rain finds the gap in your bag. The paper is getting ideas.',
    options: [{ label: 'Dry it under the hand dryer', time: 90, say: 'Warm, dry, and smelling of hand soap.' },
      { label: 'Keep going', time: 0, risk: { odds: 'maybe', win: { say: 'It holds. Good bag.' }, lose: { pay: 0.6, reveal: true, say: 'Soggy. You can read it now: {contents}.' } } }] },
  // ── scary: the last service ───────────────────────────────────────────
  { id: 'ghost', tone: ['scary'], where: 'stop', mood: 'notice', tram: 'museum', text: "A tram with no number pulls in. The windows are warm. The driver doesn't look up.",
    options: [{ label: 'Get on', time: 0, risk: { odds: 'maybe', win: { pay: 2, say: 'It takes you exactly where you were going. It was never on any timetable.' }, lose: { time: 360, say: 'It goes to the depot. The depot is closed. You walk back.' } } },
      { label: 'Wait for a real one', time: 300, say: 'When you look again, it is gone.' }] },
  { id: 'humming', tone: ['scary'], where: 'aboard', mood: 'notice', text: 'Someone at the back of the empty car is humming your ringtone.',
    options: [{ label: 'Move to the front', time: 0, say: 'The humming follows. Slightly.' },
      { label: 'Ask how they know it', time: 30, risk: { odds: 'long shot', win: { cash: 100, say: 'They are your dispatcher. They tip.' }, lose: { pay: 0.8, say: 'They stop humming. That is worse.' } } }] },
  { id: 'fog', tone: ['scary'], where: 'walking', weather: ['fog'], mood: 'notice', text: 'Fog off the sea. You can hear the harbour cranes but not see them.',
    options: [{ label: 'Follow the tram wire', time: 60, say: 'The wire knows the way. It always has.' },
      { label: 'Cut across the quay', time: 0, risk: { odds: 'maybe', win: { pay: 1.3, say: 'Out of the fog, right on time.' }, lose: { time: 240, say: 'You find the sea. You did not want the sea.' } } }] },
  { id: 'moved', tone: ['scary'], where: 'any', mood: 'notice', text: 'The parcel moved. Just slightly. Just once.',
    options: [{ label: 'Hold it tighter', time: 0, say: 'It settles. Good. Good.' },
      { label: 'Open it a crack', time: 20, risk: { odds: 'maybe', win: { pay: 1.5, reveal: true, say: 'It is {contents}. Of course it moved.' }, lose: { pay: 0.5, reveal: true, say: 'Whatever it was is out now. It was {contents}.' } } }] },
  { id: 'longcoat', tone: ['scary'], where: 'stop', mood: 'notice', sale: true, text: 'A woman in a long coat knows your name. She offers €200 for the parcel.',
    options: [{ label: 'Sell it', time: 0, sell: 200, say: 'She does not open it. She knows it is {contents}. "He will understand," she says.' },
      { label: 'Keep it', time: 0, say: 'She smiles as if she knew you would.' }] },
  { id: 'lastmetro', tone: ['scary', 'risky'], where: 'stop', mood: 'warning', text: 'The last metro is leaving. The doors are closing slowly. Very slowly.',
    options: [{ label: 'Dive in', time: 0, risk: { odds: 'usually', win: { pay: 1.2, say: 'In. The doors close on your bag strap and let go, kindly.' }, lose: { time: 300, say: 'The doors win. The platform is very quiet now.' } } },
      { label: 'Let it go', time: 180, say: 'A night bus. It smells of kebab and courage.' }] },
  { id: 'karaoke', tone: ['scary', 'fun'], where: 'walking', mood: 'opportunity', text: 'A karaoke bar door opens. Someone is singing Eppu Normaali directly at you.',
    options: [{ label: 'Sing the chorus', time: 30, cash: 15, say: 'Applause. A tip jar. Your tip jar.' },
      { label: 'Keep walking', time: 0, say: 'The chorus follows you for a whole block.' }] },
  { id: 'kebab', tone: ['scary'], where: 'stop', mood: 'info', text: 'The kebab place is open. It is always open.',
    options: [{ label: 'One kebab', time: 60, cash: -9, pay: 1.15, say: 'Courage restored.' },
      { label: 'Not tonight', time: 0, say: 'The kebab place will wait. It always does.' }] },
  { id: 'reindeer', tone: ['scary'], where: 'walking', mood: 'notice', text: 'A reindeer is standing in the middle of Mannerheimintie. Nobody else seems to see it.',
    options: [{ label: 'Walk around it', time: 30, say: 'It watches you go.' },
      { label: 'Ask it the way', time: 10, risk: { odds: 'long shot', win: { pay: 1.5, say: 'It nods towards a shortcut. It was right.' }, lose: { time: 120, say: 'It wanders off. You follow it. Why did you follow it?' } } }] },
  { id: 'flicker', tone: ['scary'], where: 'aboard', mood: 'notice', text: 'The lights flicker. Every passenger is suddenly asleep, except one, who is looking at your parcel.',
    options: [{ label: 'Look back', time: 0, risk: { odds: 'maybe', win: { say: 'They look away first. You win.' }, lose: { pay: 0.7, say: 'You look away first. Somehow the parcel is lighter.' } } },
      { label: 'Change carriages', time: 20, say: 'The next carriage is awake. Mostly.' }] },
];

// What is inside. Drawn per job and kept from you until a buyer, the rain or
// curiosity names it — or the drop does: "Signed for: …".
// In a run: the card a flag brings back (ACT1.md §10).
export const CALLBACKS = {
  granny: { id: 'granny2', tone: ['fun', 'risky', 'scary'], where: 'aboard', mood: 'opportunity', text: 'The lady from Mannerheimintie is on this tram. She has saved you the seat by the door.',
    options: [{ label: 'Sit with her', time: 30, pay: 1.15, say: 'She knows the person you are delivering to. "Tell her Aino says hello."' },
      { label: 'Wave from the door', time: 0, say: 'She waves back the whole way, with the pulla bag.' }] },
  spruce: { id: 'spruce2', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'opportunity', text: 'The spruce man is back, without the spruce. He insists on carrying your parcel.',
    options: [{ label: 'Let him', time: 30, risk: { odds: 'usually', win: { pay: 1.2, say: 'He carries it like a newborn. The parcel has never been safer.' }, lose: { time: 60, say: 'He takes the scenic route. The parcel enjoys it.' } } },
      { label: "I've got it", time: 0, say: 'He salutes, and goes to buy another spruce.' }] },
  gull: { id: 'gull2', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'warning', text: 'The same seagull. It has brought a friend. They both look at the parcel.',
    options: [{ label: 'Run', time: 30, say: 'You run. They walk. They are somehow faster.' },
      { label: 'Stand your ground', time: 0, risk: { odds: 'maybe', win: { pay: 1.1, say: 'They leave. Respect has been earned.' }, lose: { cash: -3, say: 'One of them takes your pulla. The other takes notes.' } } }] },
};
// Across runs: the arcs (ACT1.md §10). A step is dealt when the memory says it
// is next (`at`: the arc's count so far), never on a first run, one a run.
// `job` is which job's card slot it takes; `runs` limits it to those runs.
export const ARCS = [
  { arc: 'dispatch', at: 0, job: 0, id: 'dispatch1', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'info', keep: { dispatch: 1 }, text: "Dispatch here. Three today. Don't shake the blue one.",
    options: [{ label: 'Noted', time: 0, say: 'Dispatch hangs up before you can ask which one is blue.' },
      { label: "What's in it?", time: 20, say: '"Doesn\'t matter." Dispatch hangs up.' }] },
  { arc: 'dispatch', at: 1, job: 0, id: 'dispatch2', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'info', keep: { dispatch: 2 }, text: 'Dispatch here. Letters today. Same sender as Tuesday.',
    options: [{ label: 'Deliver them', time: 0, say: 'Dispatch sounds relieved.' },
      { label: 'Read the return address', time: 20, say: 'Aino, in Kallio. The same hand every week.' }] },
  { arc: 'dispatch', at: 2, job: 0, id: 'dispatch3', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'opportunity', keep: { dispatch: 3 }, text: 'Dispatch here. Just one, by hand. She asked for you.',
    options: [{ label: 'Take it', time: 0, pay: 1.5, say: 'Aino was expecting you. There is coffee.' },
      { label: 'Send the other courier', time: 0, keep: { sentOther: true }, say: 'Dispatch sighs. "She will be disappointed."' }] },
  { arc: 'dispatch', at: 3, job: 0, id: 'dispatch4', tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'info', keep: { dispatch: 4 }, text: 'Dispatch here. Three today. And one for the east, if you ever find it.',
    options: [{ label: 'Noted', time: 0, say: 'The line goes quiet for a moment longer than it should.' },
      { label: 'East of where?', time: 20, say: '"No line goes there." Dispatch hangs up.' }] },
  { arc: 'ticket', at: 0, job: 1, runs: ['night'], id: 'ticket1987', tone: ['scary'], where: 'aboard', mood: 'notice', text: 'A tram ticket from 1987 on the seat. Still warm.',
    options: [{ label: 'Keep it', time: 0, keep: { ticket: 1 }, say: 'It is stamped for a line that does not run any more.' },
      { label: 'Leave it', time: 0, say: 'When you look back, the seat is empty.' }] },
  { arc: 'ticket', at: 1, job: 1, runs: ['easy', 'medium', 'hard'], id: 'inspector1987', tone: ['fun', 'risky'], where: 'aboard', mood: 'notice', keep: { ticket: 2 }, text: 'Tickets, please. That one is from 1987. Where did you get it?',
    options: [{ label: 'The tram with no number', time: 30, risk: { odds: 'maybe', win: { pay: 1.3, say: 'He punches it anyway. "Long time no see."' }, lose: { time: 120, say: 'He keeps it, for the museum, and walks you off at the next stop.' } } },
      { label: 'Lost and found', time: 0, say: 'He nods like he has heard that before.' }] },
];

// The sealed parcel's card (ACT1.md §11; CARDS.md §1): no address, only a
// sticker and a line to ride. Asking names it; so does boarding that line.
export const SEALED_CARD = { id: 'sealed', sealed: true, tone: ['fun', 'risky', 'scary'], where: 'stop', mood: 'info', text: "The label says: you'll know the stop.",
  options: [{ label: 'Ride the {fam} and watch', time: 0, say: 'You watch every stop go by. One of them will look right.' },
    { label: 'Ask at the kiosk', time: 40, unseal: true, say: 'The kiosk knows. It is {stop}.' }] };

export const CONTENTS = {
  documents: ['a contract for a sauna, signed in pencil', 'three copies of the same apology', 'a love letter, laminated', 'a building permit, eleven years late', 'the minutes of a meeting about meetings'],
  'hot food': ['salmon soup for one very specific grandmother', 'karjalanpiirakka, still warm', 'a pizza with pineapple and reindeer', 'a single meatball, gift-wrapped'],
  parts: ['one sauna-stove knob', 'a bolt the size of your fist', 'a spare piece of a tram', 'forty identical keys to nothing'],
  fragile: ['a Moomin mug, first edition', 'a glass bird from Nuutajärvi', "someone's grandmother's vase, again", 'a snow globe of a snow globe'],
  equipment: ['a karaoke machine', 'an espresso machine for a ferry', 'a set of tuning forks', 'a very small sauna'],
  express: ['a USB stick labelled DO NOT', 'two tickets for tonight', 'a passport that is not yours', 'a watch that runs backwards'],
  'fresh food': ['a whole salmon, looking at you', 'forty grams of saffron', 'a bucket of lingonberries', 'new potatoes, very new'],
  'market goods': ['a reindeer pelt', 'a hat made of felt and regret', 'a sack of rye flour', 'a hand-knitted tram cosy'],
};

// The trams, by rarity (signed off: look only — "all of them behave the same,
// just look different. Museum quality trams are super rare, but there are
// many tiers in between"). Weights out of 100.
export const TRAMS = [
  { id: 'artic', name: 'Artic', w: 40 },
  { id: 'nr2plus', name: 'Nr II+', w: 22 },
  { id: 'vario', name: 'Variotram', w: 14 },
  { id: 'nr2', name: 'Nr II', w: 12 },
  { id: 'nr1', name: 'Nr I', w: 10 },
  { id: 'museum', name: 'museum tram', w: 2 },
];

// The weather on a walk (ACT1.md §4): snow is a slip, rain is wet paper.
export const SLIPS = ['You slip. A pensioner lifts you up with one hand and keeps walking.', 'You slip. Three strangers catch you without a word, then pretend it never happened.',
  'You slip, spin, and land standing. Nobody saw. Everybody saw.', 'You slip into a snowdrift. A child asks if you are a snowman.'];
export const SOAKS = ['Rain gets into the bag. The paper is now papier-mâché.', 'A bus drives through a puddle at you. Personally.', 'The rain wins this round. The label is running.'];

// ── THE THIRD OPTION (v3.18; owner, 2026-11-08: "We need 3 options at every
// choice. 2 regular and 3rd can sometimes be special or very special") ──────
// One per card, kept here in one table so it reads as a set. `tier`:
//   (none)     a third ordinary thing to do
//   'special'  costs a little money, or pays a little more for it
//   'very'     the rare one: a moment the city remembers
export const THIRDS = {
  gull: { label: 'Feed it a bit of pulla', time: 10, cash: -2, pay: 1.05, tier: 'special', say: 'It eats the pulla and stands guard over your parcel. Nobody comes near.' },
  granny: { label: 'Point her to the underpass', time: 20, say: 'She takes the underpass. She has opinions about the underpass.' },
  map: { label: 'Walk them to the shop', time: 120, cash: 15, tier: 'special', say: 'The Moomin shop. They buy you a mug and fill it with a fifteen-euro note.' },
  choir: { label: 'Join in', time: 40, pay: 1.3, cash: 10, tier: 'very', say: 'You know the words. The whole carriage turns. Somebody films it, and somebody tips.' },
  spruce: { label: 'Help him off at his stop', time: 60, cash: 5, say: 'You and the spruce get off together. He gives you five euros and a branch.' },
  scratch: { label: 'Buy three', time: 20, tier: 'special', risk: { odds: 'maybe', win: { cash: 34, say: 'The third one wins forty. The cashier claps, twice.' }, lose: { cash: -6, say: 'Three free coffees. You are holding one coffee.' } } },
  sauna: { label: 'Ask about the cold plunge', time: 120, pay: 1.5, tier: 'very', say: 'Ice water, then the steam. You leave faster than you came. Much faster.' },
  quiet: { label: 'Read your phone', time: 0, say: 'Your phone is on 2%. You read the battery icon very carefully.' },
  swedish: { label: 'Walk them there yourself', time: 90, cash: 15, tier: 'special', say: 'They take your arm the whole way and tip you in euros and kronor.' },
  sofa: { label: 'Hold the doors for them', time: 20, pay: 1.05, say: 'The sofa gets through. A cheer goes up from the overalls.' },
  busker: { label: 'Request it again', time: 60, cash: -5, pay: 1.25, tier: 'special', say: 'He plays it twice as fast. So do you.' },
  inspector: { label: 'Buy a ticket from him', time: 10, cash: -3, tier: 'special', say: 'He sells you one. He seems to enjoy it.' },
  dog: { label: 'Give it your scarf', time: 30, cash: 30, tier: 'very', say: 'Its owner turns out to be a city councillor. A reward, a sticker and a letter of thanks.' },
  umbrella: { label: 'Run between the drops', time: 0, risk: { odds: 'maybe', win: { say: 'You are not wet. You are not sure how.' }, lose: { pay: 0.9, say: 'You are wet. So is the parcel, a little.' } } },
  iceswim: { label: 'Join him', time: 180, pay: 1.6, tier: 'very', say: 'Thirty seconds in the sea. You have never been so awake. You run the rest.' },
  slip: { label: 'Buy ice studs at the kiosk', time: 30, cash: -8, pay: 1.05, tier: 'special', say: 'Ice studs. You walk like a local now.' },
  vappu: { label: 'Sell him a sticker instead', time: 10, cash: 5, say: 'He sticks it on his cap. He seems happy with the trade.' },
  moomin: { label: 'Sell her your keyring', time: 10, cash: 15, tier: 'special', say: 'It is a Moomin keyring. You did not know that until now.' },
  dentist: { label: 'Help her find the crowns', time: 40, pay: 1.05, say: 'They were in the next parcel along. She is very grateful.' },
  rival: { label: 'Race him for it instead', time: 0, tier: 'special', risk: { odds: 'maybe', win: { cash: 30, say: 'You beat him to the corner. He pays up, in real notes this time.' }, lose: { cash: -10, say: 'He wins, and takes ten euros for the trouble.' } } },
  runforit: { label: 'Take the underpass', time: 40, say: 'Down, along, up. The tram is still there.' },
  fence: { label: 'Ask the man in hi-vis', time: 40, pay: 1.1, say: 'He opens the gate for you. "Just this once." It is always just this once.' },
  crush: { label: 'Pay a tall man to hold it', time: 0, cash: -5, tier: 'special', say: 'He holds it above the crowd, like a trophy, but taller.' },
  roadworks: { label: 'Ask the foreman', time: 60, say: 'He walks you through, with commentary.' },
  puffy: { label: 'Take your coat off and squeeze in', time: 30, risk: { odds: 'usually', win: { say: 'You fit, and you are cold.' }, lose: { time: 60, say: 'Still a puffy coat too many. You wait.' } } },
  wet: { label: 'Buy a bin bag at the kiosk', time: 30, cash: -2, tier: 'special', say: 'Dry. Fashionable? No. Dry.' },
  ghost: { label: 'Ask the driver where it goes', time: 30, tier: 'very', risk: { odds: 'long shot', win: { pay: 2.5, say: 'It goes exactly where you are going. He knew before you asked.' }, lose: { time: 180, say: 'He does not answer. When you look up, you are alone at the stop.' } } },
  humming: { label: 'Hum along', time: 10, say: 'You harmonise. It is not bad, actually.' },
  fog: { label: 'Follow the foghorn', time: 30, pay: 1.15, tier: 'special', say: 'The horn knows the harbour. So do you now.' },
  moved: { label: 'Talk to it', time: 10, tier: 'very', risk: { odds: 'long shot', win: { pay: 2, say: 'It goes still, then warm. You deliver it very gently.' }, lose: { time: 60, say: 'It does not answer. You carry it at arm\'s length.' } } },
  longcoat: { label: 'Ask her who "he" is', time: 30, pay: 1.4, tier: 'very', say: 'She tells you. You deliver the parcel with great care.' },
  lastmetro: { label: 'Run for the night tram', time: 120, risk: { odds: 'maybe', win: { say: 'You catch it. The driver nods. You are both night people now.' }, lose: { time: 120, say: 'It leaves as you arrive. Another one, eventually.' } } },
  karaoke: { label: 'Take the microphone', time: 90, tier: 'special', risk: { odds: 'maybe', win: { cash: 40, say: 'Standing ovation. The tip jar is yours.' }, lose: { cash: -5, say: 'Silence, then one person claps. You buy them a drink.' } } },
  kebab: { label: 'Just the fries', time: 30, cash: -4, pay: 1.05, say: 'Fries. Enough courage for one more drop.' },
  reindeer: { label: 'Feed it your pulla', time: 20, pay: 1.5, tier: 'very', say: 'It eats it, bows, and is gone. Your feet feel lighter.' },
  flicker: { label: 'Close your eyes too', time: 0, say: 'When you open them, everyone is awake and nobody mentions it.' },
  granny2: { label: 'Buy her a coffee at the next stop', time: 60, cash: -3, pay: 1.3, tier: 'special', say: 'She tells you the whole history of the 4. You arrive knowing everything.' },
  spruce2: { label: 'Carry it together', time: 20, pay: 1.1, say: 'Two men, one parcel. It has never been safer.' },
  gull2: { label: 'Buy them a fish at the market', time: 60, cash: -5, pay: 1.4, tier: 'very', say: 'They escort you to the drop. Nobody bothers you. Nobody.' },
  dispatch1: { label: 'Which one is blue?', time: 10, say: '"The blue one." Dispatch hangs up.' },
  dispatch2: { label: 'Ask about Tuesday', time: 20, say: '"Tuesday was fine." It was not fine.' },
  dispatch3: { label: 'Bring her flowers too', time: 60, cash: -8, pay: 1.8, tier: 'very', say: 'Aino cries a little. There is coffee, and a cake, and a story.' },
  dispatch4: { label: 'Ask for a map', time: 20, say: '"There is no map." Dispatch hangs up.' },
  ticket1987: { label: 'Hand it to the driver', time: 10, pay: 1.2, tier: 'special', say: 'He punches it and winks. "Mind the stop that is not there."' },
  inspector1987: { label: 'Pay the fine', time: 20, cash: -10, say: 'Ten euros. He gives you the ticket back, for the museum.' },
  sealed: { label: 'Shake it gently', time: 10, tier: 'special', risk: { odds: 'maybe', win: { unseal: true, say: 'It rattles a name: {stop}.' }, lose: { pay: 0.8, say: 'It rattles. Something inside is now in two pieces.' } } },
};
for (const c of [...CARDS, ...Object.values(CALLBACKS), ...ARCS, SEALED_CARD]) if (THIRDS[c.id] && !c.options.includes(THIRDS[c.id])) c.options.push(THIRDS[c.id]);
