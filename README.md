# Nullmeadow v0.2 — First Claim

## Run it
This code expects the reorganized `assets/` folder to sit beside `index.html` and `game.js`:

```text
project/
  index.html
  game.js
  PROJECT_RULES.md
  WORLD_CANON.md
  ASSET_SELECTIONS.md
  assets/
```

Use a tiny local web server rather than double-clicking `index.html` if your browser blocks local asset loading.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Overworld controls
- WASD / arrow keys: move Pip.
- Click/tap ground: move Pip to that point.
- Click/tap the Crankhouse: produce one loose Glimmer.
- Walk into Glimmer: collect it.
- Walk onto the gold-highlighted calling Ghostlot: reveal its play bubble.
- Click/tap the play button: enter the Claimrun.

## Claimrun controls
- A/D or left/right arrows: move Pip horizontally.
- Drag/tap horizontally: steer Pip toward that X position.
- Shooting is automatic.
- Shoot green `+ FIRE` gates to raise Fire Level.
- Avoid shooting red `- FIRE` gates.
- Survive the finite skeleton wave with at least one Fence integrity remaining.

A successful Claimrun unlocks that Ghostlot and awards +1 Valor. The next-nearest locked Ghostlot then becomes the calling lot.

## Persistence
Collected Glimmer, Valor, and claimed Ghostlots are saved in browser localStorage under `nullmeadow-save-v2`.
