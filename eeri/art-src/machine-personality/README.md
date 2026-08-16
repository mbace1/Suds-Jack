# Eeri machine personality pack

Source-only secondary motion for the **existing excavator and wrecking crane**. It does not add machines, controls or mechanics.

The machines already communicate gameplay through their real joints and beacon. This pack adds only the tiny motions that make them feel like large handmade toys with weight: settle, tension, idle breathing and residual sway.

## Hard rule

**Personality never overrides gameplay animation.** Boom/stick/bucket/ball motion that communicates danger or the player's command wins. Secondary motion is applied only when that node is otherwise idle, and it returns to zero before a real action takes ownership.

## Existing contracts used

Excavator: `house`, `boom`, `stick`, `bucket`, `wheels`, `beacon`, `seat`, `step`.

Crane: `house`, `boom`, `arm`, `ball`, `wheels`, `beacon`, `seat`, `step`.

No new node names are required.

## Personality moments

- occupied idle: almost imperceptible body/bucket breathing
- drive start: one short body load-back
- drive stop: one heavy settle
- tool ready: tiny anticipation before a commanded work action
- post action: one damped return, never an extra bounce
- crane residual: ball may keep a small residual sway after a player swing, capped tightly

The unmanned beacon/work-cycle behaviour already in the game is intentionally **not duplicated here**.
