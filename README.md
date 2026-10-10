# NaijaLife — Full Vertical Slice (v1.0.0-alpha)

Playable Lekki-inspired district with character creation, driving, jobs, rent, missions, NPCs, and a live wallet.

## Included systems

| Stage | Feature | Status in this build |
|-------|---------|----------------------|
| 1A–1C | Cinematic entry, 3D district, collision, pause, run, mobile pad | ✅ |
| 2 | Expanded map, smoother movement | ✅ |
| 3 | Character name + skin/shirt/trousers, walk animation | ✅ |
| 4 | Driveable player car (F enter/exit), traffic, parked cars | ✅ basic |
| 5 | Jobs (earn ₦), wallet balance updates | ✅ basic |
| 6 | Properties (rent with cash), home flag | ✅ basic |
| 7 | Mission list + auto rewards | ✅ basic |
| 8 | Pedestrian NPCs patrolling | ✅ basic |
| 9 | Accounts / cloud saves / Supabase | ❌ scaffold only — not connected |
| 10 | Multiplayer | ❌ not implemented |
| 11 | Capacitor iOS/Android packaging | ❌ not packaged |

## How to play

1. Intro → Create character (name + colours)
2. Explore the large district (WASD, Shift run)
3. **F** near the blue car → drive (WASD); **F** again to exit
4. **E** near gold markers → jobs; amber markers → properties  
   Or use HUD buttons: JOBS / HOME / TASKS / WALLET
5. Complete missions for bonus ₦

## Run

```bash
npm install
npm run dev
