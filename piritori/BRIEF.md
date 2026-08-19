# PIRITORI → EDEN

Game, narrative and visual direction brief

Status: historical first design anchor, 2026-08-16
Platform: mobile-first browser game, desktop supported  
Product pair: Piritori → Eden + Toko Move  

> **Current authority:** `GAME_DESIGN_DOCUMENT.md` is the owner-review baseline
> for game structure, interaction modes, location encounters, 3v3 combat and the
> vertical slice. The previous Art Bible was rejected and reset; no current art
> direction is authoritative or part of the PR.
> Where this historical brief conflicts with the GDD, the GDD wins.

## Direction lock

This is a systemic city-flow and market game. It is not the earlier “small
traveller crossing a handcrafted world” interpretation. That direction is
superseded.

The player sees a Helsinki-inspired city moving in daylight: people commute,
study, shop, visit and go home. Under that ordinary movement sits a second
network carrying product, money, attention and consequences.

The pitch:

> 1984 Drug Wars market pressure inside a living Mini Metro / Mini Motorways-style
> flow map, with a street-level Helsinki narrative and a way out called Eden.

The important new idea is not the drug theme by itself. It is that the legal
and illegal city are the same city, using the same routes, people and limited
capacity.

## Two products, one simulation

| | Piritori → Eden | Toko Move |
|---|---|---|
| Audience | adult | family-friendly |
| Fantasy | operate and survive a hidden urban market | keep a growing city moving through one day |
| Surface | people, transport and city routines | people, transport and city routines |
| Fourth layer | product, cash, heat and trust | freight, services, pollution and access |
| Pressure | debt, volatile prices, scrutiny, broken relationships | delay, congestion, emissions, missed journeys |
| Tone | deadpan, intimate, funny and bleak | warm, readable, busy and optimistic |
| Run goal | reach an exit before the network owns you | complete the day with a healthy transport system |

The second game is not an afterthought or a cosmetic “safe mode.” Both products
must be playable from the first vertical slice, importing the same neutral
simulation. Piritori adds market, heat and narrative systems. Toko Move adds
public-service goals, accessibility and environmental scoring.

Working target: roughly two-thirds of simulation, input, save, replay and
rendering code is shared. Product rules and presentation remain separate enough
that neither game has drug terminology or moral assumptions leaking into the
other.

## Design pillars

### 1. Flow is visible

The player should understand a problem by looking at movement, not by opening a
spreadsheet. Waiting people collect at origins. Vehicles bunch. Transfers pulse.
Product disappears into crowds and cash returns against the flow. Heat stains
overused nodes and edges.

### 2. Ordinary traffic is the cover

People are not decorative particles. Their routines create capacity, congestion
and camouflage. A crowded tram is slow but anonymous. A private car is direct
but conspicuous. A walking route is cheap and local but carries very little.

### 3. Few actions, hard decisions

On the operations map the player draws or edits routes, assigns a crew, chooses
missions and settles the day. Missions may open a separate alternating-turn
battle screen. Aatami calls the shots; recruited crew members execute them and
carry the risk.

### 4. The map tells the story

Narrative events change routes, prices, people and places. A contact
disappearing is visible as a dead node. A night bus cancellation changes both
commuter flow and the shadow network. A raid is not just a text card; it closes
an edge and pushes traffic elsewhere.

### 5. Short runs, strong replay

Target a 20–30 minute, 30-day campaign after prototyping. Planning can always be
paused. A seeded daily run is a natural fit for both products once the core is
proven.

## What the references contribute

| Reference | Keep | Do not copy |
|---|---|---|
| Drug Wars (John E. Dell, 1984) | turn-based location arbitrage, local price tables, loan-shark debt, limited coat capacity, one day per trip, random market shocks and a 30-day horizon | Officer Hardass, direct rewards for killing police, random punishment without readable warning, a menu-only presentation |
| Final Fantasy / modern alternating-turn RPGs | legible team turns, attacks, equipment, status and tactical party composition | spectacle-first magic, long ability lists or world-saving heroics |
| Darkest Dungeon | recruitable roster, injury, death, replacement pressure and attachment to imperfect operatives | its exact stress system, formation grammar, gothic presentation or punitive opacity |
| Later Drug Wars modernisations, optional | only features that clarify the original loop: price history, readable shocks, touch input and compact runs | timers, monetised waiting, farming busywork or PvP sabotage |
| Mini Metro | immediate map readability, automatic agents, limited route resources, pause-and-redraw, overload as visible failure | its station-shape language, exact line grammar, passenger icons or zen-clean emotional tone |
| Mini Motorways | origin-to-destination flow, network bottlenecks, constrained upgrades, a city that grows around earlier decisions | coloured-house matching, pins, road-tile economy or grid appearance |
| Original Toko Move concept | mobile-first play, four traffic layers, foot / bike / car / public transport, distance and pollution trade-offs, growth turning a clean system hectic | the old 2021 release and free-to-play assumptions |

