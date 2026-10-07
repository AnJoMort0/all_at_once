/*
===============================================================================
NULLMEADOW — PROJECT CONTRACT + CANON — v0.6 "POLISH PASS"
===============================================================================

DEVELOPMENT RULES
- The user supplies small feature ideas; expand them freely into a playable design.
- Creative freedom is intentionally broad: mix art styles, genres, archetypes,
  minigames, mechanics, libraries and dependencies whenever useful.
- This project is intentionally becoming "all the games in one". Expect feature
  bloat; keep systems modular enough that unrelated silly games can coexist.
- Prefer the lowest-effort implementation that remains easy to extend.
- Modify as few files as possible. Return ONLY files that actually changed.
- Keep useful project canon and asset notes here in game.js rather than creating
  bookkeeping files that do not help development.
- Existing names become canon unless changing them materially improves the game.

CURRENT WORLD CANON
- Nullmeadow: the overworld/hub settlement.
- Pip: the roaming player character who physically picks up loose resources.
- The Crankhouse: central clickable building. Each crank ejects one Glimmer.
- Glimmer: primary hub currency/resource.
- Ghostlots: locked building plots scattered around Nullmeadow. The nearest locked
  Ghostlot becomes the Calling Lot.
- Claimrun: an embedded horde-shooter unlock game. Pip temporarily appears as a
  yellow archer, auto-fires upward, fights a finite horde and crosses moving,
  shootable arithmetic gates. Gate projectiles pass THROUGH the gate, so enemies
  behind it remain targetable. Positive gate values increase when shot; negative
  values become more negative. Gate pairs affect VOLLEY, RATE or SPEED.
- Claimrun difficulty scales from successfully claimed Ghostlots. Failed retries do
  not increase difficulty.
- Claimrun entry is a ONE-TIME Glimmer payment per lot. Failed attempts remain open
  and may be replayed for free until that lot is claimed.
- Valor: reward currency earned by winning Claimruns.
- Winning permanently claims the Ghostlot, awards +1 Valor and calls the next lot.
- UI direction: compact, asset-heavy, mobile-game-like, touch-first, with hover/tap
  explanations. Interactive buttons should use supplied UI art whenever practical.

IMPORTANT ASSET NOTES
- Tiny Swords Tree1.png is a six-cell strip, but only frames 0 and 3 are complete
  self-contained trees. Using every 256px cell produces sliced-tree artifacts.
- cute_fantasy/Fences.png is a 4x4 sheet of 16x16 fence tiles, NOT one fence image.
  Load it as a spritesheet. Using the whole 64x64 image creates the chopped fence
  cluster that appeared in earlier Nullmeadow screenshots.
===============================================================================
*/

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const WORLD_SIZE = 2100;
const SAVE_KEY = "nullmeadow-save-v2";

const FONT_DISPLAY = '"Lilita One", "Arial Black", sans-serif';
const FONT_BODY = '"Nunito", "Trebuchet MS", sans-serif';
const FONT_TECH = '"Pixelify Sans", monospace';

const THEME = {
    ink: 0x0b111b,
    ink2: 0x111b29,
    panel: 0x152131,
    panel2: 0x1c2b3d,
    line: 0x50647b,
    cream: 0xfff0b0,
    gold: 0xffd660,
    green: 0x61e58b,
    red: 0xf15c67,
    cyan: 0x75dff2,
    muted: 0x93a3b7
};

const CLAIM_COSTS = [
    5,
    12,
    22,
    36,
    55,
    80,
    110,
    150,
    200,
    260,
    330
];


function claimCostForProgress(claimedCount) {

    if (claimedCount < CLAIM_COSTS.length) {
        return CLAIM_COSTS[claimedCount];
    }

    const extra =
        claimedCount -
        CLAIM_COSTS.length +
        1;

    return (
        CLAIM_COSTS[
            CLAIM_COSTS.length - 1
        ] +
        extra * 90
    );

}


function compactAmount(value) {

    const n =
        Number(value) || 0;

    if (Math.abs(n) < 1000) {
        return String(n);
    }

    const units = [
        [1e9, "B"],
        [1e6, "M"],
        [1e3, "K"]
    ];

    for (const [size, suffix] of units) {

        if (Math.abs(n) >= size) {

            const scaled =
                n / size;

            let formatted =
                scaled >= 100
                    ? scaled.toFixed(0)
                    : scaled >= 10
                        ? scaled.toFixed(1)
                        : scaled.toFixed(2);

            formatted = formatted
                .replace(/\.00$/, "")
                .replace(
                    /(\.[0-9])0$/,
                    "$1"
                );

            return formatted + suffix;

        }

    }

    return String(n);

}


function defaultSave() {

    return {
        glimmer: 0,
        valor: 0,
        unlockedLots: [],
        openedClaimruns: []
    };

}


function loadSave() {

    try {

        const parsed =
            JSON.parse(
                localStorage.getItem(
                    SAVE_KEY
                )
            );

        const save = {
            ...defaultSave(),
            ...(parsed || {})
        };

        if (
            !Array.isArray(
                save.unlockedLots
            )
        ) {
            save.unlockedLots = [];
        }

        if (
            !Array.isArray(
                save.openedClaimruns
            )
        ) {
            save.openedClaimruns = [];
        }

        return save;

    } catch (_) {

        return defaultSave();

    }

}


function persistSave(save) {

    try {

        localStorage.setItem(
            SAVE_KEY,
            JSON.stringify(save)
        );

    } catch (_) {}

}


const ASSETS = {

    crankhouse:
        "assets/images/environment/buildings/tiny_swords/Blue Buildings/House1.png",

    pipIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Idle.png",

    pipRun:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Run.png",

    glimmer:
        "assets/images/environment/resources/tiny_swords/Gold/Gold Resource/Gold_Resource.png",


    oakTree:
        "assets/images/environment/decorations/cute_fantasy/Oak_Tree.png",

    oakClump:
        "assets/images/environment/decorations/cute_fantasy/Oak_Tree_Small.png",

    treeStrip:
        "assets/images/environment/resources/tiny_swords/Wood/Trees/Tree1.png",

    bushStrip:
        "assets/images/environment/decorations/tiny_swords/Bushes/Bushe1.png",

    rock1:
        "assets/images/environment/decorations/tiny_swords/Rocks/Rock1.png",

    rock2:
        "assets/images/environment/decorations/tiny_swords/Rocks/Rock2.png",

    rock3:
        "assets/images/environment/decorations/tiny_swords/Rocks/Rock3.png",

    rock4:
        "assets/images/environment/decorations/tiny_swords/Rocks/Rock4.png",

    duck:
        "assets/images/environment/decorations/tiny_swords/Rubber Duck/Rubber duck.png",

    chest:
        "assets/images/environment/decorations/cute_fantasy/Chest.png",

    fenceTiles:
        "assets/images/environment/decorations/cute_fantasy/Fences.png",


    skeletonMove:
        "assets/images/spritesheets/enemies/enemy_animations/enemies-skeleton1_movement.png",


    /*
        Claimrun Pip.

        This is now an actual weapon-bearing
        character from the asset dump rather
        than the normal Pawn magically firing
        arrows from its forehead.
    */

    claimArcherIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Archer/Archer_Idle.png",

    claimArcherShoot:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Archer/Archer_Shoot.png",

    claimArrow:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Archer/Arrow.png",


    /*
        Tiny Swords UI art.
    */

    uiSword:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_05.png",

    uiValor:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_06.png",

    uiTown:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_07.png",

    uiBuild:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_01.png",

    uiCrossed:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_09.png",

    uiSettings:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_10.png",

    uiInfo:
        "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_11.png",


    uiRoundBlue:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/SmallBlueRoundButton_Regular.png",

    uiRoundBluePressed:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/SmallBlueRoundButton_Pressed.png",

    uiRoundRed:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/SmallRedRoundButton_Regular.png",

    uiRoundRedPressed:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/SmallRedRoundButton_Pressed.png",

    uiTinyRoundBlue:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/TinyRoundBlueButton.png",

    uiTinyRoundRed:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/TinyRoundRedButton.png",

    uiTinySquareBlue:
        "assets/images/ui/tiny_swords/UI Elements/Buttons/TinySquareBlueButton.png",


    crankClick:
        "assets/audio/sfx/other/finger_click.wav",

    glimmerCollect:
        "assets/audio/sfx/items/gem_collect.wav",

    arrowShot:
        "assets/audio/sfx/other/whoosh_1.wav",

    fenceHit:
        "assets/audio/sfx/materials/wood_small_hollow.wav",

    enemyHit:
        "assets/audio/sfx/retro/hurt.wav",

    powerUp:
        "assets/audio/sfx/retro/power_up.wav",

    powerDown:
        "assets/audio/sfx/retro/power_down.wav",

    confirm:
        "assets/audio/sfx/ui/synth_confirmation.wav"

};



class GameScene extends Phaser.Scene {

    constructor() {

        super("GameScene");

    }


    preload() {

        this.load.image(
            "crankhouse",
            ASSETS.crankhouse
        );

        this.load.image(
            "glimmer",
            ASSETS.glimmer
        );

        this.load.image(
            "oakTree",
            ASSETS.oakTree
        );

        this.load.image(
            "oakClump",
            ASSETS.oakClump
        );

        this.load.image(
            "rock1",
            ASSETS.rock1
        );

        this.load.image(
            "rock2",
            ASSETS.rock2
        );

        this.load.image(
            "rock3",
            ASSETS.rock3
        );

        this.load.image(
            "rock4",
            ASSETS.rock4
        );

        this.load.image(
            "duck",
            ASSETS.duck
        );

        this.load.image(
            "chest",
            ASSETS.chest
        );

        this.load.image(
            "claimArrow",
            ASSETS.claimArrow
        );


        this.load.image(
            "uiSword",
            ASSETS.uiSword
        );

        this.load.image(
            "uiValor",
            ASSETS.uiValor
        );

        this.load.image(
            "uiTown",
            ASSETS.uiTown
        );

        this.load.image(
            "uiBuild",
            ASSETS.uiBuild
        );

        this.load.image(
            "uiCrossed",
            ASSETS.uiCrossed
        );

        this.load.image(
            "uiSettings",
            ASSETS.uiSettings
        );

        this.load.image(
            "uiInfo",
            ASSETS.uiInfo
        );

        this.load.image(
            "uiRoundBlue",
            ASSETS.uiRoundBlue
        );

        this.load.image(
            "uiRoundBluePressed",
            ASSETS.uiRoundBluePressed
        );

        this.load.image(
            "uiRoundRed",
            ASSETS.uiRoundRed
        );

        this.load.image(
            "uiRoundRedPressed",
            ASSETS.uiRoundRedPressed
        );

        this.load.image(
            "uiTinyRoundBlue",
            ASSETS.uiTinyRoundBlue
        );

        this.load.image(
            "uiTinyRoundRed",
            ASSETS.uiTinyRoundRed
        );

        this.load.image(
            "uiTinySquareBlue",
            ASSETS.uiTinySquareBlue
        );


        this.load.spritesheet(
            "fieldTrees",
            ASSETS.treeStrip,
            {
                frameWidth: 256,
                frameHeight: 256
            }
        );

        this.load.spritesheet(
            "fieldBushes",
            ASSETS.bushStrip,
            {
                frameWidth: 128,
                frameHeight: 128
            }
        );

        /*
            This file is a 4×4 tile atlas,
            not one 64×64 fence sprite.
        */

        this.load.spritesheet(
            "fenceTiles",
            ASSETS.fenceTiles,
            {
                frameWidth: 16,
                frameHeight: 16
            }
        );

        this.load.spritesheet(
            "pipIdle",
            ASSETS.pipIdle,
            {
                frameWidth: 192,
                frameHeight: 192
            }
        );

        this.load.spritesheet(
            "pipRun",
            ASSETS.pipRun,
            {
                frameWidth: 192,
                frameHeight: 192
            }
        );

        this.load.spritesheet(
            "skeletonMove",
            ASSETS.skeletonMove,
            {
                frameWidth: 32,
                frameHeight: 32
            }
        );

        this.load.spritesheet(
            "claimArcherIdle",
            ASSETS.claimArcherIdle,
            {
                frameWidth: 192,
                frameHeight: 192
            }
        );

        this.load.spritesheet(
            "claimArcherShoot",
            ASSETS.claimArcherShoot,
            {
                frameWidth: 192,
                frameHeight: 192
            }
        );


        this.load.audio(
            "crankClick",
            ASSETS.crankClick
        );

        this.load.audio(
            "glimmerCollect",
            ASSETS.glimmerCollect
        );

        this.load.audio(
            "arrowShot",
            ASSETS.arrowShot
        );

        this.load.audio(
            "fenceHit",
            ASSETS.fenceHit
        );

        this.load.audio(
            "enemyHit",
            ASSETS.enemyHit
        );

        this.load.audio(
            "powerUp",
            ASSETS.powerUp
        );

        this.load.audio(
            "powerDown",
            ASSETS.powerDown
        );

        this.load.audio(
            "confirm",
            ASSETS.confirm
        );

    }

    setNullmeadowZoom(value) {

        const zoom =
            Phaser.Math.Clamp(
                value,
                this.nullmeadowMinZoom,
                this.nullmeadowMaxZoom
            );

        this.nullmeadowZoom = zoom;

        this.cameras.main.setZoom(
            zoom
        );

        this.syncHudToCameraZoom();

    }


    syncHudToCameraZoom() {

        if (!this.hudRoot) {
            return;
        }

        const zoom =
            this.cameras.main.zoom;

        /*
            Phaser camera zoom also zooms objects with
            scrollFactor(0).

            Counter-scale the entire HUD so its apparent
            screen size remains exactly 1:1.

            The position compensation accounts for camera
            zoom occurring around the screen centre.
        */

        const inverseZoom =
            1 / zoom;

        this.hudRoot.setScale(
            inverseZoom
        );

        this.hudRoot.setPosition(

            GAME_WIDTH / 2 *
            (
                1 -
                inverseZoom
            ),

            GAME_HEIGHT / 2 *
            (
                1 -
                inverseZoom
            )

        );

    }


    getActiveTouchPointers() {

        return this.input.manager.pointers
            .filter(
                pointer =>
                    pointer.isDown
            );

    }


    beginPinchIfNeeded() {

        const pointers =
            this.getActiveTouchPointers();

        if (
            pointers.length < 2
        ) {
            return false;
        }

        const a = pointers[0];
        const b = pointers[1];

        const distance =
            Phaser.Math.Distance.Between(
                a.x,
                a.y,
                b.x,
                b.y
            );

        if (
            this.pinchStartDistance === null
        ) {

            this.pinchStartDistance =
                Math.max(
                    1,
                    distance
                );

            this.pinchStartZoom =
                this.cameras.main.zoom;

            /*
                If the first finger previously issued
                a walking command, cancel it as soon as
                this becomes a pinch gesture.
            */

            this.moveTarget = null;

            if (this.targetMarker) {
                this.targetMarker.setVisible(
                    false
                );
            }

        }

        return true;

    }


