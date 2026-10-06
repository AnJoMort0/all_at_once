# Reorganized Asset Library

This archive contains the same usable source assets from the uploaded dump, reorganized for quick Phaser/JavaScript use. Finder `.DS_Store` junk files were intentionally omitted. Original asset filenames are otherwise preserved.

## Main layout

- `images/spritesheets/` — character, enemy, animal, effect, and icon sheets
- `images/animations/frames/` — animations supplied as separate PNG frames
- `images/tilesets/` — map/interior/terrain sheets
- `images/environment/` — buildings, decorations, resources, world objects
- `images/icons/` — separated icon files
- `images/ui/` — UI and controls
- `images/projectiles/` — standalone projectile art
- `audio/music/` — music loops/tracks
- `audio/sfx/` — sound effects grouped by purpose
- `source/aseprite/` — editable Aseprite source files
- `docs/` — licenses/readmes/previews
- `_manifest/` — machine-readable lookup files for AI/code generation

## Asset counts

- Original usable files preserved: **7816**
- Separate-frame animation groups detected: **38**
- PNG spritesheets catalogued: **342**

## How to use this with ChatGPT

Upload this ZIP (or keep it attached in the same conversation) and ask for a feature. The most useful lookup file is `_manifest/asset_manifest.csv`, which maps every original path to its new path. For animations, `_manifest/animation_frame_groups.json` gives ordered frame groups, and `_manifest/spritesheet_catalog.json` records dimensions plus conservative frame-size hints where the sheet is an obvious horizontal square-frame strip.

## Important

Licensing/readme files found in the upload were retained under `docs/`. Reorganization does not change the license terms of any source pack.