The owner has confirmed that “Weed Wars” was a mistaken recollection of one of
the original’s many modernisations. The mechanical baseline is specifically
John E. Dell’s 1984 MS-DOS game. Later versions are research leads, not lineage.

## Player role and setting

The player is Aatami in the 2000s and his son Kalle in 2024, inside the network
rather than looking down as a mayor. The first-generation starting node is
Piritori. At the beginning, Aatami knows one route, one contact and one debt.
Growth turns personal errands into a system.

At first Aatami personally buys small quantities at Piritori and sends a tiny
crew through nearby Kallio streets to sell them. Small jobs open contacts and
territory. The first firearm bought at Piritori is the explicit gate into
tactical missions. Over time Aatami stops travelling and becomes a commander;
his recruited operatives move, fight, become injured and may die.

The map is recognisably Helsinki in coastline, rail and district rhythm, but
compressed and fictionalised for play. It should never claim to model real
trafficking routes or current real people.

Piritori is a literal starting place. Eden is the promised exit.

Working definition:

> Eden is not another profitable district. It is the life the player believes
> this money will buy, deliberately kept just beyond the edge of the map.

That gives the campaign a direction other than “become the richest dealer.”
Paying the debt is survival. Building an exit while keeping at least one human
relationship intact is victory. This definition is a strong working hypothesis,
not yet owner-locked; Eden could still become a literal place, person or event.

## Four traffic layers

The attached Toko Move slide names four layers but only explicitly labels
private transport as Layer 2 and public transport as Layer 3. This brief turns
that into one shared diagnostic model:

| Layer | What the player sees | Piritori meaning | Toko Move meaning |
|---|---|---|---|
| 1 — Need | homes, work, school, shops, visits, waiting demand | customers and contacts exist inside normal routines | why each person needs to travel |
| 2 — Local / private | walking, bicycle, scooter, car | cheap or direct courier capacity | private mobility, cost and pollution |
| 3 — Public | bus, tram, metro, train | high-capacity flow with transfers and shared scrutiny | public-network coverage and reliability |
| 4 — Hidden / service | a second payload riding the first three layers | product outward, cash inward, heat and trust around them | deliveries, maintenance, emergency access and freight |

All layers can be viewed together. Holding or scrubbing the layer control
temporarily isolates one without moving the camera or entering a separate
management screen.

## Core loop

### Read

At the start of a day, inspect demand, market offers, delayed routes, contact
needs and the current pressure map. New information is limited and local; the
player never receives a perfect forecast.

### Work the street

Piritori begins as the only reliable source, with small quantities and the
cheapest low-quality recruits. Sell through a few nearby neighbourhoods and
survive rival encounters before the full market opens.

### Draw

Create or alter a small number of routes. Assign a mode and limited capacity.
Choose which offers to accept and what a route prioritises. Planning pauses
time.

### Run

People and payloads move automatically. Origins queue. Vehicles transfer loads.
Product travels outward and money returns. The player watches rather than
steering individuals.

### Deploy

Assign recruited crew, weapons, armour and consumable resources to an active
mission. A mission can resolve through movement, negotiation or sabotage, or
open the separate alternating-turn battle screen. Aatami is not a combat unit.

### Resolve

Apply wounds, deaths, territory change, captured stock, new information and
relationship consequences. Survivors return to the roster changed; vacancies
make recruitment part of the economy.

### Reroute

React to a price spike, missed connection, inspection, closure, crowd event,
weather or a personal request. Repetition is efficient but raises attention.
Novel routes are safer but slower and more expensive.

### Settle

At day end, pay debt or interest, bank profit, invest in capacity, answer one
human event and see what the city remembers. Then the market and movement
patterns advance.

## Main systems

### Market