    updatePinchZoom() {

        const pointers =
            this.getActiveTouchPointers();

        if (
            pointers.length < 2
        ) {

            this.pinchStartDistance = null;
            this.pinchStartZoom = null;

            return false;
        }

        const a = pointers[0];
        const b = pointers[1];

        const distance =
            Phaser.Math.Distance.Between(
                a.x,
                a.y,
                b.x,
                b.y
            );

        if (
            this.pinchStartDistance === null
        ) {

            this.beginPinchIfNeeded();

            return true;
        }

        const ratio =
            distance /
            this.pinchStartDistance;

        this.setNullmeadowZoom(
            this.pinchStartZoom *
            ratio
        );

        return true;

    }


    create() {

        /*
            A Claimrun loss pauses Arcade Physics.

            Phaser can keep the world's paused
            state across scene restarts, so always
            force it back on when entering the hub.
        */

        this.physics.resume();


        this.worldCenter =
            new Phaser.Math.Vector2(
                WORLD_SIZE / 2,
                WORLD_SIZE / 2
            );


        this.saveData =
            this.registry.get("saveData") ||
            loadSave();


        if (
            !Array.isArray(
                this.saveData.openedClaimruns
            )
        ) {

            this.saveData.openedClaimruns = [];

        }


        if (
            !Array.isArray(
                this.saveData.unlockedLots
            )
        ) {

            this.saveData.unlockedLots = [];

        }


        this.registry.set(
            "saveData",
            this.saveData
        );


        this.glimmerOwned =
            this.saveData.glimmer || 0;

        this.glimmerLoose = [];

        this.moveTarget = null;

        this.claimrunLaunching = false;

        /*
        ============================================================
        NULLMEADOW CAMERA ZOOM
        ============================================================

        World camera zoom:
        - Mouse wheel on desktop
        - Two-finger pinch on touchscreen
        - HUD compensates for camera zoom so it remains pixel-perfect
        */

        this.nullmeadowMinZoom = 0.70;
        this.nullmeadowMaxZoom = 1.65;
        this.nullmeadowZoom = 1.0;

        this.pinchStartDistance = null;
        this.pinchStartZoom = null;

        this.cameras.main.setZoom(
            this.nullmeadowZoom
        );


        this.physics.world.setBounds(
            0,
            0,
            WORLD_SIZE,
            WORLD_SIZE
        );

        this.cameras.main.setBounds(
            0,
            0,
            WORLD_SIZE,
            WORLD_SIZE
        );

        this.cameras.main.setBackgroundColor(
            "#718955"
        );


        this.createGround();

        this.createGhostlots();

        this.createScenery();

        this.createCrankhouse();

        this.createPip();

        this.createAnimations();

        this.createActiveGhostlotPrompt();

        this.createInput();

        this.createHUD();


        this.cameras.main.startFollow(
            this.player,
            true,
            0.11,
            0.11
        );

        this.cameras.main.setDeadzone(
            120,
            200
        );

        this.cameras.main.fadeIn(
            240,
            12,
            18,
            26
        );

    }


    createGround() {

        const g =
            this.add.graphics()
                .setDepth(-1000);

        const tile = 128;


        for (
            let y = 0;
            y < WORLD_SIZE;
            y += tile
        ) {

            for (
                let x = 0;
                x < WORLD_SIZE;
                x += tile
            ) {

                const odd =
                    (
                        (x / tile) +
                        (y / tile)
                    ) % 2;


                g.fillStyle(
                    odd
                        ? 0x78915a
                        : 0x718955,
                    1
                );

                g.fillRect(
                    x,
                    y,
                    tile,
                    tile
                );

            }

        }


        g.lineStyle(
            2,
            0x344934,
            0.07
        );


        for (
            let p = 0;
            p <= WORLD_SIZE;
            p += tile
        ) {

            g.lineBetween(
                p,
                0,
                p,
                WORLD_SIZE
            );

            g.lineBetween(
                0,
                p,
                WORLD_SIZE,
                p
            );

        }


        g.fillStyle(
            0xb8aa76,
            0.18
        );

        g.fillCircle(
            this.worldCenter.x,
            this.worldCenter.y,
            285
        );


        g.lineStyle(
            7,
            0xd5c28c,
            0.10
        );

        g.strokeCircle(
            this.worldCenter.x,
            this.worldCenter.y,
            285
        );


        const rng =
            this.makeRng(
                0x4e554c4c
            );


        for (
            let i = 0;
            i < 300;
            i++
        ) {

            const x =
                50 +
                rng() *
                (WORLD_SIZE - 100);

            const y =
                50 +
                rng() *
                (WORLD_SIZE - 100);

            const r =
                2 +
                rng() * 4;


            g.fillStyle(
                rng() > 0.45
                    ? 0x4e6e43
                    : 0xc0b179,
                0.26
            );

            g.fillCircle(
                x,
                y,
                r
            );

        }

    }


    createGhostlots() {

        this.ghostlots = [];

        const rng =
            this.makeRng(
                0x47484f53
            );

        const placed = [];


        for (
            let i = 0;
            i < 11;
            i++
        ) {

            let candidate = null;


            for (
                let attempt = 0;
                attempt < 400;
                attempt++
            ) {

                const angle =
                    rng() *
                    Math.PI *
                    2;

                const radius =
                    315 +
                    rng() *
                    355;

                const size =
                    150 +
                    Math.floor(
                        rng() * 65
                    );


                const x =
                    Phaser.Math.Clamp(
                        this.worldCenter.x +
                        Math.cos(angle) *
                        radius,

                        160,

                        WORLD_SIZE - 160
                    );


                const y =
                    Phaser.Math.Clamp(
                        this.worldCenter.y +
                        Math.sin(angle) *
                        radius,

                        160,

                        WORLD_SIZE - 160
                    );


                const rect =
                    new Phaser.Geom.Rectangle(
                        x - size / 2,
                        y - size / 2,
                        size,
                        size
                    );


                const padded =
                    new Phaser.Geom.Rectangle(
                        rect.x - 42,
                        rect.y - 42,
                        rect.width + 84,
                        rect.height + 84
                    );


                const tooClose =
                    placed.some(
                        other =>
                            Phaser.Geom
                                .Intersects
                                .RectangleToRectangle(
                                    padded,
                                    other
                                )
                    );


                if (!tooClose) {

                    candidate = {
                        x,
                        y,
                        size,
                        rect,
                        padded
                    };

                    break;

                }

            }


            if (!candidate) {
                continue;
            }


            placed.push(
                candidate.padded
            );


            const id =
                `Ghostlot ${
                    String(i + 1)
                        .padStart(
                            2,
                            "0"
                        )
                }`;


            const unlocked =
                this.saveData
                    .unlockedLots
                    .includes(id);


            this.ghostlots.push({
                id,
                ...candidate,
                unlocked
            });

        }


        const locked =
            this.ghostlots
                .filter(
                    lot =>
                        !lot.unlocked
                )
                .sort(
                    (a, b) =>
                        Phaser.Math
                            .Distance
                            .Between(
                                a.x,
                                a.y,
                                this.worldCenter.x,
                                this.worldCenter.y
                            )
                        -
                        Phaser.Math
                            .Distance
                            .Between(
                                b.x,
                                b.y,
                                this.worldCenter.x,
                                this.worldCenter.y
                            )
                );


        this.activeGhostlot =
            locked[0] || null;


        for (
            const lot
            of this.ghostlots
        ) {

            lot.graphics =
                this.drawGhostlot(
                    lot,
                    lot ===
                    this.activeGhostlot
                );

        }


        if (this.activeGhostlot) {

            this.createAttentionBeacon(
                this.activeGhostlot
            );

        }

    }


    drawGhostlot(
        lot,
        active
    ) {

        const {
            x,
            y,
            size,
            id,
            unlocked
        } = lot;


        const g =
            this.add.graphics()
                .setDepth(-100);

        const half =
            size / 2;


        g.fillStyle(
            unlocked
                ? 0x9bd57b
                : active
                    ? 0x7e681e
                    : 0x18222a,

            unlocked
                ? 0.10
                : active
                    ? 0.13
                    : 0.08
        );


        g.fillRoundedRect(
            x - half,
            y - half,
            size,
            size,
            18
        );


        g.lineStyle(
            unlocked
                ? 5
                : active
                    ? 6
                    : 4,

            unlocked
                ? 0xbff59b
                : active
                    ? 0xffdf68
                    : 0xe9e2bd,

            unlocked
                ? 0.55
                : active
                    ? 0.70
                    : 0.26
        );


        g.strokeRoundedRect(
            x - half,
            y - half,
            size,
            size,
            18
        );


        if (unlocked) {

            g.lineStyle(
                8,
                0xeaffd7,
                0.72
            );


            g.lineBetween(
                x - 30,
                y + 2,
                x - 6,
                y + 26
            );


            g.lineBetween(
                x - 6,
                y + 26,
                x + 38,
                y - 28
            );

        } else {

            const lockY =
                y - 4;


            g.lineStyle(
                6,

                active
                    ? 0xffe981
                    : 0xe7d79d,

                active
                    ? 0.80
                    : 0.46
            );


            g.strokeCircle(
                x,
                lockY - 17,
                17
            );


            g.fillStyle(
                active
                    ? 0x756125
                    : 0x5b573f,

                0.78
            );


            g.fillRoundedRect(
                x - 27,
                lockY - 10,
                54,
                46,
                8
            );


            g.fillStyle(
                0xf2d477,
                active
                    ? 0.88
                    : 0.55
            );


            g.fillCircle(
                x,
                lockY + 8,
                5
            );


            g.fillRect(
                x - 3,
                lockY + 8,
                6,
                13
            );

        }


        const suffix =
            unlocked
                ? " • CLAIMED"
                : active
                    ? " • CALLING"
                    : "";


        this.add.text(
            x,
            y + half + 14,

            `${
                id.toUpperCase()
            }${suffix}`,

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "14px",

                fontStyle:
                    "bold",

                color:
                    unlocked
                        ? "#d8ffc0"
                        : active
                            ? "#fff0a2"
                            : "#e8e1c3",

                stroke:
                    "#203021",

                strokeThickness:
                    4
            }
        )
        .setOrigin(
            0.5,
            0
        )
        .setDepth(-90)
        .setAlpha(
            unlocked ||
            active
                ? 0.95
                : 0.58
        );


