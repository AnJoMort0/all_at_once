# Current Asset Selections

The complete library index is `assets/_manifest/asset_manifest.json`.

Assets currently used by gameplay:

| Purpose | Asset path |
|---|---|
| Crankhouse | `assets/images/environment/buildings/tiny_swords/Blue Buildings/House1.png` |
| Pip idle | `assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Idle.png` — 8 frames at 192×192 |
| Pip run | `assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Run.png` — 6 frames at 192×192 |
| Clockwork helper idle | `assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Idle Hammer.png` — 8 frames at 192×192 |
| Clockwork helper run | `assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Run Hammer.png` — 6 frames at 192×192 |
| Clockwork helper work | `assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Interact Hammer.png` — 3 frames at 192×192 |
| Glimmer | `assets/images/environment/resources/tiny_swords/Gold/Gold Resource/Gold_Resource.png` |
| Large field tree variants | `assets/images/environment/resources/tiny_swords/Wood/Trees/Tree3.png` and `Tree4.png` — complete 192px frames |
| Cute Fantasy oak | `assets/images/environment/decorations/cute_fantasy/Oak_Tree.png` |
| Cute Fantasy oak clump | `assets/images/environment/decorations/cute_fantasy/Oak_Tree_Small.png` |
| Bush variants | `assets/images/environment/decorations/tiny_swords/Bushes/Bushe1.png` — treated as 8× 128px frames |
| Field rocks | `assets/images/environment/decorations/tiny_swords/Rocks/Rock1.png`, `Rock2.png` |
| Random fence prop | `assets/images/environment/decorations/cute_fantasy/Fences.png` |
| Claimrun skeleton | `assets/images/spritesheets/enemies/enemy_animations/enemies-skeleton1_movement.png` — 10× 32px frames |
| Claimrun projectile | `assets/images/projectiles/tiny_rpg_soldier_orc/Arrow01(32x32).png` |
| Crank click SFX | `assets/audio/sfx/other/finger_click.wav` |
| Glimmer collection SFX | `assets/audio/sfx/items/gem_collect.wav` |
| Claimrun shot SFX | `assets/audio/sfx/weapons/shot_muffled.wav` |
| Enemy hit SFX | `assets/audio/sfx/retro/hurt.wav` |
| Positive gate SFX | `assets/audio/sfx/retro/power_up.wav` |
| Negative gate SFX | `assets/audio/sfx/retro/power_down.wav` |
| Claim/teleport confirmation | `assets/audio/sfx/ui/synth_confirmation.wav` |

Ground texture, Ghostlot outlines/status marks, Claimrun arena, fire gates, particles, prompts, target marker, shadows, labels, and HUD are drawn procedurally in Phaser.

The overworld lives in `game.js`; the independent Claimrun scene lives in `claimrun.js` and is loaded before the main game script.
