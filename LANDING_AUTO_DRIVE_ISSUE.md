# Landing Auto-Drive — v376 Root-Cause Fix

## What v374/v375 got wrong

The landing state machine was already entering `skid` and moving the dedicated
landing-field tile. The visible failure came from the **render/update architecture**:

- `airfieldMode` caused the normal city/building/street layers to stop drawing.
- `updateBuildings()` also explicitly returned while `airfieldMode` was active.
- `updateAirfield()` ran too late in the frame, after the background/parallax
  systems had already updated/drawn.
- Therefore the taxi speed was not an authoritative world-scroll input for the
  frame's visual systems.
- The previous patch changed update order but did not re-enable the world layers
  during `skid`, so the visible world was still effectively frozen/hidden.

## v376 architecture

### Touchdown
`land` immediately becomes `skid`.

### Taxi
For exactly 4 seconds:

- `__airborneAirfieldPhase = "skid"`
- `__airborneTaxiSpeed` is the authoritative taxi speed.
- Runway tiles scroll continuously at about 260 px/s, easing down near the end.
- City/building/street/powerline/vehicle layers are allowed to render.
- Those world layers scroll at a deliberately slower parallax rate so movement is
  obvious but the runway still reads as the foreground motion.
- `updateAirfield()` runs at the beginning of the frame, before parallax/world
  update and rendering.
- Blimp X/Y/vertical velocity are hard-locked.
- Input flags are cleared during skid.

### Stop
At 4 seconds the taxi speed is set to zero, taxi phase ends, and the existing
score/report sequence begins.

## Expected visible result

**Touchdown**
→ runway starts moving immediately  
→ buildings/street/background visibly move behind the runway  
→ blimp stays planted in the same screen position  
→ ~4 seconds of continuous taxi  
→ ease to stop  
→ score/report

No HOLD gesture is used.

## Deployment

Upload these files together and hard-refresh with:

`?v=ruff376`

## Files
- `world-buildings.js`
- `player-obstacles.js`
- `ruff-tutorial.js`
- `gamestate-ui.js`
- `main-loop.js`
- `index.html`
- `LANDING_AUTO_DRIVE_ISSUE.md`