        return g;

    }


    createAttentionBeacon(lot) {

        const ring =
            this.add.circle(
                lot.x,
                lot.y,
                lot.size * 0.62,
                0xffdc55,
                0.025
            )
            .setStrokeStyle(
                5,
                0xffe36f,
                0.52
            )
            .setDepth(-80);


        this.tweens.add({

            targets: ring,

            scaleX: 1.12,

            scaleY: 1.12,

            alpha: 0.12,

            duration: 820,

            yoyo: true,

            repeat: -1,

            ease:
                "Sine.InOut"

        });


        const call =
            this.add.text(
                lot.x,
                lot.y -
                lot.size / 2 -
                54,

                "CALLING",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "17px",

                    color:
                        "#382d15",

                    backgroundColor:
                        "#ffdf68",

                    padding: {
                        x: 11,
                        y: 5
                    }
                }
            )
            .setOrigin(0.5)
            .setDepth(
                lot.y + 80
            );


        this.tweens.add({

            targets: call,

            y:
                call.y - 7,

            duration: 700,

            yoyo: true,

            repeat: -1,

            ease:
                "Sine.InOut"

        });

    }


    createScenery() {

        const rng =
            this.makeRng(
                0x46524545
            );

        let placed = 0;

        let attempts = 0;


        while (
            placed < 155 &&
            attempts < 2600
        ) {

            attempts++;


            /*
                Extra edge padding prevents large
                scenery art being spawned with its
                centre directly against a world edge.
            */

            const x =
                120 +
                rng() *
                (WORLD_SIZE - 240);

            const y =
                120 +
                rng() *
                (WORLD_SIZE - 240);


            const centerDistance =
                Phaser.Math
                    .Distance
                    .Between(
                        x,
                        y,
                        this.worldCenter.x,
                        this.worldCenter.y
                    );


            if (
                centerDistance < 230
            ) {
                continue;
            }


            const blockedByLot =
                this.ghostlots.some(
                    lot => {

                        const pad = 42;

                        return (
                            x >
                            lot.rect.x - pad
                            &&
                            x <
                            lot.rect.right + pad
                            &&
                            y >
                            lot.rect.y - pad
                            &&
                            y <
                            lot.rect.bottom + pad
                        );

                    }
                );


            if (blockedByLot) {
                continue;
            }


            const pick =
                rng();

            let obj;


            if (pick < 0.24) {

                /*
                    Tree1 is slightly evil.

                    Frames 1/2/4/5 contain
                    neighbouring tree slices.

                    Only 0 and 3 are clean.
                */

                obj =
                    this.add.sprite(
                        x,
                        y,
                        "fieldTrees",

                        rng() < 0.5
                            ? 0
                            : 3
                    )
                    .setScale(
                        0.34 +
                        rng() * 0.08
                    );

            } else if (
                pick < 0.43
            ) {

                obj =
                    this.add.image(
                        x,
                        y,
                        "oakTree"
                    )
                    .setScale(
                        1.05 +
                        rng() * 0.42
                    );

            } else if (
                pick < 0.54
            ) {

                obj =
                    this.add.image(
                        x,
                        y,
                        "oakClump"
                    )
                    .setScale(
                        0.95 +
                        rng() * 0.34
                    );

            } else if (
                pick < 0.72
            ) {

                obj =
                    this.add.sprite(
                        x,
                        y,
                        "fieldBushes",

                        Math.floor(
                            rng() * 8
                        )
                    )
                    .setScale(
                        0.42 +
                        rng() * 0.16
                    );

            } else if (
                pick < 0.94
            ) {

                const rocks = [
                    "rock1",
                    "rock2",
                    "rock3",
                    "rock4"
                ];


                obj =
                    this.add.image(
                        x,
                        y,

                        rocks[
                            Math.floor(
                                rng() *
                                rocks.length
                            )
                        ]
                    )
                    .setScale(
                        0.62 +
                        rng() * 0.38
                    );

            } else if (
                pick < 0.975
            ) {

                obj =
                    this.add.image(
                        x,
                        y,
                        "duck"
                    )
                    .setScale(
                        0.56 +
                        rng() * 0.12
                    );

            } else {

                obj =
                    this.add.image(
                        x,
                        y,
                        "chest"
                    )
                    .setScale(
                        2.0 +
                        rng() * 0.35
                    );

            }


            obj
                .setDepth(
                    y - 120
                )
                .setAlpha(
                    0.92 +
                    rng() * 0.08
                );


            if (
                rng() < 0.17
            ) {

                obj.setFlipX(true);

            }


            placed++;

        }


        /*
            Correctly construct little fence runs
            from individual 16×16 atlas cells.
        */

        for (
            let i = 0;
            i < 14;
            i++
        ) {

            if (
                rng() > 0.62
            ) {
                continue;
            }


            const angle =
                rng() *
                Math.PI *
                2;

            const radius =
                520 +
                rng() *
                320;


            const x =
                Phaser.Math.Clamp(
                    this.worldCenter.x +
                    Math.cos(angle) *
                    radius,

                    150,

                    WORLD_SIZE - 150
                );


            const y =
                Phaser.Math.Clamp(
                    this.worldCenter.y +
                    Math.sin(angle) *
                    radius,

                    150,

                    WORLD_SIZE - 150
                );


            if (
                this.ghostlots.some(
                    lot =>
                        Phaser.Math
                            .Distance
                            .Between(
                                x,
                                y,
                                lot.x,
                                lot.y
                            )
                        <
                        lot.size * 0.9
                )
            ) {
                continue;
            }


            const length =
                2 +
                Math.floor(
                    rng() * 4
                );

            const horizontal =
                rng() > 0.5;


            for (
                let j = 0;
                j < length;
                j++
            ) {

                const fx =
                    x +
                    (
                        horizontal
                            ? j * 29
                            : 0
                    );

                const fy =
                    y +
                    (
                        horizontal
                            ? 0
                            : j * 29
                    );


                const frame =
                    horizontal
                        ? 2
                        : 4;


                this.add.sprite(
                    fx,
                    fy,
                    "fenceTiles",
                    frame
                )
                .setScale(1.8)
                .setDepth(
                    fy - 40
                )
                .setAlpha(0.88);

            }

        }

    }


    createCrankhouse() {

        const x =
            this.worldCenter.x;

        const y =
            this.worldCenter.y;


        this.add.ellipse(
            x,
            y + 79,
            150,
            62,
            0x1b211c,
            0.24
        )
        .setDepth(
            y - 2
        );


        this.crankhouse =
            this.add.image(
                x,
                y,
                "crankhouse"
            )
            .setScale(1.08)
            .setDepth(y)
            .setInteractive({
                useHandCursor: true
            });


        this.crankhouseLabel =
            this.add.text(
                x,
                y - 140,

                "THE CRANKHOUSE",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "25px",

                    color:
                        "#fff1aa",

                    stroke:
                        "#1f2823",

                    strokeThickness:
                        6
                }
            )
            .setOrigin(0.5)
            .setDepth(y + 3);


        this.crankhouseHint =
            this.add.text(
                x,
                y + 122,

                "TAP TO CRANK",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "14px",

                    fontStyle:
                        "bold",

                    color:
                        "#ffffff",

                    stroke:
                        "#1f2823",

                    strokeThickness:
                        4
                }
            )
            .setOrigin(0.5)
            .setDepth(y + 3)
            .setAlpha(0.78);


        this.crankhouse.on(
            "pointerover",
            () => {

                this.tweens.add({
                    targets:
                        this.crankhouse,

                    scaleX: 1.13,

                    scaleY: 1.13,

                    duration: 80
                });

            }
        );


        this.crankhouse.on(
            "pointerout",
            () => {

                this.tweens.add({
                    targets:
                        this.crankhouse,

                    scaleX: 1.08,

                    scaleY: 1.08,

                    duration: 80
                });

            }
        );


        this.crankhouse.on(
            "pointerdown",
            () =>
                this.generateGlimmer()
        );

    }


    createPip() {

        this.player =
            this.physics.add.sprite(
                this.worldCenter.x,
                this.worldCenter.y + 275,
                "pipIdle",
                0
            );


        this.player.setScale(
            0.62
        );

        this.player.setCollideWorldBounds(
            true
        );

        this.player.setDepth(
            this.player.y + 10
        );


        this.player.body.setCircle(
            48,
            48,
            70
        );

        this.player.body.setMaxSpeed(
            330
        );

        this.player.body.setDrag(
            1450,
            1450
        );


        this.playerName =
            this.add.text(
                this.player.x,
                this.player.y - 94,

                "PIP",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "18px",

                    color:
                        "#ffffff",

                    stroke:
                        "#20251f",

                    strokeThickness:
                        5
                }
            )
            .setOrigin(0.5)
            .setDepth(
                this.player.depth + 20
            );


        this.targetMarker =
            this.add.graphics()
                .setDepth(9000)
                .setVisible(false);

    }


    createAnimations() {

        if (
            !this.anims.exists(
                "pip-idle"
            )
        ) {

            this.anims.create({

                key:
                    "pip-idle",

                frames:
                    this.anims
                        .generateFrameNumbers(
                            "pipIdle",
                            {
                                start: 0,
                                end: 7
                            }
                        ),

                frameRate: 8,

                repeat: -1

            });

        }


        if (
            !this.anims.exists(
                "pip-run"
            )
        ) {

            this.anims.create({

                key:
                    "pip-run",

                frames:
                    this.anims
                        .generateFrameNumbers(
                            "pipRun",
                            {
                                start: 0,
                                end: 5
                            }
                        ),

                frameRate: 12,

                repeat: -1

            });

        }


        if (
            !this.anims.exists(
                "skeleton-move"
            )
        ) {

            this.anims.create({

                key:
                    "skeleton-move",

                frames:
                    this.anims
                        .generateFrameNumbers(
                            "skeletonMove",
                            {
                                start: 0,
                                end: 9
                            }
                        ),

                frameRate: 10,

                repeat: -1

            });

        }


        this.player.play(
            "pip-idle"
        );

    }


    createActiveGhostlotPrompt() {

        this.ghostlotPrompt = null;

        this.challengeButton = null;

        this.claimCostText = null;

        this.claimStatusText = null;

        this.claimCostIcon = null;


        if (!this.activeGhostlot) {
            return;
        }


        const lot =
            this.activeGhostlot;


        const container =
            this.add.container(
                lot.x,

                lot.y -
                lot.size / 2 -
                110
            )
            .setDepth(50000)
            .setVisible(false);


        const bubble =
            this.add.graphics();


        bubble.fillStyle(
            THEME.ink,
            0.97
        );


        bubble.fillRoundedRect(
            -156,
            -52,
            312,
            104,
            22
        );


        bubble.lineStyle(
            3,
            THEME.gold,
            0.82
        );


        bubble.strokeRoundedRect(
            -156,
            -52,
            312,
            104,
            22
        );


        bubble.fillStyle(
            THEME.ink,
            0.97
        );


        bubble.fillTriangle(
            -13,
            52,

            13,
            52,

            0,
            70
        );


        const label =
            this.add.text(
                -136,
                -37,

                "CLAIMRUN",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "18px",

                    color:
                        "#fff3b0"
                }
            );


        this.claimStatusText =
            this.add.text(
                -136,
                -9,
                "",

                {
                    fontFamily:
                        FONT_BODY,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#c8d0cc"
                }
            );


        this.claimCostIcon =
            this.add.image(
                -120,
                27,
                "glimmer"
            )
            .setScale(0.34);

        this.claimCostText =
            this.add.text(
                -96,
                28,
                "",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "19px",

                    color:
                        "#ffe170"
                }
            )
            .setOrigin(
                0,
                0.5
            );


        /*
            Real supplied UI button.

            No more handmade triangle.
        */

        const button =
            this.add.image(
                108,
                2,
                "uiRoundBlue"
            )
            .setScale(0.66)
            .setInteractive({
                useHandCursor: true
            });


        button.__blocksWorldInput =
            true;


        const buttonIcon =
            this.add.image(
                108,
                2,
                "uiSword"
            )
            .setScale(0.54);


        buttonIcon.setAlpha(
            0.96
        );


        container.add([
            bubble,
            label,
            this.claimStatusText,
            this.claimCostIcon,
            this.claimCostText,
            button,
            buttonIcon
        ]);


        button.on(
            "pointerover",
            () => {

                this.tweens.add({
                    targets: button,
                    scaleX: 0.70,
                    scaleY: 0.70,
                    duration: 65
                });

                this.tweens.add({
                    targets: buttonIcon,
                    scaleX: 0.58,
                    scaleY: 0.58,
                    duration: 65
                });

            }
        );


        button.on(
            "pointerout",
            () => {

                this.tweens.add({
                    targets: button,
                    scaleX: 0.66,
                    scaleY: 0.66,
                    duration: 65
                });

                this.tweens.add({
                    targets: buttonIcon,
                    scaleX: 0.54,
                    scaleY: 0.54,
                    duration: 65
                });

            }
        );


        button.on(
            "pointerdown",

            (
                pointer,
                localX,
                localY,
                event
            ) => {

                if (
                    event &&
                    event.stopPropagation
                ) {
                    event.stopPropagation();
                }


                button.setTexture(
                    button.__canLaunch === false
                        ? "uiRoundRedPressed"
                        : "uiRoundBluePressed"
                );


                this.beginClaimrun();

            }
        );


        button.on(
            "pointerup",
            () =>
                this.refreshGhostlotPrompt()
        );


        this.ghostlotPrompt =
            container;

        this.challengeButton =
            button;

        this.challengeButtonIcon =
            buttonIcon;


        this.refreshGhostlotPrompt();

    }


    refreshGhostlotPrompt() {

        if (
            !this.activeGhostlot ||
            !this.ghostlotPrompt
        ) {
            return;
        }


        const lotId =
            this.activeGhostlot.id;


        const opened =
            this.saveData
                .openedClaimruns
                .includes(lotId);


        const cost =
            claimCostForProgress(
                this.saveData
                    .unlockedLots
                    .length
            );


        const canAfford =
            this.glimmerOwned >= cost;


        if (opened) {

            this.claimStatusText
                .setText(
                    "ENTRY PAID • RETRIES FREE"
                )
                .setColor(
                    "#a8f0b8"
                );


            this.claimCostText
                .setText(
                    "ENTER"
                )
                .setColor(
                    "#a8f0b8"
                );


            this.claimCostIcon
                .setTexture(
                    "uiSword"
                )
                .setScale(
                    0.36
                );


            this.challengeButton
                .setTexture(
                    "uiRoundBlue"
                )
                .setAlpha(1);


            this.challengeButton
                .__canLaunch =
                    true;

        } else {

            this.claimStatusText
                .setText(
                    canAfford
                        ? "PAY ONCE • FIGHT FOR THE LOT"
                        : "MORE GLIMMER REQUIRED"
                );


            this.claimStatusText
                .setColor(
                    canAfford
                        ? "#c8d0cc"
                        : "#ffadb4"
                );


            this.claimCostText
                .setText(
                    String(cost)
                )
                .setColor(
                    canAfford
                        ? "#ffe170"
                        : "#ffadb4"
                );


            this.claimCostIcon
                .setTexture(
                    "glimmer"
                )
                .setScale(
                    0.34
                );


            this.challengeButton
                .setTexture(
                    canAfford
                        ? "uiRoundBlue"
                        : "uiRoundRed"
                )
                .setAlpha(
                    canAfford
                        ? 1
                        : 0.82
                );


            this.challengeButton
                .__canLaunch =
                    canAfford;

        }

    }


    createInput() {

        this.cursors =
            this.input.keyboard
                .createCursorKeys();


        this.keys =
            this.input.keyboard
                .addKeys({

                    up:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .W,

                    left:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .A,

                    down:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .S,

                    right:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .D

                });


        /*
        ============================================================
        DESKTOP ZOOM
        ============================================================

        Wheel up   -> zoom in
        Wheel down -> zoom out

        Exponential scaling behaves better with both
        mouse wheels and laptop trackpads.
        */

        this.input.on(
            "wheel",

            (
                pointer,
                currentlyOver,
                deltaX,
                deltaY
            ) => {

                /*
                    UI interaction shouldn't accidentally
                    zoom the world behind it.
                */

                if (
                    currentlyOver &&
                    currentlyOver.some(
                        obj =>
                            obj &&
                            obj.__blocksWorldInput
                    )
                ) {
                    return;
                }


                const zoomFactor =
                    Math.exp(
                        -deltaY *
                        0.00125
                    );


                this.setNullmeadowZoom(

                    this.cameras.main.zoom *
                    zoomFactor

                );

            }
        );


        /*
        ============================================================
        TOUCH / MOUSE WORLD INPUT
        ============================================================
        */

        this.input.on(
            "pointerdown",

            (
                pointer,
                currentlyOver
            ) => {

                /*
                    If there are now two fingers down,
                    this gesture belongs to zooming,
                    not walking.
                */

                if (
                    this.beginPinchIfNeeded()
                ) {
                    return;
                }


                if (
                    currentlyOver &&
                    currentlyOver.some(
                        obj =>
                            obj &&
                            obj.__blocksWorldInput
                    )
                ) {
                    return;
                }


                if (
                    currentlyOver &&
                    currentlyOver.includes(
                        this.crankhouse
                    )
                ) {
                    return;
                }


                if (
                    pointer.y < 112 ||
                    pointer.y >
                        GAME_HEIGHT - 78
                ) {
                    return;
                }


                const world =
                    pointer.positionToCamera(
                        this.cameras.main
                    );


                this.moveTarget =
                    new Phaser.Math.Vector2(

                        Phaser.Math.Clamp(
                            world.x,
                            40,
                            WORLD_SIZE - 40
                        ),

                        Phaser.Math.Clamp(
                            world.y,
                            40,
                            WORLD_SIZE - 40
                        )

                    );


                this.drawTargetMarker(
                    this.moveTarget.x,
                    this.moveTarget.y
                );

            }
        );


        /*
        ============================================================
        PINCH ZOOM
        ============================================================
        */

        this.input.on(
            "pointermove",
            () => {

                this.updatePinchZoom();

            }
        );


        this.input.on(
            "pointerup",
            () => {

                const pointers =
                    this.getActiveTouchPointers();


                if (
                    pointers.length < 2
                ) {

                    this.pinchStartDistance =
                        null;

                    this.pinchStartZoom =
                        null;

                }

            }
        );


        this.input.on(
            "pointerupoutside",
            () => {

                this.pinchStartDistance =
                    null;

                this.pinchStartZoom =
                    null;

            }
        );

    }


    createHUD() {

        /*
            The HUD is still intentionally
            "mobile game dense", but every
            part now sits on a consistent
            grid and interactive controls
            use supplied UI artwork.
        */

        this.hudRoot =
            this.add.container(
                0,
                0
            )
            .setDepth(100000)
            .setScrollFactor(0);


        /*
        ============================================================
        TOP BAR
        ============================================================
        */

        const top =
            this.add.graphics();


        top.fillStyle(
            THEME.ink,
            0.95
        );


        top.fillRoundedRect(
            18,
            12,
            684,
            82,
            20
        );


        top.lineStyle(
            2,
            0xffffff,
            0.10
        );


        top.strokeRoundedRect(
            18,
            12,
            684,
            82,
            20
        );


        top.lineStyle(
            3,
            THEME.gold,
            0.32
        );


        top.lineBetween(
            30,
            94,
            690,
            94
        );


        this.hudRoot.add(top);


        this.hudRoot.add(

            this.add.text(
                34,
                25,

                "NULLMEADOW",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "20px",

                    color:
                        "#e9f2cc"
                }
            )

        );


        this.hudRoot.add(

            this.add.text(
                35,
                53,

                "HUB 001",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "11px",

                    fontStyle:
                        "bold",

                    color:
                        "#77889b"
                }
            )

        );


        /*
        ============================================================
        WALLET
        ============================================================
        */

        this.glimmerHud =
            this.createCurrencyChip(
                211,
                53,
                "glimmer",
                0.46,

                "Glimmer",

                "Crankhouse output. Pays one-time entry fees for Calling Lot games."
            );


        this.valorHud =
            this.createCurrencyChip(
                345,
                53,
                "uiValor",
                0.44,

                "Valor",

                "Awarded for conquering Ghostlot games. Its larger purpose is still unknown."
            );


        this.createFutureCurrencySocket(
            444,
            53,

            "Future currency",

            "Reserved for another economy layer."
        );

        this.createFutureCurrencySocket(
            494,
            53,

            "Future currency",

            "Another slot, because this game will absolutely need it."
        );


        /*
        ============================================================
        APP RAIL
        ============================================================
        */

        const rail =
            this.add.graphics();


        rail.fillStyle(
            THEME.ink,
            0.86
        );


        rail.fillRoundedRect(
            651,
            116,
            55,
            292,
            18
        );


        rail.lineStyle(
            2,
            0xffffff,
            0.08
        );


        rail.strokeRoundedRect(
            651,
            116,
            55,
            292,
            18
        );


        this.hudRoot.add(
            rail
        );


        this.createHudIconButton(
            678,
            151,
            "uiTown",

            "Nullmeadow",

            "The settlement hub.",

            false
        );


        this.createHudIconButton(
            678,
            210,
            "uiCrossed",

            "Game Cabinet",

            "Embedded games collect here. Claimrun is Game #001.",

            false
        );


        this.createHudIconButton(
            678,
            269,
            "uiBuild",

            "Build",

            "Claimed Ghostlots will eventually construct things here.",

            true
        );


        this.createHudIconButton(
            678,
            328,
            "uiInfo",

            "Codex",

            "Future home of discoveries, names and system explanations.",

            true
        );


        this.createHudIconButton(
            678,
            387,
            "uiSettings",

            "Settings",

            "Future audio and accessibility controls.",

            true
        );


        /*
        ============================================================
        OBJECTIVE BAR
        ============================================================
        */

        const objectiveBg =
            this.add.graphics();


        objectiveBg.fillStyle(
            THEME.ink,
            0.91
        );


        objectiveBg.fillRoundedRect(
            72,
            GAME_HEIGHT - 76,
            576,
            56,
            18
        );


        objectiveBg.lineStyle(
            2,
            0xffffff,
            0.08
        );


        objectiveBg.strokeRoundedRect(
            72,
            GAME_HEIGHT - 76,
            576,
            56,
            18
        );


        this.hudRoot.add(
            objectiveBg
        );


        const objectiveButton =
            this.add.image(
                105,
                GAME_HEIGHT - 48,
                "uiTinyRoundBlue"
            )
            .setScale(0.76);


        objectiveButton.__blocksWorldInput =
            true;


        this.hudRoot.add(
            objectiveButton
        );


        const objectiveIcon =
            this.add.image(
                105,
                GAME_HEIGHT - 48,
                "uiSword"
            )
            .setScale(0.36);


        this.hudRoot.add(
            objectiveIcon
        );


        this.objectiveText =
            this.add.text(
                139,
                GAME_HEIGHT - 62,
                "",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "14px",

                    color:
                        "#eef3e4"
                }
            );


        this.hudRoot.add(
            this.objectiveText
        );


        this.objectiveSubText =
            this.add.text(
                139,
                GAME_HEIGHT - 40,
                "",

                {
                    fontFamily:
                        FONT_BODY,

                    fontSize:
                        "11px",

                    fontStyle:
                        "bold",

                    color:
                        "#94a2ae"
                }
            );


        this.hudRoot.add(
            this.objectiveSubText
        );


        this.attachTooltip(
            objectiveButton,

            "Current objective",

            "This points to the next useful hub action."
        );


        this.createHudTooltipLayer();

        this.updateHUD();

        /*
            Establish the correct HUD transform immediately.
        */
        this.syncHudToCameraZoom();

    }


    createCurrencyChip(
        x,
        y,
        texture,
        iconScale,
        title,
        description
    ) {

        const bg =
            this.add.graphics();


        bg.fillStyle(
            THEME.panel,
            0.94
        );


        bg.fillRoundedRect(
            x - 57,
            y - 26,
            114,
            52,
            15
        );


        bg.lineStyle(
            2,
            0xffffff,
            0.08
        );


        bg.strokeRoundedRect(
            x - 57,
            y - 26,
            114,
            52,
            15
        );


        this.hudRoot.add(
            bg
        );


        const plate =
            this.add.image(
                x - 35,
                y,
                "uiTinySquareBlue"
            )
            .setScale(0.70)
            .setInteractive({
                useHandCursor: true
            });


        plate.__blocksWorldInput =
            true;


        this.hudRoot.add(
            plate
        );


        const icon =
            this.add.image(
                x - 35,
                y,
                texture
            )
            .setScale(
                iconScale
            );


        this.hudRoot.add(
            icon
        );


        const amount =
            this.add.text(
                x - 9,
                y + 1,
                "0",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "22px",

                    color:
                        "#ffffff"
                }
            )
            .setOrigin(
                0,
                0.5
            );


        this.hudRoot.add(
            amount
        );


        this.attachTooltip(
            plate,
            title,
            description
        );


        return amount;

    }


    createFutureCurrencySocket(
        x,
        y,
        title,
        description
    ) {

        const bg =
            this.add.image(
                x,
                y,
                "uiTinyRoundBlue"
            )
            .setScale(0.67)
            .setAlpha(0.42)
            .setInteractive({
                useHandCursor: true
            });


        bg.__blocksWorldInput =
            true;


        this.hudRoot.add(bg);


        const q =
            this.add.text(
                x,
                y - 1,
                "?",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "16px",

                    color:
                        "#6d7c8c"
                }
            )
            .setOrigin(0.5);


        this.hudRoot.add(q);


        this.attachTooltip(
            bg,
            title,
            description
        );

    }


    createHudIconButton(
        x,
        y,
        texture,
        title,
        description,
        disabled = false
    ) {

        const bg =
            this.add.image(
                x,
                y,

                disabled
                    ? "uiTinyRoundRed"
                    : "uiTinyRoundBlue"
            )
            .setScale(0.70)
            .setAlpha(
                disabled
                    ? 0.42
                    : 0.95
            )
            .setInteractive({
                useHandCursor: true
            });


        bg.__blocksWorldInput =
            true;


        this.hudRoot.add(bg);


        const icon =
            this.add.image(
                x,
                y,
                texture
            )
            .setScale(0.38)
            .setAlpha(
                disabled
                    ? 0.42
                    : 0.95
            );


        this.hudRoot.add(icon);


        bg.on(
            "pointerover",
            () => {

                this.tweens.add({
                    targets: bg,
                    scaleX: 0.74,
                    scaleY: 0.74,
                    duration: 65
                });

                this.tweens.add({
                    targets: icon,
                    scaleX: 0.41,
                    scaleY: 0.41,
                    duration: 65
                });

            }
        );


        bg.on(
            "pointerout",
            () => {

                this.tweens.add({
                    targets: bg,
                    scaleX: 0.70,
                    scaleY: 0.70,
                    duration: 65
                });

                this.tweens.add({
                    targets: icon,
                    scaleX: 0.38,
                    scaleY: 0.38,
                    duration: 65
                });

            }
        );


        this.attachTooltip(
            bg,

            title +
            (
                disabled
                    ? " • LOCKED"
                    : ""
            ),

            description
        );


        return bg;

    }


    createHudTooltipLayer() {

        /*
            IMPORTANT:
            Tooltip is now a child of hudRoot.

            That means zoom compensation applies to it
            exactly like the rest of the interface.
        */

        this.tooltipBox =
            this.add.container(
                0,
                0
            )
            .setDepth(120000)
            .setVisible(false);


        const bg =
            this.add.graphics();


        bg.fillStyle(
            0x070b11,
            0.97
        );


        bg.fillRoundedRect(
            0,
            0,
            286,
            98,
            16
        );


        bg.lineStyle(
            2,
            THEME.gold,
            0.38
        );


        bg.strokeRoundedRect(
            0,
            0,
            286,
            98,
            16
        );


        this.tooltipTitle =
            this.add.text(
                14,
                11,
                "",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "16px",

                    color:
                        "#fff0a2"
                }
            );


        this.tooltipBody =
            this.add.text(
                14,
                36,
                "",

                {
                    fontFamily:
                        FONT_BODY,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#c9d1dc",

                    wordWrap: {
                        width: 258
                    }
                }
            );


        this.tooltipBox.add([
            bg,
            this.tooltipTitle,
            this.tooltipBody
        ]);


        /*
            Put the entire tooltip inside the
            zoom-compensated HUD hierarchy.
        */

        this.hudRoot.add(
            this.tooltipBox
        );


        this.tooltipHideEvent =
            null;

    }


    attachTooltip(
        target,
        title,
        description
    ) {

        if (!target.input) {

            target.setInteractive({
                useHandCursor: true
            });

        }


        target.__blocksWorldInput =
            true;


        const show =
            (
                pointer,
                sticky
            ) => {

                if (
                    !this.tooltipBox
                ) {
                    return;
                }


                this.tooltipTitle
                    .setText(title);


                this.tooltipBody
                    .setText(
                        description
                    );


                const px =
                    Phaser.Math.Clamp(

                        (
                            pointer?.x ??
                            360
                        )
                        - 143,

                        14,

                        GAME_WIDTH - 300
                    );


                const py =
                    Phaser.Math.Clamp(

                        (
                            pointer?.y ??
                            180
                        )
                        + 20,

                        106,

                        GAME_HEIGHT - 188
                    );


                this.tooltipBox
                    .setPosition(
                        px,
                        py
                    )
                    .setVisible(true);


                if (
                    this.tooltipHideEvent
                ) {

                    this.tooltipHideEvent
                        .remove(false);

                    this.tooltipHideEvent =
                        null;

                }


                if (sticky) {

                    this.tooltipHideEvent =
                        this.time.delayedCall(
                            2400,

                            () => {

                                if (
                                    this.tooltipBox
                                ) {

                                    this.tooltipBox
                                        .setVisible(false);

                                }


                                this.tooltipHideEvent =
                                    null;

                            }
                        );

                }

            };


        target.on(
            "pointerover",

            pointer =>
                show(
                    pointer,
                    false
                )
        );


        target.on(
            "pointerout",
            () => {

                if (
                    !this.tooltipHideEvent &&
                    this.tooltipBox
                ) {

                    this.tooltipBox
                        .setVisible(false);

                }

            }
        );


        target.on(
            "pointerdown",

            (
                pointer,
                localX,
                localY,
                event
            ) => {

                if (
                    event &&
                    event.stopPropagation
                ) {

                    event.stopPropagation();

                }


                show(
                    pointer,
                    true
                );

            }
        );

    }


    generateGlimmer() {

        try {

            this.sound.play(
                "crankClick",
                {
                    volume: 0.28
                }
            );

        } catch (_) {}


        this.tweens.killTweensOf(
            this.crankhouse
        );


        this.crankhouse.setScale(
            1.02,
            1.15
        );


        this.tweens.add({

            targets:
                this.crankhouse,

            scaleX:
                1.08,

            scaleY:
                1.08,

            duration:
                170,

            ease:
                "Back.Out"

        });


        const angle =
            Phaser.Math.FloatBetween(
                0,
                Math.PI * 2
            );


        const distance =
            Phaser.Math.Between(
                125,
                230
            );


        const targetX =
            this.worldCenter.x +
            Math.cos(angle) *
            distance;


        const targetY =
            this.worldCenter.y +
            Math.sin(angle) *
            distance;


        const resource =
            this.add.image(
                this.worldCenter.x,
                this.worldCenter.y + 10,
                "glimmer"
            )
            .setScale(0.62)
            .setDepth(
                this.worldCenter.y +
                120
            )
            .setAlpha(0.1);


        resource.__collected =
            false;


        this.glimmerLoose.push(
            resource
        );


        this.updateHUD();


        this.tweens.add({

            targets:
                resource,

            x:
                targetX,

            y:
                targetY,

            alpha:
                1,

            angle:
                Phaser.Math.Between(
                    -90,
                    90
                ),

            scaleX:
                0.58,

            scaleY:
                0.58,

            duration:
                360,

            ease:
                "Back.Out"

        });


        this.tweens.add({

            targets:
                resource,

            y:
                targetY - 10,

            duration:
                520,

            yoyo:
                true,

            repeat:
                -1,

            ease:
                "Sine.InOut",

            delay:
                360

        });


        this.floatText(

            this.worldCenter.x +
            Phaser.Math.Between(
                -35,
                35
            ),

            this.worldCenter.y -
            120,

            "+1 GLIMMER",

            "#ffe26d"

        );

    }


    collectGlimmer(resource) {

        if (
            !resource.active ||
            resource.__collected
        ) {
            return;
        }


        resource.__collected =
            true;


        try {

            this.sound.play(
                "glimmerCollect",
                {
                    volume: 0.22
                }
            );

        } catch (_) {}


        const index =
            this.glimmerLoose
                .indexOf(resource);


        if (index !== -1) {

            this.glimmerLoose
                .splice(
                    index,
                    1
                );

        }


        this.glimmerOwned += 1;


        this.saveData.glimmer =
            this.glimmerOwned;


        persistSave(
            this.saveData
        );


        this.updateHUD();


        this.floatText(
            this.player.x,
            this.player.y - 105,
            "+1",
            "#fff0a5"
        );


        this.tweens.killTweensOf(
            resource
        );


        this.tweens.add({

            targets:
                resource,

            x:
                this.player.x,

            y:
                this.player.y - 35,

            scaleX:
                0.05,

            scaleY:
                0.05,

            alpha:
                0,

            duration:
                150,

            ease:
                "Quad.In",

            onComplete:
                () =>
                    resource.destroy()

        });

    }


    beginClaimrun() {

        if (
            !this.activeGhostlot ||
            this.claimrunLaunching
        ) {
            return;
        }


        const lotId =
            this.activeGhostlot.id;


        const opened =
            this.saveData
                .openedClaimruns
                .includes(lotId);


        const cost =
            claimCostForProgress(
                this.saveData
                    .unlockedLots
                    .length
            );


        if (!opened) {

            if (
                this.glimmerOwned <
                cost
            ) {

                const missing =
                    cost -
                    this.glimmerOwned;


                try {

                    this.sound.play(
                        "powerDown",
                        {
                            volume: 0.18
                        }
                    );

                } catch (_) {}


                this.floatText(
                    this.activeGhostlot.x,
                    this.activeGhostlot.y - 80,

                    `NEED ${missing} MORE`,

                    "#ff9ba2"
                );


                this.showHudToast(
                    `Need ${missing} more Glimmer.`
                );


                this.refreshGhostlotPrompt();

                return;

            }


            this.glimmerOwned -=
                cost;


            this.saveData.glimmer =
                this.glimmerOwned;


            if (
                !this.saveData
                    .openedClaimruns
                    .includes(lotId)
            ) {

                this.saveData
                    .openedClaimruns
                    .push(lotId);

            }


            persistSave(
                this.saveData
            );


            this.registry.set(
                "saveData",
                this.saveData
            );


            this.updateHUD();

            this.refreshGhostlotPrompt();


            this.floatText(
                this.activeGhostlot.x,
                this.activeGhostlot.y - 80,

                `-${cost}`,

                "#ffe170"
            );

        }


        this.claimrunLaunching =
            true;


        this.moveTarget =
            null;


        try {

            this.sound.play(
                "confirm",
                {
                    volume: 0.30
                }
            );

        } catch (_) {}


        this.cameras.main.fadeOut(
            220,
            12,
            18,
            26
        );


        this.time.delayedCall(
            235,

            () => {

                this.physics.resume();

                this.scene.start(
                    "ClaimRunScene",
                    {
                        lotId
                    }
                );

            }
        );

    }


    showHudToast(message) {

        if (
            this.hudToast &&
            this.hudToast.active
        ) {

            this.hudToast.destroy();

        }


        const toast =
            this.add.text(
                GAME_WIDTH / 2,
                112,

                message,

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "14px",

                    color:
                        "#fff3f4",

                    backgroundColor:
                        "#7a3540",

                    padding: {
                        x: 14,
                        y: 8
                    }
                }
            )
            .setOrigin(0.5)
            .setDepth(130000);


        toast.__blocksWorldInput =
            true;


        /*
            Keep it attached to the screen even
            while Nullmeadow zooms.
        */

        this.hudRoot.add(
            toast
        );


        this.hudToast =
            toast;


        this.tweens.add({

            targets:
                toast,

            y:
                124,

            alpha:
                0,

            delay:
                1450,

            duration:
                300,

            onComplete:
                () =>
                    toast.destroy()

        });

    }


    floatText(
        x,
        y,
        text,
        color
    ) {

        const t =
            this.add.text(
                x,
                y,
                text,

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "20px",

                    color,

                    stroke:
                        "#20251f",

                    strokeThickness:
                        5
                }
            )
            .setOrigin(0.5)
            .setDepth(9999);


        this.tweens.add({

            targets:
                t,

            y:
                y - 54,

            alpha:
                0,

            duration:
                700,

            ease:
                "Cubic.Out",

            onComplete:
                () =>
                    t.destroy()

        });

    }


    drawTargetMarker(
        x,
        y
    ) {

        this.targetMarker
            .clear()
            .setVisible(true);


        this.targetMarker.lineStyle(
            4,
            0xffffff,
            0.42
        );


        this.targetMarker.strokeCircle(
            x,
            y,
            23
        );


        this.targetMarker.lineStyle(
            3,
            0xffe26d,
            0.62
        );


        this.targetMarker.strokeCircle(
            x,
            y,
            11
        );


        this.tweens.killTweensOf(
            this.targetMarker
        );


        this.targetMarker
            .setAlpha(1);


        this.tweens.add({

            targets:
                this.targetMarker,

            alpha:
                0.12,

            duration:
                360,

            yoyo:
                true,

            repeat:
                1,

            onComplete:
                () =>
                    this.targetMarker
                        .setVisible(false)

        });

    }


    updateHUD() {

        if (!this.glimmerHud) {
            return;
        }


        this.glimmerHud.setText(
            compactAmount(
                this.glimmerOwned
            )
        );


        this.valorHud.setText(
            compactAmount(
                this.saveData.valor ||
                0
            )
        );


        if (
            this.activeGhostlot &&
            this.objectiveText
        ) {

            const opened =
                this.saveData
                    .openedClaimruns
                    .includes(
                        this.activeGhostlot.id
                    );


            const cost =
                claimCostForProgress(
                    this.saveData
                        .unlockedLots
                        .length
                );


            this.objectiveText
                .setText(

                    `${
                        this.activeGhostlot
                            .id
                            .toUpperCase()
                    } • ${
                        opened
                            ? "ENTRY OPEN"
                            : `${cost} GLIMMER`
                    }`

                );


            this.objectiveSubText
                .setText(

                    opened
                        ? "Walk onto the Calling Lot and fight again"
                        : "Walk onto the Calling Lot to open Claimrun"

                );

        } else if (
            this.objectiveText
        ) {

            this.objectiveText
                .setText(
                    "ALL CURRENT GHOSTLOTS CLAIMED"
                );


            this.objectiveSubText
                .setText(
                    "Nullmeadow is waiting for the next bad idea."
                );

        }


        this.refreshGhostlotPrompt();

    }


    updateGhostlotPrompt() {

        if (
            !this.activeGhostlot ||
            !this.ghostlotPrompt
        ) {
            return;
        }


        const lot =
            this.activeGhostlot;


        const inside =
            Phaser.Math
                .Distance
                .Between(
                    this.player.x,
                    this.player.y,
                    lot.x,
                    lot.y
                )
            <
            Math.max(
                112,
                lot.size * 0.72
            );


        this.ghostlotPrompt
            .setVisible(inside);


        if (inside) {

            this.refreshGhostlotPrompt();

        }

    }


    update() {

        /*
            Cheap insurance in case anything else changes
            the world-camera zoom later.
        */
        this.syncHudToCameraZoom();

        const body =
            this.player.body;


        const keyboardX =
            (
                this.keys.right.isDown ||
                this.cursors.right.isDown
                    ? 1
                    : 0
            )
            -
            (
                this.keys.left.isDown ||
                this.cursors.left.isDown
                    ? 1
                    : 0
            );


        const keyboardY =
            (
                this.keys.down.isDown ||
                this.cursors.down.isDown
                    ? 1
                    : 0
            )
            -
            (
                this.keys.up.isDown ||
                this.cursors.up.isDown
                    ? 1
                    : 0
            );


        let vx = 0;

        let vy = 0;

        const speed = 315;


        if (
            keyboardX !== 0 ||
            keyboardY !== 0
        ) {

            this.moveTarget = null;

            this.targetMarker
                .setVisible(false);


            const dir =
                new Phaser.Math.Vector2(
                    keyboardX,
                    keyboardY
                )
                .normalize();


            vx =
                dir.x * speed;

            vy =
                dir.y * speed;

        } else if (
            this.moveTarget
        ) {

            const distance =
                Phaser.Math
                    .Distance
                    .Between(
                        this.player.x,
                        this.player.y,
                        this.moveTarget.x,
                        this.moveTarget.y
                    );


            if (
                distance < 20
            ) {

                this.moveTarget =
                    null;

            } else {

                const dir =
                    new Phaser.Math.Vector2(
                        this.moveTarget.x -
                        this.player.x,

                        this.moveTarget.y -
                        this.player.y
                    )
                    .normalize();


                vx =
                    dir.x *
                    speed;

                vy =
                    dir.y *
                    speed;

            }

        }


        body.setVelocity(
            vx,
            vy
        );


        const moving =
            Math.abs(vx) +
            Math.abs(vy)
            > 5;


        if (moving) {

            if (
                this.player.anims
                    .currentAnim?.key
                !==
                "pip-run"
            ) {

                this.player.play(
                    "pip-run"
                );

            }


            if (
                Math.abs(vx) > 10
            ) {

                this.player.setFlipX(
                    vx < 0
                );

            }

        } else if (
            this.player.anims
                .currentAnim?.key
            !==
            "pip-idle"
        ) {

            this.player.play(
                "pip-idle"
            );

        }


        this.player.setDepth(
            this.player.y + 10
        );


        this.playerName
            .setPosition(
                this.player.x,
                this.player.y - 94
            )
            .setDepth(
                this.player.depth + 20
            );


        for (
            const resource
            of [...this.glimmerLoose]
        ) {

            if (
                !resource.active ||
                resource.__collected
            ) {
                continue;
            }


            resource.setDepth(
                resource.y + 4
            );


            if (
                Phaser.Math
                    .Distance
                    .Between(
                        this.player.x,
                        this.player.y,
                        resource.x,
                        resource.y
                    )
                < 80
            ) {

                this.collectGlimmer(
                    resource
                );

            }

        }


        this.updateGhostlotPrompt();

    }


    makeRng(seed) {

        return function () {

            seed |= 0;

            seed =
                seed +
                0x6D2B79F5 |
                0;


            let t =
                Math.imul(
                    seed ^
                    seed >>> 15,

                    1 | seed
                );


            t =
                t +
                Math.imul(
                    t ^
                    t >>> 7,

                    61 | t
                )
                ^
                t;


            return (
                (
                    t ^
                    t >>> 14
                )
                >>> 0
            )
            /
            4294967296;

        };

    }

}