- The first prototype names amphetamine and, in 2024, Alpha-PVP. This is
  deliberately less operational than a real market and does not model sourcing,
  doses, concealment or real routes.
- Every district has a changing buy and sell range.
- Events shift supply or demand for a readable reason.
- The player acts on imperfect information; yesterday’s price remains visible
  so choices feel learned rather than random.
- Real substance names and final fiction are a narrative decision after the
  loop works.
- The early street market is deliberately narrow. Completing local missions
  reveals new buy/sell locations, price information and wholesale access.

### Crew, equipment and tactical battles

- Recruits have role, reliability, health, equipment slots and faction history.
- Piritori always offers the cheapest hired hands; cheap does not mean safe or
  loyal.
- Weapons and armour change available actions, damage, protection and mission
  confidence. They do not turn the game into a shooter.
- Battles alternate between the player crew and opposing team, with a small
  readable action set and clear target order.
- Injury and death persist. Replacements are necessary, and veteran loss should
  hurt strategically and narratively.
- The first firearm is a progression gate that unlocks armed missions rather
  than an immediate power fantasy.

### Contact locations

- **Toko Slomo’s Noodles, Vaasankatu:** buy information and gamble resources on
  sabotage whose probability and consequences are partially revealed.
- **McCormicks, Siltanen complex:** hired guns, firearms, armour, intimidation
  and sabotage services.
- **Jade Lantern Network:** the fictional Chinese restaurant-mafia faction,
  operating many restaurant fronts and specialising in firearms and other
  illicit materials. It is an invented organisation, not a statement about
  Chinese restaurateurs.
- **Piritori:** starting retail source, first street sales, cheapest recruits
  and the first firearm unlock.

### Capacity

- Every route has throughput, travel time, transfer cost and visibility.
- People always consume real capacity.
- Hidden payload cannot teleport or move on a separate invisible graph.
- More carriers or vehicles improve throughput but add cost and observable
  repetition.

### Debt and time

- The opening debt creates Drug Wars pressure immediately.
- Interest advances at settlement, not continuously while a menu is open.
- The campaign has a fixed horizon.
- Paying the debt early creates breathing room but slows expansion.

### Pressure / heat

- Heat belongs to nodes and edges, not a global wanted bar.
- It grows through high volume, repeated routes, risky payloads and visible
  incidents.
- It cools through time and changed behaviour.
- Thresholds are telegraphed before an inspection or closure.
- Heat can still be answered by rerouting, abandoning stock, sacrificing profit
  or calling in trust. Armed confrontations use the tactical screen and create
  persistent casualties; they never become real-time chases or shooting.

### Trust

- Contacts provide market information, temporary capacity and safer transfers.
- Treating a contact as disposable may create short-term profit and long-term
  fragility.
- Trust is shown through what people do, offer or refuse. Avoid a large
  good/evil meter.

### City health

The game should acknowledge damage without turning into a lecture. Consequence
appears through specific people, queues, absences, closed doors and changed
district behaviour. Efficient exploitation can still feel mechanically
powerful; the narrative makes clear what that efficiency is doing.

## Failure and endings

Prototype failure conditions:

- debt cannot be serviced at settlement;
- the only remaining contact or route collapses;
- heat closes the starting network.

Final endings should resolve from a small matrix rather than a morality score:

- debt cleared or not;
- exit fund reached or not;
- network heat;
- key relationships intact or burned.

The richest result is not automatically the best result. The end screen freezes
the city and shows what still moves after the player is gone.

## Narrative delivery

- Eight or fewer recurring contacts for the first campaign.
- One to three lines per event, anchored to a person or place on the map.
- No lore logs, codex, omniscient narrator or long dialogue scenes.
- In Era I, delivery channels stay distinct: scheduled TV news, calls/SMS on a
  feature phone, and online information at a physical desktop terminal.
- Events must change a number, route, capacity, relationship or visible place.
- The city remembers: shutters, memorials, reopened shops, new transit, missing
  lights and altered travel patterns persist across days.

Tone:

- Helsinki street-level, not global-cartel fantasy.
- Dry and specific rather than grim for its own sake.
- Drug use is neither sanitised nor sold as lifestyle decoration.
- Avoid Scarface imagery, weed-leaf branding, gang caricatures and police as
  faceless combat targets.

Example register, not final copy:

