# Nullmeadow — World Canon

## Current world
**Nullmeadow** is the working name of the playable settlement/world. It is currently a broad patchwork field with one functioning building surrounded by reserved construction sites.

## Pip
**Pip** is the current player character and collector. Pip can move freely using WASD/arrow keys or by tapping/clicking ground. Walking into a loose resource collects it.

## The Crankhouse
**The Crankhouse** is the one active building at world center. Clicking/tapping it manually produces one unit of Glimmer and spits that Glimmer onto nearby ground.

The Crankhouse currently has no cooldown and no production cap. Every valid click creates exactly one loose Glimmer.

## Glimmer
**Glimmer** is the first resource/currency. It physically exists in the world after being produced. It is not owned until Pip walks over it and collects it.

HUD terminology:
- `GLIMMER` = banked/collected Glimmer.
- `ON GROUND` = loose Glimmer waiting to be collected.

## Ghostlots
**Ghostlots** are the locked outlined construction squares distributed around the Crankhouse. They are future building sites and currently cannot be interacted with or unlocked.

They are generated from a fixed random seed, so their apparently random positions remain stable across reloads. Current IDs are `Ghostlot 01`, `Ghostlot 02`, etc.

## Current verbs
- Move Pip.
- Click/tap the Crankhouse to make Glimmer.
- Walk Pip into Glimmer to collect it.

Everything beyond this is open for future features.