class ClaimRunScene extends Phaser.Scene {

    constructor() {

        super(
            "ClaimRunScene"
        );

    }


    init(data) {

        this.lotId =
            data?.lotId ||
            "Ghostlot 01";

    }


    create() {

        /*
            Important retry fix.

            finishChallenge() pauses Arcade
            Physics. Always wake it here.
        */

        this.physics.resume();


        this.saveData =
            this.registry.get("saveData") ||
            loadSave();


        if (
            !Array.isArray(
                this.saveData.unlockedLots
            )
        ) {

            this.saveData.unlockedLots =
                [];

        }


        if (
            !Array.isArray(
                this.saveData.openedClaimruns
            )
        ) {

            this.saveData.openedClaimruns =
                [];

        }


        this.registry.set(
            "saveData",
            this.saveData
        );


        /*
        ============================================================
        PROCEDURAL DIFFICULTY
        ============================================================
        */

        this.difficulty =
            Math.max(
                1,

                this.saveData
                    .unlockedLots
                    .length +
                1
            );


        this.totalEnemies =
            22 +
            this.difficulty * 6 +
            Math.floor(
                Math.pow(
                    this.difficulty,
                    1.12
                )
                *
                1.2
            );


        this.totalGatePairs =
            3 +
            Math.floor(
                (
                    this.difficulty -
                    1
                )
                *
                0.65
            );


        this.enemySpawnDelay =
            Math.max(
                245,

                570 -
                (
                    this.difficulty -
                    1
                )
                *
                22
            );


        this.enemyBaseSpeed =
            70 +
            (
                this.difficulty -
                1
            )
            *
            5.2;


        this.enemyBaseHp =
            1 +
            Math.floor(
                (
                    this.difficulty -
                    1
                )
                /
                4
            );


        this.gateSpeed =
            105 +
            Math.min(
                85,

                (
                    this.difficulty -
                    1
                )
                *
                6.2
            );


        this.gateSpawnDelay =
            Math.max(
                2500,

                3450 -
                (
                    this.difficulty -
                    1
                )
                *
                100
            );


        this.spawnedEnemies = 0;

        this.defeatedEnemies = 0;

        this.breachedEnemies = 0;


        this.integrityMax = 5;

        this.integrity =
            this.integrityMax;


        this.spawnedGatePairs = 0;

        this.resolvedGatePairs = 0;

        this.gatePairCounter = 0;

        this.gatePairs =
            new Map();


        /*
            Arithmetic wall stats.
        */

        this.volley = 1;

        this.rateTier = 0;

        this.speedTier = 0;


        this.challengeOver =
            false;


        this.nextShotAt = 0;


        this.playerTargetX =
            GAME_WIDTH / 2;


        this.physics.world.setBounds(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT
        );


        this.cameras.main
            .setBackgroundColor(
                "#090f19"
            );


        this.createClaimAnimations();

        this.createArena();

        this.createChallengeGroups();

        this.createChallengePlayer();

        this.createChallengeHUD();

        this.createChallengeInput();

        this.startProceduralRun();


        this.physics.add.overlap(
            this.bullets,
            this.enemies,
            this.hitEnemy,
            null,
            this
        );


        this.physics.add.overlap(
            this.bullets,
            this.gates,
            this.hitGate,

            (
                bullet,
                gate
            ) =>
                gate.active &&
                gate.y > 130 &&
                gate.y < 1005,

            this
        );


        this.physics.add.overlap(
            this.challengePlayer,
            this.gates,
            this.crossGate,
            null,
            this
        );


        this.cameras.main.fadeIn(
            220,
            8,
            12,
            20
        );

    }


