# Landing Auto-Drive — v375 Diagnosis & Expected Behavior

## Expected behavior
1. Player flares down and **lands** on the runway.
2. On touchdown, phase becomes **skid** (taxi).
3. Blimp stays fixed around `25%` screen width and remains planted on the runway.
4. Runway art scrolls left under the fixed blimp for **4 seconds**.
5. Taxi speed eases down during the final part of the 4 seconds.
6. Visible world/parallax motion uses the same taxi speed.
7. Tip shows **“Taxiing to the hangar…”**, then **“Coming to a stop…”**.
8. Taxi ends → `score` → flight report appears almost immediately.
9. Taps after touchdown never flap/jump the blimp.
10. No HOLD gesture is required.

## What was wrong

### Primary v375 issue found during end-to-end review: update/render order

The v374 auto-drive code correctly set `obstacleSpeed` during the skid, but
`main-loop.js` called `updateAirfield()` **after** the background/parallax layers
had already been updated and drawn.

That created a timing mismatch:

- taxi code calculated the new 260 px/s drive speed;
- runway could move on the following frame;
- parallax/world systems had already used the previous speed for the current frame;
- the player could therefore appear to be sitting still even though the taxi
  state was active.

### v375 fix

`main-loop.js` now updates the scripted airfield **before rendering**.

This means the same frame that enters/continues taxi can provide the current
taxi speed to the world/parallax update.

The normal gameplay path is otherwise unchanged.

## Other confirmed causes already fixed in v374

### 1. Old HOLD-based drive
Historical landing logic required HOLD. Touchdown could clear the hold flags
while the finger was still down, so the drive never started.

**Current behavior:** automatic taxi. No hold required.

### 2. One-frame `"land"` phase after touchdown
A tap arriving immediately after touchdown could see the old `"land"` phase and
apply flap velocity.

**Current behavior:** touchdown immediately calls `syncAirfieldGlobals()`;
`player-obstacles.js` blocks flap during `skid`, `score`, and `done`.

### 3. Landing strip did not loop strongly enough
The landing strip could be a single tile, making movement visually weak.

**Current behavior:** skid ensures at least 3 looping landing tiles and repositions
the first tile under the blimp.

### 4. Cache mismatch
A live site can continue serving an older JavaScript file.

**Current behavior:** v375 changes the script cache key to `?v=ruff375`.

## Important world-layer note

The normal city/building ground layers are intentionally suppressed while the
dedicated airfield runway is active. The intended “world scroll” during taxi is
therefore the background/parallax motion, while the runway is the strongest
foreground motion cue.

If the design goal is instead to show the **city buildings themselves moving**
during taxi, that is a separate visual change; `updateBuildings()` currently
returns while `airfieldMode` is active.

## Files
| File | Role |
|---|---|
| `world-buildings.js` | Landing state machine, runway tiles, 4s auto taxi, score handoff |
| `player-obstacles.js` | Prevents flap/jump during taxi/score |
| `ruff-tutorial.js` | Requests landing and advances to report |
| `gamestate-ui.js` | Input/hold flags; no HOLD is required for taxi |
| `main-loop.js` | **v375 fix:** airfield updates before render/parallax |
| `index.html` | **v375 cache-bust** |
| `LANDING_AUTO_DRIVE_ISSUE.md` | This diagnosis |

## Verification checklist

1. Deploy **all files** from this package together.
2. Hard refresh so the browser loads `?v=ruff375`.
3. Complete the landing approach.
4. On touchdown, verify:
   - no jump from tapping;
   - “Taxiing to the hangar…” appears;
   - runway visibly slides for ~4 seconds;
   - background/parallax motion is visible;
   - final seconds ease down;
   - “Coming to a stop…” appears;
   - report appears immediately after taxi.
5. If the runway moves but the background does not, inspect the parallax layer
   implementation separately; do not revert the auto-drive state machine.

## v375 change summary

**Only the frame/update ordering was changed for the core fix.** The existing
v374 landing state machine, flap lock, looping runway, 4-second taxi, and report
handoff remain intact.
