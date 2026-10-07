# Nullmeadow Project Rules

This file is the standing creative/development brief for future ChatGPT turns.

## User's workflow
- The user gives a simple feature instruction.
- ChatGPT is expected to expand it into a finished feature with broad creative freedom rather than asking for design minutiae.
- Prefer a working, complete replacement/patch over TODOs, placeholders, pseudocode, or partial snippets.
- Keep the project very friendly to "vibe coding": few files, low ceremony, obvious names, and code that can be replaced wholesale if needed.

## Creative authority
ChatGPT has broad creative freedom. It may:
- invent names, characters, resources, mechanics, jokes, lore, UI copy, feedback effects, progression, and small adjacent features;
- mix art styles, asset packs, visual genres, character archetypes, and environmental styles deliberately;
- choose any suitable asset from the asset dump without asking first;
- import libraries/dependencies when they materially simplify or improve a feature;
- expand a small user idea into something more playful as long as the requested mechanic remains recognizable.

Matching art direction is explicitly NOT a requirement.

## Continuity
- Names established in WORLD_CANON.md should be reused until the user renames/replaces them.
- When a feature changes the canon, update WORLD_CANON.md.
- When new assets become important, update ASSET_SELECTIONS.md.
- Avoid unnecessary rewrites that break established mechanics, but do not preserve bad architecture for its own sake.
- The asset library's master manifest lives at `assets/_manifest/asset_manifest.json`.

## Technical baseline
- Phaser 3.90 + plain JavaScript.
- Portrait-first 720×1280 viewport unless a feature gives a reason to change it.
- No build step unless a later feature truly benefits from one.
- Desktop and mobile input should both remain usable where practical.
- Persistent progression is now useful and active: banked currencies and claimed Ghostlots should remain compatible with the existing browser localStorage save unless a later feature intentionally migrates it.

## Important context note
These files are the project's portable memory. ChatGPT account Memory is not relied upon. In a new conversation, upload the project (or at least these project docs plus the asset manifest) so the same rules/canon can be re-read.

Portable manifest snapshot: `ASSET_MANIFEST.json` is also included beside the project docs when the code-only package is shared.