    createClaimAnimations() {

        if (
            !this.anims.exists(
                "claim-archer-idle"
            )
        ) {

            this.anims.create({

                key:
                    "claim-archer-idle",

                frames:
                    this.anims
                        .generateFrameNumbers(
                            "claimArcherIdle",
                            {
                                start: 0,
                                end: 5
                            }
                        ),

                frameRate:
                    8,

                repeat:
                    -1

            });

        }


        if (
            !this.anims.exists(
                "claim-archer-shoot"
            )
        ) {

            this.anims.create({

                key:
                    "claim-archer-shoot",

                frames:
                    this.anims
                        .generateFrameNumbers(
                            "claimArcherShoot",
                            {
                                start: 0,
                                end: 7
                            }
                        ),

                frameRate:
                    24,

                repeat:
                    0

            });

        }

    }


    createArena() {

        const g =
            this.add.graphics()
                .setDepth(-1000);


        g.fillStyle(
            0x080d16,
            1
        );


        g.fillRect(
            0,
            0,
            GAME_WIDTH,
            GAME_HEIGHT
        );


        /*
        ============================================================
        PLAY FIELD
        ============================================================
        */

        g.fillStyle(
            0x162238,
            1
        );


        g.fillRoundedRect(
            48,
            128,
            GAME_WIDTH - 96,
            1010,
            28
        );


        g.lineStyle(
            4,
            0x536b88,
            0.54
        );


        g.strokeRoundedRect(
            48,
            128,
            GAME_WIDTH - 96,
            1010,
            28
        );


        const laneWidth =
            (
                GAME_WIDTH -
                120
            )
            /
            4;


        for (
            let i = 0;
            i < 4;
            i++
        ) {

            g.fillStyle(
                i % 2 === 0
                    ? 0x1c2940
                    : 0x18243a,

                0.30
            );


            g.fillRect(
                60 +
                laneWidth * i,

                140,

                laneWidth,

                850
            );

        }


        /*
        ============================================================
        INBOUND ZONE
        ============================================================
        */

        g.fillStyle(
            THEME.red,
            0.07
        );


        g.fillRect(
            60,
            140,
            GAME_WIDTH - 120,
            58
        );


        g.lineStyle(
            2,
            THEME.red,
            0.25
        );


        g.lineBetween(
            60,
            198,
            GAME_WIDTH - 60,
            198
        );


        /*
        ============================================================
        DEPTH / RANGE LINES
        ============================================================
        */

        for (
            let y = 250;
            y < 960;
            y += 100
        ) {

            g.lineStyle(
                2,
                0xffffff,
                0.045
            );


            g.lineBetween(
                75,
                y,
                GAME_WIDTH - 75,
                y
            );

        }


        g.lineStyle(
            2,
            0xb5cce6,
            0.08
        );


        g.lineBetween(
            GAME_WIDTH / 2,
            142,
            GAME_WIDTH / 2,
            990
        );


        g.lineBetween(
            78,
            990,
            205,
            142
        );


        g.lineBetween(
            GAME_WIDTH - 78,
            990,
            515,
            142
        );


        /*
        ============================================================
        DEFENSE ZONE
        ============================================================
        */

        g.fillStyle(
            THEME.gold,
            0.075
        );


        g.fillRect(
            60,
            990,
            GAME_WIDTH - 120,
            148
        );


        this.add.text(
            GAME_WIDTH / 2,
            161,

            "INBOUND",

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "12px",

                fontStyle:
                    "bold",

                color:
                    "#ff8790"
            }
        )
        .setOrigin(0.5)
        .setAlpha(0.65)
        .setDepth(-900);


