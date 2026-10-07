# Nullmeadow v0.1

## Run it
This code expects the reorganized `assets/` folder to sit beside `index.html` and `game.js`:

```
project/
  index.html
  game.js
  PROJECT_RULES.md
  WORLD_CANON.md
  ASSET_SELECTIONS.md
  assets/
```

Because the project loads external files, use a tiny local web server rather than double-clicking `index.html` if your browser blocks local asset loading.

For example, from the project folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Current controls
- WASD / arrow keys: move Pip.
- Click/tap ground: move Pip to that point.
- Click/tap the Crankhouse: produce one loose Glimmer.
- Walk into Glimmer: collect it.
