# Phaser Asset Quickstart

All paths below are relative to your project root if this `assets/` folder sits beside `index.html` and `game.js`.

## Single image

```js
this.load.image('key', 'assets/images/.../file.png');
```

## Sprite sheet

Use `_manifest/spritesheet_catalog.json` to inspect dimensions. A frame-size hint is included only for obvious horizontal square-frame strips.

```js
this.load.spritesheet('unit', 'assets/images/spritesheets/.../file.png', {
  frameWidth: 192,
  frameHeight: 192
});
```

## Separate-frame animation

Use `_manifest/animation_frame_groups.json` for ordered frame lists. Load each frame as an image, then create a Phaser animation from those keys.

## Audio

```js
this.load.audio('pickup', 'assets/audio/sfx/items/coin_collect.wav');
this.load.audio('music', 'assets/audio/music/loop_music1.ogg');
```

## AI workflow

When asking ChatGPT to add a feature, tell it to choose assets from `_manifest/asset_manifest.csv` and, for animated objects, check `animation_frame_groups.json` and `spritesheet_catalog.json` before writing preload/animation code.