        /*
        ============================================================
        ACTUAL FENCE ASSET
        ============================================================

        The old Claimrun merely drew a line and
        called it a fence.

        This uses the provided fence tile atlas.
        */

        this.fenceSprites = [];


        const fenceY =
            992;

        const count =
            24;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            const x =
                75 +
                i *
                (
                    (GAME_WIDTH - 150)
                    /
                    (count - 1)
                );


            const frame =
                i === 0
                    ? 1
                    : i === count - 1
                        ? 3
                        : 2;


            const fence =
                this.add.sprite(
                    x,
                    fenceY,
                    "fenceTiles",
                    frame
                )
                .setScale(2.0)
                .setDepth(850)
                .setTint(
                    0xffe1a1
                );


            fence.__segment =
                Math.min(

                    this.integrityMax -
                    1,

                    Math.floor(
                        i /
                        (
                            count /
                            this.integrityMax
                        )
                    )

                );


            this.fenceSprites.push(
                fence
            );

        }


        this.refreshFenceVisual();

    }


    createChallengeGroups() {

        this.bullets =
            this.physics.add.group({
                allowGravity: false
            });


        this.enemies =
            this.physics.add.group({
                allowGravity: false
            });


        this.gates =
            this.physics.add.group({
                allowGravity: false
            });

    }


    createChallengePlayer() {

        /*
            Pip temporarily becomes an actual
            yellow Tiny Swords archer.

            The sprite normally faces right,
            therefore -90 degrees points the
            bow toward the incoming horde.
        */

        this.challengePlayer =
            this.physics.add.sprite(
                GAME_WIDTH / 2,
                1082,
                "claimArcherIdle",
                0
            )
            .setScale(0.58)
            .setAngle(-90)
            .setDepth(5000);


        this.challengePlayer
            .body
            .setAllowGravity(false);


        this.challengePlayer
            .setCollideWorldBounds(
                true
            );


        this.challengePlayer
            .body
            .setCircle(
                42,
                54,
                54
            );


        this.challengePlayer
            .play(
                "claim-archer-idle"
            );


        this.challengePlayer.on(
            "animationcomplete-claim-archer-shoot",

            () => {

                if (
                    this.challengePlayer?.active &&
                    !this.challengeOver
                ) {

                    this.challengePlayer.play(
                        "claim-archer-idle"
                    );

                }

            }
        );


        this.add.text(
            GAME_WIDTH / 2,
            1164,

            "PIP • CLAIM LOADOUT",

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "14px",

                fontStyle:
                    "bold",

                color:
                    "#fff0a2",

                stroke:
                    "#101522",

                strokeThickness:
                    4
            }
        )
        .setOrigin(0.5)
        .setDepth(5001);

    }


    createChallengeHUD() {

        const top =
            this.add.graphics()
                .setDepth(10000);


        top.fillStyle(
            0x070c14,
            0.98
        );


        top.fillRect(
            0,
            0,
            GAME_WIDTH,
            120
        );


        top.lineStyle(
            2,
            0xffffff,
            0.08
        );


        top.lineBetween(
            0,
            119,
            GAME_WIDTH,
            119
        );


        top.lineStyle(
            3,
            THEME.gold,
            0.28
        );


        top.lineBetween(
            20,
            118,
            700,
            118
        );


        this.add.text(
            24,
            13,

            "CLAIMRUN",

            {
                fontFamily:
                    FONT_DISPLAY,

                fontSize:
                    "29px",

                color:
                    "#fff0a2"
            }
        )
        .setDepth(10001);


        this.add.text(
            26,
            49,

            `${
                this.lotId.toUpperCase()
            } • RUN ${
                this.difficulty
            }`,

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "12px",

                fontStyle:
                    "bold",

                color:
                    "#8395aa"
            }
        )
        .setDepth(10001);


        this.wallHud =
            this.add.text(
                26,
                80,
                "",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#bac7d6"
                }
            )
            .setDepth(10001);


        this.wallWarningText =
            this.add.text(
                GAME_WIDTH / 2,
                105,
                "",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "11px",

                    fontStyle:
                        "bold",

                    color:
                        "#ffbd68"
                }
            )
            .setOrigin(0.5)
            .setDepth(10002)
            .setAlpha(0.15);


        this.enemyHud =
            this.add.text(
                694,
                14,
                "",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "18px",

                    color:
                        "#ffffff",

                    align:
                        "right"
                }
            )
            .setOrigin(
                1,
                0
            )
            .setDepth(10001);


        this.fireHud =
            this.add.text(
                694,
                49,
                "",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#76ff9d",

                    align:
                        "right"
                }
            )
            .setOrigin(
                1,
                0
            )
            .setDepth(10001);


        this.integrityHud =
            this.add.text(
                694,
                79,
                "",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#ffabb3",

                    align:
                        "right"
                }
            )
            .setOrigin(
                1,
                0
            )
            .setDepth(10001);


        const bottom =
            this.add.graphics()
                .setDepth(10000);


        bottom.fillStyle(
            0x070c14,
            0.92
        );


        bottom.fillRoundedRect(
            104,
            1211,
            512,
            43,
            16
        );


        bottom.lineStyle(
            2,
            0xffffff,
            0.06
        );


        bottom.strokeRoundedRect(
            104,
            1211,
            512,
            43,
            16
        );


        this.add.text(
            GAME_WIDTH / 2,
            1232,

            "AUTO-FIRE • PUMP GREEN • AVOID RED • BULLETS PASS THROUGH GATES",

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "10px",

                fontStyle:
                    "bold",

                color:
                    "#aebdcc"
            }
        )
        .setOrigin(0.5)
        .setDepth(10001);


        this.updateChallengeHUD();

    }


    createChallengeInput() {

        this.cursors =
            this.input.keyboard
                .createCursorKeys();


        this.claimKeys =
            this.input.keyboard
                .addKeys({

                    left:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .A,

                    right:
                        Phaser
                            .Input
                            .Keyboard
                            .KeyCodes
                            .D

                });


        const setTarget =
            pointer => {

                if (
                    this.challengeOver
                ) {
                    return;
                }


                this.playerTargetX =
                    Phaser.Math.Clamp(
                        pointer.x,
                        92,
                        GAME_WIDTH - 92
                    );

            };


        this.input.on(
            "pointerdown",
            setTarget
        );


        this.input.on(
            "pointermove",

            pointer => {

                if (
                    pointer.isDown
                ) {

                    setTarget(
                        pointer
                    );

                }

            }
        );

    }


    startProceduralRun() {

        this.enemySpawnEvent =
            this.time.addEvent({

                delay:
                    this.enemySpawnDelay,

                loop:
                    true,

                callback:
                    () =>
                        this.spawnEnemyTick()

            });


        /*
            Start with some actual visual
            activity rather than dead air.
        */

        this.spawnEnemyTick();


        this.time.delayedCall(
            160,

            () => {

                if (
                    !this.challengeOver
                ) {

                    this.spawnEnemyTick();

                }

            }
        );


        /*
            Gates begin completely above
            the visible screen.
        */

        this.time.delayedCall(
            650,

            () => {

                if (
                    !this.challengeOver
                ) {

                    this.spawnGatePair();

                }

            }
        );


        this.gateSpawnEvent =
            this.time.addEvent({

                delay:
                    this.gateSpawnDelay,

                loop:
                    true,

                callback:
                    () => {

                        if (
                            this.spawnedGatePairs <
                            this.totalGatePairs
                        ) {

                            this.spawnGatePair();

                        }


                        if (
                            this.spawnedGatePairs >=
                            this.totalGatePairs &&
                            this.gateSpawnEvent
                        ) {

                            this.gateSpawnEvent
                                .remove(false);

                        }

                    }

            });

    }


    spawnEnemyTick() {

        if (
            this.challengeOver ||
            this.spawnedEnemies >=
            this.totalEnemies
        ) {

            if (
                this.enemySpawnEvent
            ) {

                this.enemySpawnEvent
                    .remove(false);

            }

            return;

        }


        /*
            Difficulty turns the trickle
            into increasingly thick groups.
        */

        let batch = 1;


        if (
            Math.random()
            <
            Math.min(
                0.82,

                0.23 +
                this.difficulty *
                0.045
            )
        ) {

            batch++;

        }


        if (
            Math.random()
            <
            Math.min(
                0.55,

                Math.max(
                    0,

                    (
                        this.difficulty -
                        2
                    )
                    *
                    0.043
                )
            )
        ) {

            batch++;

        }


        if (
            Math.random()
            <
            Math.min(
                0.26,

                Math.max(
                    0,

                    (
                        this.difficulty -
                        6
                    )
                    *
                    0.025
                )
            )
        ) {

            batch++;

        }


        batch =
            Math.min(

                batch,

                this.totalEnemies -
                this.spawnedEnemies

            );


        const center =
            Phaser.Math.Between(
                135,
                GAME_WIDTH - 135
            );


        for (
            let i = 0;
            i < batch;
            i++
        ) {

            this.time.delayedCall(

                i * 70,

                () => {

                    const spread =
                        (
                            i -
                            (
                                batch - 1
                            )
                            /
                            2
                        )
                        *
                        Phaser.Math.Between(
                            40,
                            64
                        );


                    this.spawnEnemy(

                        Phaser.Math.Clamp(
                            center +
                            spread,

                            90,

                            GAME_WIDTH - 90
                        )

                    );

                }

            );

        }

    }


    spawnEnemy(
        forcedX = null
    ) {

        if (
            this.challengeOver ||
            this.spawnedEnemies >=
            this.totalEnemies
        ) {
            return;
        }


        this.spawnedEnemies++;


        const progress =
            this.spawnedEnemies /
            this.totalEnemies;


        const x =
            forcedX ??
            Phaser.Math.Between(
                95,
                GAME_WIDTH - 95
            );


        const eliteChance =
            Math.min(
                0.34,

                0.05 +
                this.difficulty *
                0.022 +
                progress *
                0.08
            );


        const elite =
            Math.random() <
            eliteChance;


        const hp =
            this.enemyBaseHp +
            (
                elite
                    ? 1
                    : 0
            );


        const speed =
            Math.min(

                250,

                this.enemyBaseSpeed +

                Phaser.Math.Between(
                    -7,
                    24
                )

                +

                progress
                *
                (
                    22 +
                    this.difficulty *
                    1.5
                )

            );


        const enemy =
            this.enemies.create(
                x,
                146,
                "skeletonMove",
                0
            )
            .setScale(
                elite
                    ? 2.55
                    : 2.20
            )
            .setDepth(700);


        enemy.play(
            "skeleton-move"
        );


        enemy.body.setAllowGravity(
            false
        );


        enemy.body
            .setSize(
                22,
                26
            )
            .setOffset(
                5,
                4
            );


        enemy.setVelocityY(
            speed
        );


        enemy.__hp =
            hp;

        enemy.__maxHp =
            hp;

        enemy.__resolved =
            false;

        enemy.__elite =
            elite;


        if (elite) {

            enemy.setTint(
                0xffd870
            );

        }

    }


    spawnGatePair() {

        if (
            this.challengeOver ||
            this.spawnedGatePairs >=
            this.totalGatePairs
        ) {
            return;
        }


        this.spawnedGatePairs++;

        this.gatePairCounter++;


        const pairId =
            `wall-${
                this.gatePairCounter
            }`;


        const effects = [
            "VOLLEY",
            "RATE",
            "SPEED"
        ];


        const effect =
            effects[
                Phaser.Math.Between(
                    0,
                    effects.length - 1
                )
            ];


        const tier =
            1 +
            Math.floor(
                (
                    this.difficulty -
                    1
                )
                /
                4
            );


        const positiveStart =
            Phaser.Math.Between(
                1,
                Math.min(
                    3,
                    tier
                )
            );


        const negativeStart =
            -Phaser.Math.Between(
                1,

                Math.min(
                    4,

                    tier +
                    (
                        this.difficulty >= 7
                            ? 1
                            : 0
                    )
                )
            );


        const reversed =
            Math.random() < 0.5;


        /*
            These are intentionally much
            narrower than the old 286px gates.

            There is now:
            - a centre firing lane
            - room at the outside edges
            - clear visibility of enemies
              behind the panels
        */

        const leftX = 205;

        const rightX = 515;


        const positiveX =
            reversed
                ? rightX
                : leftX;


        const negativeX =
            reversed
                ? leftX
                : rightX;


        /*
            Entire gate begins above screen.
        */

        const y = -62;


        const pair = {

            id:
                pairId,

            resolved:
                false,

            gates:
                [],

            effect

        };


        this.gatePairs.set(
            pairId,
            pair
        );


        pair.gates.push(

            this.createGate(
                positiveX,
                y,
                positiveStart,
                effect,
                pairId
            )

        );


        pair.gates.push(

            this.createGate(
                negativeX,
                y,
                negativeStart,
                effect,
                pairId
            )

        );


        if (
            this.wallWarningText
        ) {

            this.wallWarningText
                .setText(
                    `INBOUND GATES • ${effect}`
                )
                .setAlpha(1);


            this.tweens.killTweensOf(
                this.wallWarningText
            );


            this.tweens.add({

                targets:
                    this.wallWarningText,

                alpha:
                    0.15,

                duration:
                    720,

                yoyo:
                    true,

                repeat:
                    1

            });

        }


        this.updateChallengeHUD();

    }


    createGate(
        x,
        y,
        value,
        effect,
        pairId
    ) {

        const positive =
            value > 0;


        const fill =
            positive
                ? 0x37d879
                : 0xed4f5d;


        const edge =
            positive
                ? 0x77ffa5
                : 0xff7f8a;


        /*
            Narrow gate panel.

            Enemies draw over it.
            Bullets draw over it.
        */

        const gate =
            this.add.rectangle(
                x,
                y,
                182,
                90,
                fill,
                0.18
            )
            .setStrokeStyle(
                5,
                edge,
                0.96
            )
            .setDepth(620);


        /*
            Physics exists for overlap
            detection only.

            Visible movement is manual.
        */

        this.physics.add.existing(
            gate
        );


        gate.body.setAllowGravity(
            false
        );


        gate.body.moves =
            false;


        gate.__speed =
            this.gateSpeed;


        gate.__pairId =
            pairId;


        gate.__effect =
            effect;


        gate.__value =
            value;


        gate.__positive =
            positive;


        gate.__resolved =
            false;


        gate.__fill =
            fill;


        gate.__edge =
            edge;


        gate.__id =
            `${
                pairId
            }-${
                positive
                    ? "good"
                    : "bad"
            }`;


        gate.__effectText =
            this.add.text(
                x,
                y - 24,

                effect,

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "12px",

                    fontStyle:
                        "bold",

                    color:
                        "#ffffff"
                }
            )
            .setOrigin(0.5)
            .setDepth(760)
            .setAlpha(0.80);


        gate.__valueText =
            this.add.text(
                x,
                y + 10,

                this.formatGateValue(
                    value
                ),

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "36px",

                    color:
                        positive
                            ? "#caffd8"
                            : "#ffd1d5",

                    stroke:
                        "#0a0f18",

                    strokeThickness:
                        7
                }
            )
            .setOrigin(0.5)
            .setDepth(761);


        gate.__bars =
            [-68, 68]
                .map(
                    offset =>
                        this.add.rectangle(
                            x + offset,
                            y,
                            5,
                            70,

                            positive
                                ? 0xb8ffcb
                                : 0xffb2b9,

                            0.30
                        )
                        .setDepth(621)
                );


        gate.__chevrons =
            [-38, 0, 38]
                .map(
                    offset =>
                        this.add.triangle(
                            x + offset,
                            y + 35,

                            -7,
                            -4,

                            7,
                            -4,

                            0,
                            6,

                            positive
                                ? 0xc8ffd7
                                : 0xffc4ca,

                            0.40
                        )
                        .setDepth(622)
                );


        this.gates.add(
            gate
        );


        gate.body
            .updateFromGameObject();


        this.refreshGateVisual(
            gate
        );


        return gate;

    }


    formatGateValue(value) {

        return value > 0
            ? `+${value}`
            : String(value);

    }


    refreshGateVisual(gate) {

        if (
            !gate?.active
        ) {
            return;
        }


        gate.__valueText
            .setText(
                this.formatGateValue(
                    gate.__value
                )
            );


        const strength =
            Phaser.Math.Clamp(
                Math.abs(
                    gate.__value
                ),
                1,
                15
            );


        gate.setFillStyle(
            gate.__fill,

            0.14 +
            strength *
            0.012
        );


        gate.setStrokeStyle(

            4 +
            Math.min(
                4,

                Math.floor(
                    strength / 4
                )
            ),

            gate.__edge,

            0.98

        );


        gate.__valueText
            .setScale(

                1 +
                Math.min(
                    0.18,

                    (
                        strength - 1
                    )
                    *
                    0.011
                )

            );

    }


    syncGateVisual(gate) {

        if (!gate.active) {
            return;
        }


        gate.__effectText
            .setPosition(
                gate.x,
                gate.y - 24
            );


        gate.__valueText
            .setPosition(
                gate.x,
                gate.y + 10
            );


        gate.__bars.forEach(
            (
                bar,
                index
            ) => {

                if (bar.active) {

                    bar.setPosition(

                        gate.x +
                        [-68, 68][index],

                        gate.y

                    );

                }

            }
        );


        gate.__chevrons.forEach(
            (
                chevron,
                index
            ) => {

                if (
                    chevron.active
                ) {

                    chevron.setPosition(

                        gate.x +
                        [-38, 0, 38][index],

                        gate.y + 35

                    );

                }

            }
        );

    }


    destroyGate(gate) {

        if (!gate) {
            return;
        }


        if (
            gate.__valueText?.active
        ) {

            gate.__valueText.destroy();

        }


        if (
            gate.__effectText?.active
        ) {

            gate.__effectText.destroy();

        }


        for (
            const bar
            of gate.__bars || []
        ) {

            if (bar.active) {

                bar.destroy();

            }

        }


        for (
            const chevron
            of gate.__chevrons || []
        ) {

            if (chevron.active) {

                chevron.destroy();

            }

        }


        if (gate.active) {

            gate.destroy();

        }

    }


    resolveGatePair(
        pairId,
        chosenGate = null
    ) {

        const pair =
            this.gatePairs.get(
                pairId
            );


        if (
            !pair ||
            pair.resolved
        ) {
            return;
        }


        pair.resolved =
            true;


        this.resolvedGatePairs++;


        if (chosenGate) {

            this.applyGateEffect(
                chosenGate
            );

        }


        for (
            const gate
            of pair.gates
        ) {

            this.destroyGate(
                gate
            );

        }


        this.updateChallengeHUD();

    }


    hitGate(
        bullet,
        gate
    ) {

        if (
            this.challengeOver ||
            !bullet.active ||
            !gate.active ||
            gate.__resolved
        ) {
            return;
        }


        /*
        ===============================================================
        IMPORTANT GAMEPLAY CHANGE
        ===============================================================

        Gates no longer consume projectiles.

        The arrow can:
        - increase the gate
        - continue upward
        - still kill the enemy behind it

        Each arrow remembers gates already touched
        so it cannot add +1 every frame while
        overlapping the same panel.
        ===============================================================
        */

        if (
            !bullet.__gateHits
        ) {

            bullet.__gateHits =
                new Set();

        }


        if (
            bullet.__gateHits.has(
                gate.__id
            )
        ) {
            return;
        }


        bullet.__gateHits.add(
            gate.__id
        );


        gate.__value +=
            gate.__positive
                ? 1
                : -1;


        gate.__value =
            Phaser.Math.Clamp(
                gate.__value,
                -15,
                15
            );


        this.refreshGateVisual(
            gate
        );


        this.tweens.add({

            targets: [
                gate,
                gate.__valueText
            ],

            alpha:
                0.45,

            duration:
                40,

            yoyo:
                true

        });


        if (
            Math.abs(
                gate.__value
            )
            %
            4
            ===
            0
        ) {

            this.floatChallengeText(

                gate.x,

                gate.y - 52,

                this.formatGateValue(
                    gate.__value
                ),

                gate.__positive
                    ? "#8dffae"
                    : "#ff9ba2"

            );

        }

    }


    crossGate(
        player,
        gate
    ) {

        if (
            this.challengeOver ||
            !gate.active ||
            gate.__resolved
        ) {
            return;
        }


        const pair =
            this.gatePairs.get(
                gate.__pairId
            );


        if (
            !pair ||
            pair.resolved
        ) {
            return;
        }


        gate.__resolved =
            true;


        this.resolveGatePair(
            gate.__pairId,
            gate
        );

    }


    applyGateEffect(gate) {

        const value =
            gate.__value;


        const positive =
            value > 0;


        if (
            gate.__effect ===
            "VOLLEY"
        ) {

            this.volley =
                Phaser.Math.Clamp(
                    this.volley +
                    value,

                    1,
                    12
                );

        } else if (
            gate.__effect ===
            "RATE"
        ) {

            this.rateTier =
                Phaser.Math.Clamp(
                    this.rateTier +
                    value,

                    -6,
                    18
                );

        } else if (
            gate.__effect ===
            "SPEED"
        ) {

            this.speedTier =
                Phaser.Math.Clamp(
                    this.speedTier +
                    value,

                    -6,
                    18
                );

        }


        try {

            this.sound.play(
                positive
                    ? "powerUp"
                    : "powerDown",

                {
                    volume: 0.18
                }
            );

        } catch (_) {}


        this.cameras.main.shake(

            positive
                ? 65
                : 105,

            positive
                ? 0.0025
                : 0.005

        );


        this.floatChallengeText(

            this.challengePlayer.x,

            this.challengePlayer.y -
            118,

            `${
                gate.__effect
            } ${
                this.formatGateValue(
                    value
                )
            }`,

            positive
                ? "#8dffae"
                : "#ff9ba2"

        );


        this.updateChallengeHUD();

    }


    currentShotInterval() {

        return Phaser.Math.Clamp(

            410 *
            Math.pow(
                0.91,
                this.rateTier
            ),

            82,

            680

        );

    }


    currentBulletSpeed() {

        return Phaser.Math.Clamp(

            700 +
            this.speedTier *
            55,

            340,

            1450

        );

    }


    shoot(time) {

        const interval =
            this.currentShotInterval();


        if (
            time <
            this.nextShotAt
        ) {
            return;
        }


        this.nextShotAt =
            time +
            interval;


        /*
            Actual archer shooting animation.
        */

        this.challengePlayer.play(
            "claim-archer-shoot",
            true
        );


        const projectileCount =
            this.volley;


        const spacing =
            projectileCount <= 1
                ? 0
                : Math.max(

                    9,

                    Math.min(
                        17,

                        155 /
                        (
                            projectileCount -
                            1
                        )
                    )

                );


        /*
            The archer is rotated upward.

            Its original right-hand bow area
            therefore becomes the upper muzzle.
        */

        const muzzleY =
            this.challengePlayer.y -
            54;


        for (
            let i = 0;
            i < projectileCount;
            i++
        ) {

            const offset =
                (
                    i -
                    (
                        projectileCount -
                        1
                    )
                    /
                    2
                )
                *
                spacing;


            const bullet =
                this.bullets.create(

                    this.challengePlayer.x +
                    offset,

                    muzzleY,

                    "claimArrow"

                )
                .setScale(0.62)
                .setAngle(-90)
                .setTint(0xffe36f)
                .setDepth(900);


            bullet.body.setAllowGravity(
                false
            );


            bullet.setVelocityY(
                -this.currentBulletSpeed()
            );


            bullet.__gateHits =
                new Set();

        }


        /*
            Tiny muzzle glint.
        */

        const flash =
            this.add.circle(
                this.challengePlayer.x,
                muzzleY - 8,
                8,
                0xffe36f,
                0.55
            )
            .setDepth(880);


        this.tweens.add({

            targets:
                flash,

            scale:
                0.1,

            alpha:
                0,

            duration:
                90,

            onComplete:
                () =>
                    flash.destroy()

        });


        try {

            this.sound.play(
                "arrowShot",

                {
                    volume:
                        0.055,

                    rate:
                        Phaser.Math
                            .FloatBetween(
                                1.10,
                                1.28
                            )
                }
            );

        } catch (_) {}

    }


    hitEnemy(
        bullet,
        enemy
    ) {

        if (
            this.challengeOver ||
            !bullet.active ||
            !enemy.active ||
            enemy.__resolved
        ) {
            return;
        }


        bullet.destroy();


        enemy.__hp--;


        try {

            this.sound.play(
                "enemyHit",

                {
                    volume:
                        0.07,

                    rate:
                        Phaser.Math
                            .FloatBetween(
                                1.0,
                                1.35
                            )
                }
            );

        } catch (_) {}


        enemy.setTintFill(
            0xffffff
        );


        this.time.delayedCall(
            50,

            () => {

                if (
                    enemy.active
                ) {

                    enemy.clearTint();


                    if (
                        enemy.__elite
                    ) {

                        enemy.setTint(
                            0xffd870
                        );

                    }

                }

            }
        );


        if (
            enemy.__hp <= 0
        ) {

            enemy.__resolved =
                true;


            this.defeatedEnemies++;


            this.burst(
                enemy.x,
                enemy.y,

                enemy.__elite
                    ? 0xffd870
                    : 0xdde4ef
            );


            enemy.destroy();


            this.updateChallengeHUD();

        }

    }


    breachEnemy(enemy) {

        if (
            !enemy.active ||
            enemy.__resolved
        ) {
            return;
        }


        enemy.__resolved =
            true;


        this.breachedEnemies++;


        this.integrity--;


        this.burst(
            enemy.x,
            990,
            0xff5964
        );


        enemy.destroy();


        this.refreshFenceVisual();


        try {

            this.sound.play(
                "fenceHit",

                {
                    volume:
                        0.16,

                    rate:
                        Phaser.Math
                            .FloatBetween(
                                0.9,
                                1.1
                            )
                }
            );

        } catch (_) {}


        this.cameras.main.shake(
            110,
            0.006
        );


        this.updateChallengeHUD();


        if (
            this.integrity <= 0
        ) {

            this.finishChallenge(
                false
            );

        }

    }


    refreshFenceVisual() {

        if (
            !this.fenceSprites
        ) {
            return;
        }


        for (
            const fence
            of this.fenceSprites
        ) {

            const alive =
                fence.__segment <
                this.integrity;


            fence.setAlpha(
                alive
                    ? 0.98
                    : 0.16
            );


            fence.setTint(
                alive
                    ? 0xffe1a1
                    : 0x6a3840
            );

        }

    }


    updateChallengeHUD() {

        if (!this.enemyHud) {
            return;
        }


        const remaining =
            Math.max(

                0,

                this.totalEnemies -
                this.defeatedEnemies -
                this.breachedEnemies

            );


        this.enemyHud.setText(
            `HORDE ${remaining}`
        );


        this.fireHud.setText(

            `×${this.volley}` +

            `  RATE ${
                this.rateTier >= 0
                    ? "+"
                    : ""
            }${this.rateTier}` +

            `  SPD ${
                this.speedTier >= 0
                    ? "+"
                    : ""
            }${this.speedTier}`

        );


        this.integrityHud.setText(

            `FENCE ${
                "■".repeat(
                    Math.max(
                        0,
                        this.integrity
                    )
                )
            }${
                "□".repeat(
                    Math.max(
                        0,

                        this.integrityMax -
                        this.integrity
                    )
                )
            }`

        );


        if (this.wallHud) {

            const done =
                this.resolvedGatePairs >=
                this.totalGatePairs;


            this.wallHud.setText(

                done
                    ? "GATES CLEAR"
                    : `GATE ${
                        Math.min(
                            this.resolvedGatePairs +
                            1,

                            this.totalGatePairs
                        )
                    } / ${
                        this.totalGatePairs
                    }`

            );

        }

    }


    burst(
        x,
        y,
        color
    ) {

        for (
            let i = 0;
            i < 7;
            i++
        ) {

            const p =
                this.add.rectangle(
                    x,
                    y,

                    Phaser.Math.Between(
                        5,
                        11
                    ),

                    Phaser.Math.Between(
                        5,
                        11
                    ),

                    color,

                    0.92
                )
                .setDepth(3000)
                .setAngle(
                    Phaser.Math.Between(
                        0,
                        180
                    )
                );


            const angle =
                Phaser.Math.FloatBetween(
                    0,
                    Math.PI * 2
                );


            const distance =
                Phaser.Math.Between(
                    25,
                    65
                );


            this.tweens.add({

                targets:
                    p,

                x:
                    x +
                    Math.cos(angle) *
                    distance,

                y:
                    y +
                    Math.sin(angle) *
                    distance,

                alpha:
                    0,

                angle:
                    p.angle +
                    Phaser.Math.Between(
                        80,
                        220
                    ),

                duration:
                    320,

                onComplete:
                    () =>
                        p.destroy()

            });

        }

    }


    floatChallengeText(
        x,
        y,
        text,
        color
    ) {

        const t =
            this.add.text(
                x,
                y,
                text,

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "20px",

                    color,

                    stroke:
                        "#101522",

                    strokeThickness:
                        5
                }
            )
            .setOrigin(0.5)
            .setDepth(5000);


        this.tweens.add({

            targets:
                t,

            y:
                y - 45,

            alpha:
                0,

            duration:
                650,

            onComplete:
                () =>
                    t.destroy()

        });

    }


    createResultButton(
        x,
        y,
        label,
        iconTexture,
        red,
        callback
    ) {

        const button =
            this.add.image(
                x,
                y,

                red
                    ? "uiRoundRed"
                    : "uiRoundBlue"
            )
            .setScale(0.82)
            .setDepth(20003)
            .setInteractive({
                useHandCursor: true
            });


        const icon =
            this.add.image(
                x,
                y - 3,
                iconTexture
            )
            .setScale(0.58)
            .setDepth(20004);


        const text =
            this.add.text(
                x,
                y + 69,
                label,

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "17px",

                    color:
                        "#ffffff",

                    stroke:
                        "#0b1018",

                    strokeThickness:
                        4
                }
            )
            .setOrigin(0.5)
            .setDepth(20004);


        button.on(
            "pointerover",
            () => {

                this.tweens.add({
                    targets: button,
                    scaleX: 0.86,
                    scaleY: 0.86,
                    duration: 65
                });

                this.tweens.add({
                    targets: icon,
                    scaleX: 0.62,
                    scaleY: 0.62,
                    duration: 65
                });

            }
        );


        button.on(
            "pointerout",
            () => {

                this.tweens.add({
                    targets: button,
                    scaleX: 0.82,
                    scaleY: 0.82,
                    duration: 65
                });

                this.tweens.add({
                    targets: icon,
                    scaleX: 0.58,
                    scaleY: 0.58,
                    duration: 65
                });

            }
        );


        button.on(
            "pointerdown",
            () => {

                button.setTexture(
                    red
                        ? "uiRoundRedPressed"
                        : "uiRoundBluePressed"
                );


                callback();

            }
        );


        return {
            button,
            icon,
            text
        };

    }


    finishChallenge(won) {

        if (
            this.challengeOver
        ) {
            return;
        }


        this.challengeOver =
            true;


        if (
            this.enemySpawnEvent
        ) {

            this.enemySpawnEvent
                .remove(false);

        }


        if (
            this.gateSpawnEvent
        ) {

            this.gateSpawnEvent
                .remove(false);

        }


        this.physics.pause();


        this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x070b12,
            0.82
        )
        .setDepth(20000)
        .setInteractive();


        if (won) {

            if (
                !this.saveData
                    .unlockedLots
                    .includes(
                        this.lotId
                    )
            ) {

                this.saveData
                    .unlockedLots
                    .push(
                        this.lotId
                    );


                this.saveData.valor =
                    (
                        this.saveData.valor ||
                        0
                    )
                    +
                    1;

            }


            this.saveData
                .openedClaimruns =
                    this.saveData
                        .openedClaimruns
                        .filter(
                            id =>
                                id !==
                                this.lotId
                        );


            persistSave(
                this.saveData
            );


            this.registry.set(
                "saveData",
                this.saveData
            );


            try {

                this.sound.play(
                    "confirm",

                    {
                        volume:
                            0.32,

                        rate:
                            1.05
                    }
                );

            } catch (_) {}


            this.add.text(
                GAME_WIDTH / 2,
                430,

                "CLAIM WON",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "58px",

                    color:
                        "#fff0a2",

                    stroke:
                        "#101522",

                    strokeThickness:
                        8
                }
            )
            .setOrigin(0.5)
            .setDepth(20001);


            this.add.text(
                GAME_WIDTH / 2,
                510,

                `${
                    this.lotId.toUpperCase()
                } IS YOURS`,

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "19px",

                    fontStyle:
                        "bold",

                    color:
                        "#d8ffc0"
                }
            )
            .setOrigin(0.5)
            .setDepth(20001);


            const rewardPlate =
                this.add.image(
                    GAME_WIDTH / 2 -
                    36,

                    592,

                    "uiTinyRoundBlue"
                )
                .setScale(0.82)
                .setDepth(20001);


            this.add.image(
                rewardPlate.x,
                rewardPlate.y,
                "uiValor"
            )
            .setScale(0.50)
            .setDepth(20002);


            this.add.text(
                GAME_WIDTH / 2 + 8,
                592,

                "+1",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "34px",

                    color:
                        "#87e8ff"
                }
            )
            .setOrigin(
                0,
                0.5
            )
            .setDepth(20002);


            this.time.delayedCall(
                1350,

                () => {

                    this.physics.resume();


                    this.cameras.main.fadeOut(
                        220,
                        8,
                        12,
                        20
                    );


                    this.time.delayedCall(
                        235,

                        () =>
                            this.scene.start(
                                "GameScene"
                            )
                    );

                }
            );

        } else {

            this.add.text(
                GAME_WIDTH / 2,
                392,

                "CLAIM FAILED",

                {
                    fontFamily:
                        FONT_DISPLAY,

                    fontSize:
                        "54px",

                    color:
                        "#ff9ba2",

                    stroke:
                        "#101522",

                    strokeThickness:
                        8
                }
            )
            .setOrigin(0.5)
            .setDepth(20001);


            this.add.text(
                GAME_WIDTH / 2,
                468,

                "ENTRY REMAINS PAID",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "18px",

                    fontStyle:
                        "bold",

                    color:
                        "#d7dde6"
                }
            )
            .setOrigin(0.5)
            .setDepth(20001);


            this.add.text(
                GAME_WIDTH / 2,
                502,

                "Retry this exact difficulty for free.",

                {
                    fontFamily:
                        FONT_BODY,

                    fontSize:
                        "15px",

                    fontStyle:
                        "bold",

                    color:
                        "#93a4b8"
                }
            )
            .setOrigin(0.5)
            .setDepth(20001);


            /*
                Asset-backed retry.

                Arcade physics resumes before
                restarting the scene.
            */

            this.createResultButton(

                280,
                650,

                "TRY AGAIN",

                "uiSword",

                false,

                () => {

                    this.physics.resume();

                    this.scene.restart({
                        lotId:
                            this.lotId
                    });

                }

            );


            this.createResultButton(

                440,
                650,

                "RETREAT",

                "uiTown",

                true,

                () => {

                    this.physics.resume();

                    this.scene.start(
                        "GameScene"
                    );

                }

            );

        }

    }


    update(
        time,
        delta
    ) {

        if (
            this.challengeOver
        ) {
            return;
        }


        /*
        ============================================================
        PLAYER MOVEMENT
        ============================================================
        */

        const left =
            this.claimKeys.left.isDown ||
            this.cursors.left.isDown;


        const right =
            this.claimKeys.right.isDown ||
            this.cursors.right.isDown;


        if (
            left ||
            right
        ) {

            const direction =
                (
                    right
                        ? 1
                        : 0
                )
                -
                (
                    left
                        ? 1
                        : 0
                );


            this.challengePlayer.x =
                Phaser.Math.Clamp(

                    this.challengePlayer.x +
                    direction *
                    7.5,

                    92,

                    GAME_WIDTH - 92

                );


            this.playerTargetX =
                this.challengePlayer.x;

        } else {

            this.challengePlayer.x =
                Phaser.Math.Linear(

                    this.challengePlayer.x,

                    this.playerTargetX,

                    0.22

                );

        }


        this.challengePlayer.body
            .updateFromGameObject();


        this.shoot(time);


        /*
        ============================================================
        BULLET CLEANUP
        ============================================================
        */

        for (
            const bullet
            of [
                ...this.bullets
                    .getChildren()
            ]
        ) {

            if (
                bullet.active &&
                bullet.y < 118
            ) {

                bullet.destroy();

            }

        }


        /*
        ============================================================
        ENEMY BREACHES
        ============================================================
        */

        for (
            const enemy
            of [
                ...this.enemies
                    .getChildren()
            ]
        ) {

            if (
                enemy.active &&
                enemy.y > 975
            ) {

                this.breachEnemy(
                    enemy
                );

            }

        }


        /*
        ============================================================
        GATE MOTION
        ============================================================

        The visible rectangle is explicitly
        moved every frame.

        Its Arcade body is then synchronized.
        ============================================================
        */

        const dt =
            Math.min(
                delta || 16.667,
                50
            )
            /
            1000;


        for (
            const gate
            of [
                ...this.gates
                    .getChildren()
            ]
        ) {

            if (
                !gate.active
            ) {
                continue;
            }


            gate.y +=
                gate.__speed *
                dt;


            gate.body
                .updateFromGameObject();


            this.syncGateVisual(
                gate
            );


            /*
                Manual player crossing detection.

                This avoids any dependency on
                Arcade update ordering.
            */

            const verticalTouch =

                gate.y +
                gate.height / 2

                >=

                this.challengePlayer.y -
                36

                &&

                gate.y -
                gate.height / 2

                <=

                this.challengePlayer.y +
                36;


            const horizontalTouch =

                Math.abs(
                    gate.x -
                    this.challengePlayer.x
                )

                <=

                gate.width / 2 +
                24;


            if (
                verticalTouch &&
                horizontalTouch
            ) {

                this.crossGate(
                    this.challengePlayer,
                    gate
                );

                continue;

            }


            /*
                Pip can deliberately dodge
                both panels and take no modifier.
            */

            if (
                gate.active &&
                gate.y > 1170
            ) {

                this.resolveGatePair(
                    gate.__pairId,
                    null
                );

            }

        }


        /*
        ============================================================
        WIN CHECK
        ============================================================
        */

        const hordeFinished =

            this.spawnedEnemies >=
            this.totalEnemies

            &&

            this.enemies
                .countActive(true)
            ===
            0;


        const wallsFinished =

            this.spawnedGatePairs >=
            this.totalGatePairs

            &&

            this.resolvedGatePairs >=
            this.totalGatePairs;


        if (
            hordeFinished &&
            wallsFinished &&
            this.integrity > 0
        ) {

            this.finishChallenge(
                true
            );

        }

    }

}



