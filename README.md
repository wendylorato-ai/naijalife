# NaijaLife — Stage 1C: Polished 3D District Prototype

Interactive third-person 3D district prototype set in a fictional Lekki-inspired area of Lagos.

## What is new in Stage 1C

- Cinematic intro → welcome screen → transition into the 3D world (preserved from Stage 1A shell)
- Building / obstacle collision with simple wall-sliding
- Crosswalks (zebra markings) and clearer road edge lines
- Planters, benches, district sign, extra street furniture
- Improved third-person movement and FollowCamera tuning
- Run action (Shift on desktop, RUN button on mobile)
- Functional pause / resume overlay (Esc or Pause button) that does **not** destroy the scene
- Hold-to-move mobile directional pad (pointer events)
- Dynamic location label (Avenue / West Side / East Side)
- Clearer first-day objective chip
- Responsive layout for different screen sizes
- Fixed Stage 1B syntax error (leading quote) and pause-related scene recreation

## Run locally

1. Install Node.js 18+ (Node 20 or 22 recommended).
2. Open this folder in a terminal.
3. `npm install`
4. `npm run dev`
5. Open `http://localhost:3000`

Production build check:

```bash
npm run build
npm start
```

## Controls

| Action        | Desktop              | Mobile                          |
|---------------|----------------------|---------------------------------|
| Move          | W A S D / Arrow keys | On-screen D-pad (hold)          |
| Run           | Hold Shift           | Hold RUN button                 |
| Pause/Resume  | Esc or Pause button  | Pause button                    |
| Camera orbit  | Mouse drag on canvas | Touch drag on canvas            |

## Included

- Babylon.js scene with third-person FollowCamera
- Primitive player avatar
- Lekki-inspired avenue, side streets, sidewalks, streetlights, palms, varied buildings
- Parked cars + looping traffic
- AABB collision against buildings, parked cars, and palm trunks
- HUD (location, coordinates, virtual cash, objective, pause overlay)
- Mobile-responsive controls

## Honest status / limitations

This is a **playable early prototype**, not a finished game.

- Geometry is primitive (boxes, cylinders, spheres) — not production art assets
- No character animation (legs do not walk-cycle)
- No vehicle driving or interaction yet
- No jobs, economy transactions, properties, missions progression, NPCs, or saves
- Collision is simple AABB with wall sliding; not full physics
- Traffic cars do not collide with the player yet
- Not tested on physical iOS/Android devices in this environment
- Multiplayer and backend are future stages

## Testing performed in this environment

- `npm install` completed successfully
- `npm run build` (Next.js production build) was run; results are noted in the package notes
- Syntax and import errors from Stage 1B were fixed
- Pause no longer recreates the Babylon engine/scene
- Collision, run, and mobile pad logic are implemented and self-consistent in code

**Browser / device testing still required by you:**
- Keyboard + mouse movement and camera in Chrome/Firefox/Safari
- Touch D-pad and RUN button on a phone or tablet
- Pause overlay behaviour while moving
- Performance on lower-end devices

## Version

- Stage 1A — App shell & cinematic entry
- Stage 1B — First Babylon.js district + basic movement
- **Stage 1C — Collision, polish, pause, run, better controls, entry flow restored** (this package)

Next planned stages (from project roadmap): character customisation & animation, vehicles, jobs/economy, properties, missions, NPCs, accounts/persistence, multiplayer, mobile packaging.
