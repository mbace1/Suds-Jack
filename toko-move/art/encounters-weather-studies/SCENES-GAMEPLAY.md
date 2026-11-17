# Approved scenes and gameplay context

- **tourist**: `toko-move/js/events.js`, ENCOUNTERS id tourist: at stop; Trade directions (cost40 ticks, goodwill1, score15, teaches=true), or Shrug (cost0). Art depicts conversation, not actual cathedral/map reconstruction. No UI costs baked in.
- **wallet**: same file, id wallet: Hand it in at the kiosk (cost60 ticks, goodwill2, score30); Pocket it (cost0, goodwill-3, score45); Leave it (cost0). Art depicts handing it in, not a new parcel contract.
- **wind**: decorative gust cues only. No new wind gameplay penalty or mechanical consequence asserted.
- **snow**: pedestrian steps; decorative light snow only. No slip/stamina penalty asserted; walking is an established verb in CAMPAIGN.md.

Costs above are ticks as authored, not invented seconds. EventDirector.choose applies existing fields; teaching calls teachStreet. Art does not establish a new persistent quest arc. Bodies, environment and weather integrated raster; only identity registered independently. Approval: pt150u, all four pairs. Future follow-up studies remain review-only until explicitly approved; add approved work to same open PR as requested.