const config = {

    type:
        Phaser.AUTO,

    parent:
        "game-container",

    width:
        GAME_WIDTH,

    height:
        GAME_HEIGHT,

    backgroundColor:
        "#718955",

    pixelArt:
        true,

    antialias:
        false,

    roundPixels:
        true,


    physics: {

        default:
            "arcade",

        arcade: {

            gravity: {
                y: 0
            },

            debug:
                false

        }

    },


    scale: {

        mode:
            Phaser.Scale.FIT,

        autoCenter:
            Phaser.Scale.CENTER_BOTH,

        width:
            GAME_WIDTH,

        height:
            GAME_HEIGHT

    },


    input: {

        activePointers:
            3

    },


    scene: [
        GameScene,
        ClaimRunScene
    ]

};



/*
===============================================================================
FONT BOOT
===============================================================================

Only game.js changes.

The fonts are requested here instead of requiring
another <link> inside index.html.

If Google Fonts is unavailable, the fallback stacks
above keep everything functional.
===============================================================================
*/

async function loadGameFonts() {

    if (
        typeof document ===
        "undefined"
        ||
        !document.head
    ) {
        return;
    }


    try {

        const link =
            document.createElement(
                "link"
            );


        link.rel =
            "stylesheet";


        link.href =
            "https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;700;800;900&family=Pixelify+Sans:wght@500;600;700&display=swap";


        const stylesheetReady =
            new Promise(
                resolve => {

                    link.onload =
                        resolve;

                    link.onerror =
                        resolve;

                }
            );


        document.head.appendChild(
            link
        );


        await Promise.race([

            stylesheetReady,

            new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        900
                    )
            )

        ]);


        if (
            document.fonts?.load
        ) {

            await Promise.race([

                Promise.all([

                    document.fonts.load(
                        '24px "Lilita One"'
                    ),

                    document.fonts.load(
                        '16px "Nunito"'
                    ),

                    document.fonts.load(
                        '16px "Pixelify Sans"'
                    )

                ]),

                new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1600
                        )
                )

            ]);

        }

    } catch (_) {

        /*
            Offline fallback:
            nothing else required.
        */

    }

}



async function bootGame() {

    await loadGameFonts();

    new Phaser.Game(
        config
    );

}


bootGame();