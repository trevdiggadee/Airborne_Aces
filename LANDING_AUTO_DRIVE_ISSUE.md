# Landing Auto-Drive — Issue Description & Expected Behavior

## Expected behavior
1. Player flares down and **lands** on the runway (approach already works).
2. On touchdown, phase becomes **skid** (taxi).
3. Blimp stays fixed on the deck (`player.x ≈ 25% width`, `y` on runway).
4. Runway art **scrolls left under the blimp** for **~4 seconds** (same idea as takeoff).
5. World scroll speed (`obstacleSpeed`) matches so the sky/parallax also moves.
6. Tip shows: "Taxiing to the hangar…" then "Coming to a stop…"
7. After ~4s, phase becomes **score** and the flight report appears quickly.

**No hold required.** Taps after landing must **not** flap/jump the blimp.

## Actual behavior (reported)
- Landing approach works.
- Touchdown looks correct.
- After landing: blimp sits still (or only jumps once if tapped).
- No clear taxi/drive motion.
- Long wait before score (or score feels disconnected from a drive).

## Root causes identified in code

### 1. Hold-based drive was unreliable (historical)
Earlier versions required HOLD to scroll. Touchdown cleared hold flags while the finger was still down, so drive never started until an 8s timeout.  
**Mitigation:** switched to **auto-drive** (v372+) — no hold required.

### 2. Phase sync / flap jump
`window.__airborneAirfieldPhase` could still be `"land"` for a frame after touchdown, so a tap applied flap velocity → one jump.  
**Mitigation:** `syncAirfieldGlobals()` on touchdown; flap blocked for `skid` / `score` / `done`.

### 3. Strip tiles may not loop visibly
Landing strip is often **one** `landing_field` tile. If it scrolls off without a solid loop, motion is weak or the strip vanishes.  
**Mitigation (v374):** force **3 looping tiles**, reposition under blimp at skid start, scroll at **260 px/s** for 4s, and set `obstacleSpeed` so the whole world moves.

### 4. Possible deploy/cache mismatch
If live site still serves an older `world-buildings.js`, auto-drive code is not running. Confirm `?v=ruff374` (or current) on script tags.

## Files involved
| File | Role |
|------|------|
| `world-buildings.js` | `updateAirfield` land → skid → score; strip tiles; auto-drive scroll |
| `player-obstacles.js` | `flap()` must not jump during skid/score |
| `ruff-tutorial.js` | Landing stage requests land; advances to report when ready |
| `gamestate-ui.js` | Input/hold flags (not required for auto-drive) |
| `main-loop.js` | Calls `updateAirfield` / `updatePlayer` each frame |
| `index.html` | Cache-bust query params |

## Key functions
- `ensureAirfieldStripVisible()` — builds landing strip tiles
- `drawAirfieldStrip()` — draws `landing_field` / `airfield_strip`
- `updateAirfield()` branches: `"land"` → `"skid"` → `"score"`
- `window.__airborneForceLandingSkid` — assist if land takes too long
- `showFlightReport()` — score UI when `__airborneTrainingReportReady`

## How to verify
1. Hard-refresh with new cache param.
2. Complete training to landing.
3. After wheels-down, tip should say **Taxiing…** and runway should slide for ~4s.
4. Score/report should appear right after taxi ends.