- “The last metro left. The market didn’t.”
- “Everybody knows the short route now.”
- “Eden costs more today.”

## Visual direction

### Shared visual grammar

- A living printed city diagram rather than a satellite map.
- Coastline, rail, major streets and district blocks form the base.
- People are tiny animated marks, not detailed characters.
- Route width, pulse spacing and queues communicate load.
- Every important change appears first on the map and second in text.
- The map must remain readable on a phone held in one hand.

The look should take the clarity lesson from Mini Metro without cloning its
coloured lines and geometric station symbols. The distinct identity is a
layered cut-carton civic map: clean screen-print flats, visible paper thickness,
soft cast shadows, municipal typography and selective torn fibres. Registration
drift and roughness are accents, not an all-over filter.

### Piritori skin

- Night-paper base: charcoal, dirty off-white and cold blue water.
- Toko magenta may mark the product or player, but is not body copy.
- Warning orange is reserved for immediate pressure.
- Human movement stays mostly pale and civic; the hidden layer introduces sharp
  fluorescent accents.
- As the network grows, the map becomes overwritten, taped, stamped and
  corrected rather than simply brighter.
- The shadow layer should feel discoverable beneath the city, not a glowing
  cyberpunk overlay.

### Toko Move skin

- Day-paper base with mint, sky, coral, yellow and clean dark type.
- The same route geometry and moving marks feel open and constructive.
- Freight and services use practical icons rather than contraband codes.
- Pollution appears as a soft wake or paper stain; access gaps appear as quiet
  empty areas.
- The day progresses from morning coolness through busy noon into warm evening.

The Toko Midori signature can frame boot/end presentation, but the two-colour
black/magenta brand must not flatten the game map into a brand board.

## Interface

- Portrait-first with landscape support.
- Bottom-sheet actions and 44 px minimum touch targets.
- Tap a node for its local state; drag between nodes to propose a route.
- One persistent pause / speed control.
- No hover-only information.
- Colour is never the only identifier; route pattern, motion and glyph also
  carry meaning.
- The first 30 seconds must be playable without a tutorial paragraph.

## Audio

Build a procedural city rhythm from movement:

- footsteps and bicycle ticks;
- doors, bells and rail pulses;
- cash return as a reverse accent;
- heat as missing beats, radio bleed and abrupt silence.

Piritori and Toko Move can use the same event hooks with different sound banks.
Audio must reinforce throughput and disruption, not become ambient wallpaper.

## First vertical slice

One branch should eventually produce two entry points backed by one core:

- a fictionalised central-Helsinki map;
- 6–8 nodes;
- walking plus one public mode;
- visible people queues and automatic pathing;
- route drawing and editing;
- seven compressed days;
- three market classes in Piritori;
- one price shock, one closure and one relationship event;
- homes, work, school and shop demand in Toko Move;
- one congestion event and one service upgrade;
- a shared seeded replay.

The slice is successful when:

1. A new player can identify where movement is failing without opening a stats
   panel.
2. The player can explain why a fast route became risky or congested.
3. The two products feel emotionally different while clearly sharing the same
   moving city.
4. Switching products does not expose the other product’s terminology or data.
5. The game remains legible and responsive on a mid-range phone.

## Not in the first slice

- full Helsinki;
- multiplayer;
- detailed cultivation;
- real-world route data;
- live service or accounts;
- monetisation;
- long narrative scenes;
- final art production;
- hub deployment.

## Decisions the owner should lock next

1. Final campaign time model and duration.
2. What exactly Eden means in the ending matrix.
3. Persistent verbs versus fully contextual actions in location encounters.
4. Exact 3v3 lethality and casualty frequency.
5. Exact Kallio and Pasila map boundaries.

## Reference links

- Drug Wars overview and original loop:
  https://en.wikipedia.org/wiki/Drug_Wars_(video_game)
- Drug Wars / BBS mechanics and variants:
  https://breakintochat.com/wiki/Drugwars
- Mini Metro official description:
  https://dinopoloclub.com/games/mini-metro/
- Mini Motorways official description:
  https://dinopoloclub.com/games/mini-motorways/
- Mini Metro design discussion:
  https://www.gamedeveloper.com/design/let-s-talk-about-mini-metro

The supplied 2021 Project Move / Toko Move concept image is kept under
references as source context. Its platform and transport-layer intent is useful;
its release and business-model notes are historical, not current commitments.
