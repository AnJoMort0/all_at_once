# Nullmeadow — World Canon

## Current world
**Nullmeadow** is the playable settlement/world: a deliberately mismatched patchwork clearing built from several asset styles. Its center is occupied by the Crankhouse, with Ghostlots clustered around it and trees, bushes, rocks, fences, weeds, and other clutter filling the surrounding field.

## Pip
**Pip** is the player character, collector, and current claimant of new land. Pip moves freely in the overworld using WASD/arrow keys or by tapping/clicking ground. Walking into loose resources collects them.

Pip is intentionally displayed larger than in v0.1 so the character reads clearly on a phone-sized screen.

## The Crankhouse
**The Crankhouse** is the starter building at world center. Clicking/tapping it manually produces one unit of Glimmer and spits that Glimmer onto nearby ground.

The Crankhouse currently has no cooldown and no production cap. Every valid click creates exactly one loose Glimmer.

## Glimmer
**Glimmer** is the first resource/currency. It physically exists in the world after being produced. It is not owned until Pip walks over it and collects it.

Glimmer pickups are intentionally chunky/oversized for readability.

HUD terminology:
- `GLIMMER` = banked/collected Glimmer.
- `ON GROUND` = loose Glimmer waiting to be collected.

## Ghostlots
**Ghostlots** are outlined future construction sites clustered around the Crankhouse. Their positions are generated from a fixed random seed so they remain stable across reloads.

A Ghostlot can be:
- **locked** — reserved but inaccessible;
- **calling** — the nearest currently locked lot, highlighted as the next claim target;
- **claimed** — permanently unlocked, but still empty until a later feature decides what can be built there.

Current IDs are `Ghostlot 01`, `Ghostlot 02`, etc. The calling lot is determined by distance to the Crankhouse, not by ID number.

When Pip physically walks onto the calling Ghostlot, a speech-bubble-style prompt appears with a play button. Pressing it starts that lot's Claimrun.

## The Claimrun
**The Claimrun** is the current Ghostlot unlock ritual: a deliberately cheap mobile-ad-style combat mini-game that Pip is teleported into.

Current rules:
- Pip stays near the bottom of a portrait firing lane.
- The player drags/taps or uses A/D/arrow keys to move left and right.
- Pip auto-fires arrows upward.
- Skeleton enemies descend from the top in a finite wave.
- If enemies breach the bottom fence, Fence integrity is lost.
- Losing all Fence integrity fails the Claimrun; the player may retry or retreat.
- Clearing the finite wave while any Fence integrity remains wins the Claimrun.

### Fire gates
The firing lane contains paired walls/gates:
- **green `+ FIRE` gates** charge as bullets pass through them; every completed charge raises Fire Level;
- **red `- FIRE` gates** charge when shot and reduce Fire Level when completed;
- higher Fire Level increases firing rate and eventually adds parallel projectiles.

The intentionally silly optimal behavior is therefore to steer shots through green walls while avoiding red ones.

## Valor
**Valor** is the second currency. It represents successful conquest/claim victories rather than production.

The current reward is **+1 Valor per newly completed Claimrun**. Its eventual spending purpose is intentionally undefined.

## Persistence
Banked Glimmer, Valor, and claimed Ghostlots are saved in browser `localStorage` under `nullmeadow-save-v2`, so winning a claim survives normal page reloads.

Loose Glimmer on the ground is ephemeral and is not saved.

## Current verbs
- Move Pip around Nullmeadow.
- Click/tap the Crankhouse to produce Glimmer.
- Walk into Glimmer to collect it.
- Find the highlighted calling Ghostlot.
- Walk onto it and press its play button.
- Complete the Claimrun to claim that lot and earn Valor.

Everything beyond this remains open for future features.
