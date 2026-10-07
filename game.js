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
- The Crankhouse: central clickable building. Each crank ejects a loose
  Glimmer pile; Valor upgrades the pile yield and passive clockwork production.
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
- Gold-ring Meadow Caches are one-time, persistent Glimmer finds scattered through
  the generated meadow.
- The first Claimruns are short and forgiving. Later runs add drifting Rift Walkers,
  armored elites and a named Meadow Titan boss.
- Chiptune music and extra feedback sounds are synthesized locally after the first
  input, so the game has audio without requiring additional downloads.
- UI direction: compact, asset-heavy, mobile-game-like, touch-first, with hover/tap
  explanations. Interactive buttons should use supplied UI art whenever practical.

IMPORTANT ASSET NOTES
- Tiny Swords Tree1.png contains clipped in-between foliage frames. Use Tree3 and
  Tree4 instead: their 192px cells are complete, self-contained trees.
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
    25,
    100,
    240,
    500,
    900,
    1500,
    2300,
    3400,
    5000,
    7000,
    9500
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
        crankLevel: 0,
        autoCrankLevel: 0,
        musicEnabled: true,
        sfxEnabled: true,
        unlockedLots: [],
        openedClaimruns: [],
        openedCaches: [],
        runWards: 0
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

        if (!Array.isArray(save.openedCaches)) {
            save.openedCaches = [];
        }

        save.crankLevel =
            Phaser.Math.Clamp(
                Math.floor(Number(save.crankLevel) || 0),
                0,
                8
            );

        save.autoCrankLevel =
            Phaser.Math.Clamp(
                Math.floor(Number(save.autoCrankLevel) || 0),
                0,
                5
            );

        save.glimmer =
            Math.max(0, Number(save.glimmer) || 0);

        save.valor =
            Math.max(0, Number(save.valor) || 0);

        save.runWards =
            Phaser.Math.Clamp(
                Math.floor(Number(save.runWards) || 0),
                0,
                3
            );

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


const AudioDirector = {

    context: null,
    master: null,
    musicGain: null,
    musicEnabled: true,
    sfxEnabled: true,
    musicTimer: null,
    musicStep: 0,
    unlocked: false,
    currentScene: null,
    currentMusicKey: null,
    currentAmbientKey: null,
    musicSound: null,
    ambientSound: null,

    setPreferences(save) {

        this.musicEnabled =
            save.musicEnabled !== false;

        this.sfxEnabled =
            save.sfxEnabled !== false;

        if (this.musicGain && this.context) {
            this.musicGain.gain.setTargetAtTime(
                this.musicEnabled ? 0.18 : 0,
                this.context.currentTime,
                0.12
            );
        }

        if (this.musicSound) {
            if (this.musicEnabled && !this.musicSound.isPlaying) {
                this.musicSound.play();
            }
            this.musicSound.setVolume(
                this.musicEnabled ? 0.14 : 0
            );
        }

        if (this.ambientSound) {
            if (this.sfxEnabled && !this.ambientSound.isPlaying) {
                this.ambientSound.play();
            }
            this.ambientSound.setVolume(
                this.sfxEnabled ? 0.035 : 0
            );
        }

    },

    unlock(save = null) {

        if (save) {
            this.setPreferences(save);
        }

        this.unlocked = true;

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            this.syncSceneAudio();
            return;
        }

        if (!this.context) {

            this.context =
                new AudioContextClass();

            this.master =
                this.context.createGain();

            this.master.gain.value = 0.65;
            this.master.connect(this.context.destination);

            this.musicGain =
                this.context.createGain();

            this.musicGain.gain.value =
                this.musicEnabled ? 0.18 : 0;

            this.musicGain.connect(this.master);

        }

        if (this.context.state === "suspended") {
            this.context.resume();
        }

        this.syncSceneAudio();

    },

    setSceneMusic(scene, musicKey, ambientKey) {

        this.currentScene = scene;
        this.currentMusicKey = musicKey;
        this.currentAmbientKey = ambientKey;

        this.syncSceneAudio();

    },

    syncSceneAudio() {

        if (!this.unlocked || !this.currentScene?.sound) {
            return;
        }

        if (this.musicSound) {
            this.musicSound.stop();
            this.musicSound.destroy();
            this.musicSound = null;
        }

        if (this.ambientSound) {
            this.ambientSound.stop();
            this.ambientSound.destroy();
            this.ambientSound = null;
        }

        if (this.currentMusicKey) {
            this.musicSound =
                this.currentScene.sound.add(
                    this.currentMusicKey,
                    {
                        loop: true,
                        volume: this.musicEnabled ? 0.14 : 0
                    }
                );

            if (this.musicEnabled) {
                this.musicSound.play();
            }
        }

        if (this.currentAmbientKey) {
            this.ambientSound =
                this.currentScene.sound.add(
                    this.currentAmbientKey,
                    {
                        loop: true,
                        volume: this.sfxEnabled ? 0.035 : 0
                    }
                );

            if (this.sfxEnabled) {
                this.ambientSound.play();
            }
        }

    },

    setMusicEnabled(enabled) {

        this.musicEnabled = enabled;

        if (this.musicGain && this.context) {
            this.musicGain.gain.setTargetAtTime(
                enabled ? 0.18 : 0,
                this.context.currentTime,
                0.12
            );
        }

        if (this.musicSound) {
            if (enabled && !this.musicSound.isPlaying) {
                this.musicSound.play();
            }
            this.musicSound.setVolume(enabled ? 0.14 : 0);
        }

    },

    playTone(
        frequency,
        duration = 0.12,
        waveform = "sine",
        volume = 0.1,
        destination = null
    ) {

        if (
            !this.context ||
            (!destination && !this.sfxEnabled) ||
            this.context.state !== "running"
        ) {
            return;
        }

        const now = this.context.currentTime;
        const oscillator =
            this.context.createOscillator();
        const gain =
            this.context.createGain();

        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(
            frequency,
            now
        );

        gain.gain.setValueAtTime(
            Math.max(0.0001, volume),
            now
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + duration
        );

        oscillator.connect(gain);
        gain.connect(destination || this.master);
        oscillator.start(now);
        oscillator.stop(now + duration);

    },

    playMusicStep() {

        if (
            !this.musicEnabled ||
            !this.context ||
            this.context.state !== "running"
        ) {
            return;
        }

        const melody = [
            392, 494, 587, 494,
            440, 587, 659, 587,
            392, 494, 587, 784,
            659, 587, 494, 440
        ];

        const note =
            melody[this.musicStep % melody.length];

        this.playTone(
            note,
            0.27,
            "triangle",
            0.16,
            this.musicGain
        );

        if (this.musicStep % 4 === 0) {
            const bassNotes = [98, 110, 82, 123];
            this.playTone(
                bassNotes[
                    Math.floor(this.musicStep / 4) %
                    bassNotes.length
                ],
                0.48,
                "sine",
                0.12,
                this.musicGain
            );
        }

        this.musicStep++;

    },

    playEffect(kind) {

        const effects = {
            crank: [523, 0.09, "square", 0.045],
            pickup: [880, 0.16, "sine", 0.075],
            upgrade: [659, 0.22, "triangle", 0.10],
            click: [740, 0.07, "square", 0.035],
            hit: [165, 0.12, "sawtooth", 0.055],
            gate: [1046, 0.18, "triangle", 0.07],
            breach: [110, 0.25, "sawtooth", 0.08],
            win: [1175, 0.32, "triangle", 0.12]
        };

        const effect = effects[kind];

        if (effect) {
            this.playTone(...effect);
        }

        if (
            kind === "upgrade" ||
            kind === "win"
        ) {
            this.playTone(
                kind === "win" ? 1568 : 988,
                0.22,
                "triangle",
                0.08
            );
        }

    }

};



const ASSETS = {

    crankhouse:
        "assets/images/environment/buildings/tiny_swords/Blue Buildings/House1.png",

    pipIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Idle.png",

    pipRun:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Run.png",

    crankhandIdle:
        "assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Idle Hammer.png",

    glimmer:
        "assets/images/environment/resources/tiny_swords/Gold/Gold Resource/Gold_Resource.png",


    oakTree:
        "assets/images/environment/decorations/cute_fantasy/Oak_Tree.png",

    oakClump:
        "assets/images/environment/decorations/cute_fantasy/Oak_Tree_Small.png",

    treeStrip:
        "assets/images/environment/resources/tiny_swords/Wood/Trees/Tree4.png",

    autumnTreeStrip:
        "assets/images/environment/resources/tiny_swords/Wood/Trees/Tree3.png",

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
        "assets/audio/sfx/ui/synth_confirmation.wav",

    meadowTheme:
        "assets/audio/music/loop_music8.ogg",

    claimrunTheme:
        "assets/audio/music/loop_music32.ogg",

    meadowWind:
        "assets/audio/sfx/environment/ambient_wind.wav",

    cacheOpen:
        "assets/audio/sfx/materials/wood_small_gather.wav"

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
            "uiSword",
            ASSETS.uiSword
        );

        this.load.image(
            "uiValor",
            ASSETS.uiValor
        );

        this.load.image(
            "uiBuild",
            ASSETS.uiBuild
        );

        this.load.image(
            "uiSettings",
            ASSETS.uiSettings
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
                frameWidth: 192,
                frameHeight: 192
            }
        );

        this.load.spritesheet(
            "fieldTreesAutumn",
            ASSETS.autumnTreeStrip,
            {
                frameWidth: 192,
                frameHeight: 192
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
            "crankhandIdle",
            ASSETS.crankhandIdle,
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
            "confirm",
            ASSETS.confirm
        );

        this.load.audio(
            "meadowTheme",
            ASSETS.meadowTheme
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

        if (!Array.isArray(this.saveData.openedCaches)) {
            this.saveData.openedCaches = [];
        }

        this.saveData.crankLevel =
            Phaser.Math.Clamp(
                Math.floor(Number(this.saveData.crankLevel) || 0),
                0,
                8
            );

        this.saveData.autoCrankLevel =
            Phaser.Math.Clamp(
                Math.floor(Number(this.saveData.autoCrankLevel) || 0),
                0,
                5
            );

        this.saveData.runWards =
            Phaser.Math.Clamp(
                Math.floor(Number(this.saveData.runWards) || 0),
                0,
                3
            );

        if (typeof this.saveData.musicEnabled !== "boolean") {
            this.saveData.musicEnabled = true;
        }

        if (typeof this.saveData.sfxEnabled !== "boolean") {
            this.saveData.sfxEnabled = true;
        }


        this.registry.set(
            "saveData",
            this.saveData
        );


        this.glimmerOwned =
            this.saveData.glimmer || 0;

        this.glimmerLoose = [];
        this.fieldCaches = [];
        this.cacheSerial = 0;
        this.nextCacheSpawnAt = 0;

        this.moveTarget = null;

        this.claimrunLaunching = false;
        this.crankStreak = 0;
        this.lastCrankAt = 0;
        this.hudActions = [];
        this.hubActionZones = [];

        AudioDirector.setPreferences(
            this.saveData
        );
        AudioDirector.setSceneMusic(
            this,
            "meadowTheme",
            "meadowWind"
        );
        this.loadMeadowAudio();

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

        this.createWorldAtmosphere();

        this.createCrankhouse();

        this.createPip();
        this.spawnFieldCache(true);

        this.createAnimations();
        this.createCrankhouseHelpers();

        this.createActiveGhostlotPrompt();
        this.createCrankhousePrompt();

        this.createInput();

        this.createHUD();

        this.startAutoCrank();

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

        g.fillStyle(0x718b54, 1);
        g.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

        const rng =
            this.makeRng(
                0x4e554c4c
            );

        for (
            let i = 0;
            i < 240;
            i++
        ) {

            const x =
                rng() * WORLD_SIZE;

            const y =
                rng() * WORLD_SIZE;

            const palette = [
                0x526f49,
                0x84965e,
                0x9b9764,
                0x617b4d
            ];

            g.fillStyle(
                palette[Math.floor(rng() * palette.length)],
                0.09 + rng() * 0.10
            );

            g.fillEllipse(
                x,
                y,
                100 + rng() * 260,
                54 + rng() * 170
            );

        }

        for (let route = 0; route < 12; route++) {

            const startX = 100 + rng() * (WORLD_SIZE - 200);
            const startY = 100 + rng() * (WORLD_SIZE - 200);
            const angle = rng() * Math.PI * 2;
            const length = 180 + rng() * 360;
            const bend = (rng() - 0.5) * 160;
            const points = [];

            for (let step = 0; step <= 8; step++) {
                const t = step / 8;
                const sideways =
                    Math.sin(t * Math.PI) * bend;

                points.push({
                    x: Phaser.Math.Clamp(
                        startX +
                        Math.cos(angle) * length * t -
                        Math.sin(angle) * sideways,
                        45,
                        WORLD_SIZE - 45
                    ),
                    y: Phaser.Math.Clamp(
                        startY +
                        Math.sin(angle) * length * t +
                        Math.cos(angle) * sideways,
                        45,
                        WORLD_SIZE - 45
                    )
                });
            }

            for (const [width, color, alpha] of [
                [30, 0x594f39, 0.10],
                [12, 0xc1a675, 0.12]
            ]) {
                g.lineStyle(width, color, alpha);
                g.beginPath();
                g.moveTo(points[0].x, points[0].y);

                for (let i = 1; i < points.length; i++) {
                    g.lineTo(points[i].x, points[i].y);
                }

                g.strokePath();
            }
        }

        for (let i = 0; i < 880; i++) {
            const x = 18 + rng() * (WORLD_SIZE - 36);
            const y = 18 + rng() * (WORLD_SIZE - 36);
            const radius = 1.2 + rng() * 3.8;

            g.fillStyle(
                rng() > 0.54 ? 0x405f40 : 0xd3bd83,
                0.14 + rng() * 0.15
            );
            g.fillCircle(x, y, radius);
        }

    }


    createWorldAtmosphere() {

        this.worldMotes = [];

        const rng =
            this.makeRng(
                0x4d4f5445
            );

        for (
            let i = 0;
            i < 48;
            i++
        ) {

            const x =
                90 +
                rng() *
                (WORLD_SIZE - 180);

            const y =
                90 +
                rng() *
                (WORLD_SIZE - 180);

            const mote =
                this.add.circle(
                    x,
                    y,
                    2 + rng() * 3,
                    rng() < 0.45
                        ? 0xfff2af
                        : 0xaee8ff,
                    0.42 + rng() * 0.4
                )
                .setDepth(-230)
                .setAlpha(0.3 + rng() * 0.5);

            this.worldMotes.push({
                body: mote,
                x,
                y,
                driftX: 
                    Phaser.Math.FloatBetween(
                        -18,
                        18
                    ),
                driftY:
                    Phaser.Math.FloatBetween(
                        -18,
                        18
                    ),
                phase:
                    rng() * Math.PI * 2
            });

        }

    }


    updateWorldAtmosphere() {

        if (!this.worldMotes) {
            return;
        }

        const time =
            this.time.now * 0.0008;

        for (const mote of this.worldMotes) {

            const driftX =
                Math.sin(
                    time +
                    mote.phase
                ) *
                mote.driftX;

            const driftY =
                Math.cos(
                    time * 1.15 +
                    mote.phase
                ) *
                mote.driftY;

            const x =
                Phaser.Math.Wrap(
                    mote.x +
                    driftX,
                    0,
                    WORLD_SIZE
                );

            const y =
                Phaser.Math.Wrap(
                    mote.y +
                    driftY,
                    0,
                    WORLD_SIZE
                );

            mote.body.setPosition(
                x,
                y
            );

            mote.body.setAlpha(
                0.25 +
                Math.sin(
                    time * 3 +
                    mote.phase
                ) *
                0.22 +
                0.18
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

                const treeTexture =
                    rng() < 0.35
                        ? "fieldTreesAutumn"
                        : "fieldTrees";

                obj =
                    this.add.sprite(
                        x,
                        y,
                        treeTexture,

                        Math.floor(rng() * 8)
                    )
                    .setScale(
                        0.42 +
                        rng() * 0.12
                    );
                obj.setOrigin(0.5, 0.95);

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
                        "oakClump"
                    )
                    .setScale(
                        0.85 +
                        rng() * 0.35
                    );

            }


            obj
                .setDepth(
                    y +
                    (
                        obj.texture.key === "fieldTrees"
                        || obj.texture.key === "fieldTreesAutumn"
                            ? 28
                            : 4
                    )
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


        this.createForestClusters(rng);
        this.createRockyAreas(rng);
        this.createMeadowPlots(rng);

    }


    createForestClusters(rng) {

        let clusters = 0;

        for (let attempt = 0; attempt < 70 && clusters < 13; attempt++) {

            const angle = rng() * Math.PI * 2;
            const radius = 320 + rng() * 1050;
            const centerX = Phaser.Math.Clamp(
                this.worldCenter.x + Math.cos(angle) * radius,
                180,
                WORLD_SIZE - 180
            );
            const centerY = Phaser.Math.Clamp(
                this.worldCenter.y + Math.sin(angle) * radius,
                180,
                WORLD_SIZE - 180
            );

            const blocked = this.ghostlots.some(lot =>
                Phaser.Math.Distance.Between(
                    centerX,
                    centerY,
                    lot.x,
                    lot.y
                ) < lot.size * 0.95
            );

            if (
                blocked ||
                Phaser.Math.Distance.Between(
                    centerX,
                    centerY,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 300
            ) {
                continue;
            }

            const count = 6 + Math.floor(rng() * 8);

            for (let i = 0; i < count; i++) {
                const spread = 35 + rng() * 150;
                const treeX = Phaser.Math.Clamp(
                    centerX + (rng() - 0.5) * spread * 2,
                    100,
                    WORLD_SIZE - 100
                );
                const treeY = Phaser.Math.Clamp(
                    centerY + (rng() - 0.5) * spread * 2,
                    100,
                    WORLD_SIZE - 100
                );

                const nearLot = this.ghostlots.some(lot =>
                    Phaser.Math.Distance.Between(
                        treeX,
                        treeY,
                        lot.x,
                        lot.y
                    ) < lot.size * 0.72
                );

                if (nearLot) {
                    continue;
                }

                this.add.ellipse(
                    treeX,
                    treeY + 4,
                    38,
                    12,
                    0x233328,
                    0.14
                ).setDepth(treeY - 2);

                const tree =
                    this.add.sprite(
                        treeX,
                        treeY,
                        rng() < 0.36
                            ? "fieldTreesAutumn"
                            : "fieldTrees",
                        Math.floor(rng() * 8)
                    )
                    .setOrigin(0.5, 0.95)
                    .setScale(0.40 + rng() * 0.16)
                    .setDepth(treeY + 12);

                if (rng() < 0.28) {
                    tree.setTint(0xb6c87b);
                }
            }

            clusters++;
        }

    }


    createRockyAreas(rng) {

        const rockTextures = [
            "rock1",
            "rock2",
            "rock3",
            "rock4"
        ];

        let areas = 0;

        for (let attempt = 0; attempt < 55 && areas < 8; attempt++) {

            const angle = rng() * Math.PI * 2;
            const radius = 350 + rng() * 1000;
            const centerX = Phaser.Math.Clamp(
                this.worldCenter.x + Math.cos(angle) * radius,
                160,
                WORLD_SIZE - 160
            );
            const centerY = Phaser.Math.Clamp(
                this.worldCenter.y + Math.sin(angle) * radius,
                160,
                WORLD_SIZE - 160
            );

            if (
                Phaser.Math.Distance.Between(
                    centerX,
                    centerY,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 290 ||
                this.ghostlots.some(lot =>
                    Phaser.Math.Distance.Between(
                        centerX,
                        centerY,
                        lot.x,
                        lot.y
                    ) < lot.size * 0.85
                )
            ) {
                continue;
            }

            const areaRadius = 80 + rng() * 85;

            this.add.ellipse(
                centerX,
                centerY,
                areaRadius * 2.4,
                areaRadius * 1.5,
                0x787b69,
                0.22
            ).setDepth(-155);

            const count = 8 + Math.floor(rng() * 10);

            for (let i = 0; i < count; i++) {
                const rock =
                    this.add.image(
                        centerX + (rng() - 0.5) * areaRadius * 2,
                        centerY + (rng() - 0.5) * areaRadius * 1.5,
                        rockTextures[
                            Math.floor(rng() * rockTextures.length)
                        ]
                    )
                    .setScale(0.38 + rng() * 0.55)
                    .setDepth(centerY + (rng() - 0.5) * 80);

                if (rng() < 0.5) {
                    rock.setFlipX(true);
                }
            }

            areas++;
        }

    }


    createMeadowPlots(rng) {

        const halfWidth = 112;
        const halfHeight = 76;
        let created = 0;

        for (let attempt = 0; attempt < 50 && created < 4; attempt++) {

            const angle = rng() * Math.PI * 2;
            const radius = 420 + rng() * 520;
            const x = Phaser.Math.Clamp(
                this.worldCenter.x + Math.cos(angle) * radius,
                halfWidth + 90,
                WORLD_SIZE - halfWidth - 90
            );
            const y = Phaser.Math.Clamp(
                this.worldCenter.y + Math.sin(angle) * radius,
                halfHeight + 90,
                WORLD_SIZE - halfHeight - 90
            );

            const overlapsLot = this.ghostlots.some(lot =>
                x + halfWidth + 30 > lot.rect.x &&
                x - halfWidth - 30 < lot.rect.right &&
                y + halfHeight + 30 > lot.rect.y &&
                y - halfHeight - 30 < lot.rect.bottom
            );

            if (
                overlapsLot ||
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 350
            ) {
                continue;
            }

            const bed =
                this.add.graphics()
                    .setDepth(-150);

            bed.fillStyle(0x594d37, 0.72);
            bed.fillRoundedRect(
                x - 82,
                y - 50,
                164,
                100,
                18
            );

            for (let row = 0; row < 3; row++) {
                bed.fillStyle(
                    row % 2 ? 0x786344 : 0x66563a,
                    0.82
                );
                bed.fillRoundedRect(
                    x - 70,
                    y - 35 + row * 34,
                    140,
                    9,
                    4
                );

                const cropArt =
                    this.add.graphics()
                        .setDepth(y - 12 + row * 34);

                for (let column = 0; column < 5; column++) {
                    const cropX =
                        x - 60 + column * 30;

                    const cropY =
                        y - 38 + row * 34;

                    const leafColor = [
                        0x8ba94d,
                        0x9caf55,
                        0x72994a,
                        0xb5b95e
                    ][Math.floor(rng() * 4)];

                    cropArt.lineStyle(2, 0x435f39, 0.9);
                    cropArt.lineBetween(
                        cropX,
                        cropY + 8,
                        cropX,
                        cropY - 5
                    );
                    cropArt.fillStyle(leafColor, 0.96);
                    cropArt.fillEllipse(
                        cropX - 4,
                        cropY - 5,
                        9,
                        5
                    );
                    cropArt.fillEllipse(
                        cropX + 4,
                        cropY - 8,
                        9,
                        5
                    );

                    if (rng() < 0.24) {
                        const fruitColor =
                            rng() < 0.5
                                ? 0xe07a4d
                                : 0xe5c85a;

                        cropArt.fillStyle(fruitColor, 0.96);
                        cropArt.fillCircle(
                            cropX,
                            cropY - 11,
                            2.6
                        );
                        cropArt.fillStyle(0xffefae, 0.72);
                        cropArt.fillCircle(
                            cropX - 0.8,
                            cropY - 11.8,
                            0.8
                        );
                    }
                }
            }

            for (let segment = 0; segment < 9; segment++) {
                const fx = x - 108 + segment * 27;

                this.add.sprite(fx, y - halfHeight, "fenceTiles", 2)
                    .setScale(1.55)
                    .setDepth(y - halfHeight - 4);

                if (segment !== 4) {
                    this.add.sprite(fx, y + halfHeight, "fenceTiles", 2)
                        .setScale(1.55)
                        .setDepth(y + halfHeight - 4);
                }
            }

            for (let segment = 1; segment < 5; segment++) {
                const fy = y - halfHeight + segment * 27;

                this.add.sprite(x - halfWidth, fy, "fenceTiles", 4)
                    .setScale(1.55)
                    .setDepth(fy - 4);

                this.add.sprite(x + halfWidth, fy, "fenceTiles", 4)
                    .setScale(1.55)
                    .setDepth(fy - 4);
            }

            created++;
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

        this.crankhouse.__blocksWorldInput =
            true;


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

                "TAP OR PRESS E • +1",

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


    createCrankhousePrompt() {

        const root =
            this.add.container(
                this.worldCenter.x,
                this.worldCenter.y - 224
            )
            .setDepth(50001)
            .setVisible(false);

        const bubble =
            this.add.graphics();

        bubble.fillStyle(THEME.ink, 0.97);
        bubble.fillRoundedRect(-137, -44, 274, 88, 20);
        bubble.lineStyle(3, THEME.cyan, 0.78);
        bubble.strokeRoundedRect(-137, -44, 274, 88, 20);
        bubble.fillStyle(THEME.ink, 0.97);
        bubble.fillTriangle(-12, 44, 12, 44, 0, 60);

        const heading =
            this.add.text(
                -112,
                -27,
                "UPGRADES",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "20px",
                    color: "#fff0a2"
                }
            );

        const valorIcon =
            this.add.image(-99, 15, "uiValor")
                .setScale(0.35);

        const subtitle =
            this.add.text(
                -80,
                5,
                "CRANKHOUSE",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "11px",
                    fontStyle: "bold",
                    color: "#b6c7d5"
                }
            );

        const button =
            this.add.image(95, 0, "uiRoundBlue")
                .setScale(0.60)
                .setInteractive({
                    useHandCursor: true
                });

        button.__blocksWorldInput = true;

        const icon =
            this.add.image(95, 0, "uiBuild")
                .setScale(0.48);

        root.add([
            bubble,
            heading,
            valorIcon,
            subtitle,
            button,
            icon
        ]);

        this.crankhouseUpgradePrompt = root;
        this.crankhouseUpgradePromptX =
            this.worldCenter.x;
        this.crankhouseUpgradePromptY =
            this.worldCenter.y - 224;

    }


    updateCrankhousePrompt() {

        if (!this.crankhouseUpgradePrompt || !this.player) {
            return;
        }

        const nearby =
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.worldCenter.x,
                this.worldCenter.y
            ) < 250;

        this.crankhouseUpgradePrompt.setVisible(
            nearby && !this.hubPanel
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


        for (const [key, texture, end, frameRate] of [
            ["crankhand-sleep", "crankhandIdle", 7, 5],
            ["crankhand-run", "pipRun", 5, 10],
            ["crankhand-work", "crankhandIdle", 7, 9]
        ]) {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(
                        texture,
                        {
                            start: 0,
                            end
                        }
                    ),
                    frameRate,
                    repeat: -1
                });
            }
        }


        this.player.play(
            "pip-idle"
        );

    }


    createCrankhouseHelpers() {

        this.crankhouseHelpers = [];

        const helperSpots = [
            {
                x: this.worldCenter.x - 166,
                y: this.worldCenter.y + 136,
                restX: this.worldCenter.x - 166,
                restY: this.worldCenter.y + 129,
                workX: this.worldCenter.x - 45,
                tint: 0xd8efff
            },
            {
                x: this.worldCenter.x + 166,
                y: this.worldCenter.y + 142,
                restX: this.worldCenter.x + 166,
                restY: this.worldCenter.y + 135,
                workX: this.worldCenter.x + 45,
                tint: 0xffdfaf
            }
        ];

        for (const spot of helperSpots) {
            const offsetX =
                Phaser.Math.Between(-24, 24);
            const offsetY =
                Phaser.Math.Between(-14, 14);

            spot.x += offsetX;
            spot.restX += offsetX;
            spot.y += offsetY;
            spot.restY += offsetY;
        }

        for (const [index, spot] of helperSpots.entries()) {
            this.add.ellipse(
                spot.x,
                spot.y + 7,
                78,
                35,
                0x16251c,
                0.19
            )
            .setDepth(spot.y - 4);

            const bedroll =
                this.add.graphics()
                    .setDepth(spot.y - 3);

            bedroll.fillStyle(
                index === 0 ? 0x678a83 : 0x9b7858,
                0.96
            );
            bedroll.fillRoundedRect(
                spot.x - 32,
                spot.y - 10,
                64,
                22,
                9
            );
            bedroll.lineStyle(
                2,
                index === 0 ? 0xb6d8c5 : 0xe4c593,
                0.84
            );
            bedroll.strokeRoundedRect(
                spot.x - 32,
                spot.y - 10,
                64,
                22,
                9
            );
            bedroll.lineBetween(
                spot.x + 15,
                spot.y - 7,
                spot.x + 15,
                spot.y + 8
            );

            const sprite =
                this.add.sprite(
                    spot.x,
                    spot.y - 7,
                    "crankhandIdle",
                    0
                )
                .setOrigin(0.5, 0.72)
                .setScale(0.33)
                .setTint(spot.tint)
                .setAngle(90)
                .setDepth(spot.y + 8)
                .play("crankhand-sleep");

            const zzz =
                this.add.text(
                    spot.x + 22,
                    spot.y - 34,
                    "Z",
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "17px",
                        color: "#f6edc7",
                        stroke: "#28372c",
                        strokeThickness: 3
                    }
                )
                .setDepth(spot.y + 12)
                .setAlpha(0.82);

            this.tweens.add({
                targets: zzz,
                y: zzz.y - 8,
                alpha: 0.35,
                duration: 900 + index * 180,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut"
            });

            this.crankhouseHelpers.push({
                ...spot,
                sprite,
                zzz,
                busy: false
            });
        }

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
            .setScale(0.72);

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
                    "RETRY"
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
                        ? "ONE-TIME ENTRY"
                        : "NEED MORE"
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
                    0.72
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

        this.input.once(
            "pointerdown",
            () => AudioDirector.unlock(this.saveData)
        );

        this.input.keyboard.once(
            "keydown",
            () => AudioDirector.unlock(this.saveData)
        );

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

        this.crankKey =
            this.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.E
            );


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

                if (this.hubPanel) {

                    const zone =
                        this.hubActionZones
                            .slice()
                            .reverse()
                            .find(action =>
                                Math.abs(pointer.x - action.x) <=
                                    action.width / 2 &&
                                Math.abs(pointer.y - action.y) <=
                                    action.height / 2
                            );

                    if (zone) {
                        zone.callback();
                    } else {
                        this.closeHubPanel();
                    }

                    return;

                }

                if (this.crankhouseUpgradePrompt?.visible) {
                    const pointerWorld =
                        pointer.positionToCamera(
                            this.cameras.main
                        );

                    if (
                        Phaser.Math.Distance.Between(
                            pointerWorld.x,
                            pointerWorld.y,
                            this.crankhouseUpgradePromptX + 95,
                            this.crankhouseUpgradePromptY
                        ) <= 48
                    ) {
                        AudioDirector.playEffect("click");
                        this.openCrankhousePanel();
                        return;
                    }
                }

                const clickedCache =
                    currentlyOver &&
                    currentlyOver.find(
                        object => object?.__cacheId
                    );

                if (clickedCache) {
                    this.openFieldCache(clickedCache);
                    return;
                }


                const hudAction =
                    this.hudActions
                        .slice()
                        .reverse()
                        .find(action =>
                            Phaser.Math.Distance.Between(
                                pointer.x,
                                pointer.y,
                                action.x,
                                action.y
                            ) <= action.radius
                        );

                if (hudAction) {
                    AudioDirector.playEffect("click");
                    hudAction.callback();
                    return;
                }


                if (this.activeGhostlot) {

                    const pointerWorld =
                        pointer.positionToCamera(
                            this.cameras.main
                        );

                    const promptX =
                        this.activeGhostlot.x + 108;

                    const promptY =
                        this.activeGhostlot.y -
                        this.activeGhostlot.size / 2 -
                        108;

                    if (
                        this.ghostlotPrompt?.visible &&
                        Phaser.Math.Distance.Between(
                            pointerWorld.x,
                            pointerWorld.y,
                            promptX,
                            promptY
                        ) <= 42
                    ) {
                        this.beginClaimrun();
                        return;
                    }

                }


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
                        "24px",

                    color:
                        "#e9f2cc"
                }
            )

        );


        this.hubStatusText =
            this.add.text(
                35,
                53,

                "CRANKHOUSE • LEVEL 0",

                {
                    fontFamily:
                        FONT_TECH,

                    fontSize:
                        "10px",

                    fontStyle:
                        "bold",

                    color:
                        "#77889b"
                }
            );

        this.hudRoot.add(
            this.hubStatusText
        );


        /*
        ============================================================
        WALLET
        ============================================================
        */

        this.glimmerHud =
            this.createCurrencyChip(
                430,
                53,
                "glimmer",
                0.46,

                "Glimmer",

                "Glimmer"
            );


        this.valorHud =
            this.createCurrencyChip(
                558,
                53,
                "uiValor",
                0.44,

                    "Valor",

                    "Valor"
            );

            this.createHudIconButton(
                670,
                53,
                "uiSettings",
                "Settings",
                "Music, sound and camera controls.",
                false,
                () => this.openSettingsPanel()
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


        this.objectiveIcon =
            this.add.image(
                105,
                GAME_HEIGHT - 48,
                "uiSword"
            )
            .setScale(0.36);


        this.hudRoot.add(
            this.objectiveIcon
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
                        "17px",

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
                        "13px",

                    fontStyle:
                        "bold",

                    color:
                        "#94a2ae"
                }
            );


        this.hudRoot.add(
            this.objectiveSubText
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
            ;


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
                        "24px",

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
        disabled = false,
        callback = null
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

        if (!disabled && callback) {

            this.hudActions.push({
                x,
                y,
                radius: 34,
                callback
            });

        }


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


    walkTo(x, y) {

        this.moveTarget =
            new Phaser.Math.Vector2(
                Phaser.Math.Clamp(x, 40, WORLD_SIZE - 40),
                Phaser.Math.Clamp(y, 40, WORLD_SIZE - 40)
            );

        this.drawTargetMarker(
            this.moveTarget.x,
            this.moveTarget.y
        );

    }


    closeHubPanel() {

        if (this.hubPanel) {
            this.hubPanel.destroy(true);
            this.hubPanel = null;
        }

        this.hubActionZones = [];

    }


    openHubPanel(title, subtitle, rows) {

        this.closeHubPanel();

        const root =
            this.add.container(0, 0)
                .setDepth(150000);

        root.__blocksWorldInput = true;

        const shade =
            this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x050911,
                0.76
            );

        shade.__blocksWorldInput = true;

        this.hubActionZones = [];

        const rowCount = Math.min(rows.length, 3);
        const panelTop = rowCount <= 2 ? 360 : 325;
        const panelHeight = rowCount <= 2 ? 560 : 630;

        const panel =
            this.add.graphics();

        panel.fillStyle(0x0d1724, 0.99);
        panel.fillRoundedRect(42, panelTop, 636, panelHeight, 28);
        panel.lineStyle(3, THEME.gold, 0.55);
        panel.strokeRoundedRect(42, panelTop, 636, panelHeight, 28);
        panel.lineStyle(2, 0xffffff, 0.08);
        panel.lineBetween(68, panelTop + 122, 652, panelTop + 122);

        const heading =
            this.add.text(
                GAME_WIDTH / 2,
                panelTop + 40,
                title,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "34px",
                    color: "#fff0a2",
                    align: "center",
                    wordWrap: { width: 560 }
                }
            )
            .setOrigin(0.5);

        const detail =
            this.add.text(
                GAME_WIDTH / 2,
                panelTop + 82,
                subtitle,
                {
                    fontFamily: FONT_BODY,
                    fontSize: "17px",
                    fontStyle: "bold",
                    color: "#bdc9d5",
                    align: "center",
                    wordWrap: { width: 540 }
                }
            )
            .setOrigin(0.5, 0);

        root.add([
            shade,
            panel,
            heading,
            detail
        ]);

        rows.slice(0, rowCount).forEach((row, index) => {

            const y = panelTop + 182 + index * 116;
            const card =
                this.add.graphics();

            card.fillStyle(
                row.ready === false
                    ? 0x241e28
                    : 0x172638,
                0.98
            );
            card.fillRoundedRect(70, y - 44, 580, 96, 18);
            card.lineStyle(
                2,
                row.ready === false
                    ? THEME.red
                    : THEME.cyan,
                0.28
            );
            card.strokeRoundedRect(70, y - 44, 580, 96, 18);

            const titleText =
                this.add.text(
                    92,
                    y - 30,
                    row.title,
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "22px",
                        color: row.ready === false
                            ? "#ffabb3"
                            : "#eff4e8"
                    }
                );

            const descriptionText =
                this.add.text(
                    92,
                    y - 3,
                    row.description,
                    {
                        fontFamily: FONT_BODY,
                        fontSize: "15px",
                        fontStyle: "bold",
                        color: "#aebdca",
                        wordWrap: { width: 370 },
                        lineSpacing: 1
                    }
                );

            const actionText =
                this.add.text(
                    640,
                    y - 15,
                    row.action || "OPEN",
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "13px",
                        color: row.ready === false
                            ? "#ff9da8"
                            : "#ffd660"
                    }
                )
                .setOrigin(1, 0.5);

            const rowChildren = [
                card,
                titleText,
                descriptionText,
                actionText
            ];

            if (
                row.currencyIcon &&
                Number.isFinite(row.costAmount)
            ) {
                const costIcon =
                    this.add.image(
                        566,
                        y + 18,
                        row.currencyIcon
                    )
                    .setScale(0.30);

                const costAmount =
                    this.add.text(
                        584,
                        y + 18,
                        compactAmount(row.costAmount),
                        {
                            fontFamily: FONT_DISPLAY,
                            fontSize: "19px",
                            color: row.ready === false
                                ? "#ff9da8"
                                : "#ffd660"
                        }
                    )
                    .setOrigin(0, 0.5);

                rowChildren.push(costIcon, costAmount);
            }

            root.add(rowChildren);

            this.hubActionZones.push({
                x: 360,
                y: y + 4,
                width: 580,
                height: 96,
                callback: () => {
                    if (row.ready === false) {
                        AudioDirector.playEffect("hit");
                        this.showHudToast(
                            row.lockedMessage ||
                            "You need more Valor for that upgrade."
                        );
                        return;
                    }

                    AudioDirector.playEffect("click");
                    row.callback?.();
                }
            });

        });

        const closeButton =
            this.add.image(
                GAME_WIDTH / 2,
                panelTop + panelHeight - 52,
                "uiRoundBlue"
            )
            .setScale(0.78)
            ;

        closeButton.__blocksWorldInput = true;

        const closeLabel =
            this.add.text(
                GAME_WIDTH / 2,
                panelTop + panelHeight - 52,
                "BACK",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "18px",
                    color: "#ffffff"
                }
            )
            .setOrigin(0.5);

        root.add([
            closeButton,
            closeLabel
        ]);

        this.hubActionZones.push({
            x: GAME_WIDTH / 2,
            y: panelTop + panelHeight - 52,
            width: 104,
            height: 72,
            callback: () => {
                AudioDirector.playEffect("click");
                this.closeHubPanel();
            }
        });

        this.hudRoot.add(root);
        this.hubPanel = root;

    }


    openCrankhousePanel() {

        const crankLevel =
            this.saveData.crankLevel || 0;

        const autoLevel =
            this.saveData.autoCrankLevel || 0;

        const valor =
            this.saveData.valor || 0;

        const crankCost =
            1 + Math.floor(crankLevel / 2);

        const autoCost =
            2 + autoLevel * 2;

        const output =
            1 + crankLevel;

        const nextAutoSeconds =
            Math.round(
                Math.max(
                    11000,
                    35000 -
                    Math.max(0, autoLevel - 1) * 6000
                ) / 1000
            );

        this.openHubPanel(
            "CRANKHOUSE WORKS",
            "",
            [
                {
                    title: `Glimmer Press  •  LV ${crankLevel}/8`,
                    description:
                        `+${output} per crank  →  +${output + 1}`,
                    action:
                        crankLevel >= 8
                            ? "MAX"
                            : "UPGRADE",
                    currencyIcon:
                        crankLevel >= 8
                            ? null
                            : "uiValor",
                    costAmount:
                        crankLevel >= 8
                            ? null
                            : crankCost,
                    ready:
                        crankLevel >= 8 ||
                        valor >= crankCost,
                    lockedMessage:
                        `Short ${crankCost - valor} Valor.`,
                    callback: () => {
                        if (crankLevel >= 8) {
                            this.showHudToast(
                                "The Glimmer Press is fully tuned!"
                            );
                            return;
                        }
                        this.saveData.valor -= crankCost;
                        this.saveData.crankLevel =
                            crankLevel + 1;
                        persistSave(this.saveData);
                        AudioDirector.playEffect("upgrade");
                        this.updateHUD();
                        this.closeHubPanel();
                        this.openCrankhousePanel();
                        this.showHudToast(
                            `Glimmer Press upgraded • ${output + 1} per crank!`
                        );
                    }
                },
                {
                    title: `Clockwork Helper  •  LV ${autoLevel}/5`,
                    description: `+${output} Glimmer every ${nextAutoSeconds}s`,
                    action:
                        autoLevel >= 5
                            ? "MAX"
                            : "HIRE",
                    currencyIcon:
                        autoLevel >= 5
                            ? null
                            : "uiValor",
                    costAmount:
                        autoLevel >= 5
                            ? null
                            : autoCost,
                    ready:
                        autoLevel >= 5 ||
                        valor >= autoCost,
                    lockedMessage:
                        `Short ${autoCost - valor} Valor.`,
                    callback: () => {
                        if (autoLevel >= 5) {
                            this.showHudToast(
                                "Every helper station is staffed!"
                            );
                            return;
                        }
                        this.saveData.valor -= autoCost;
                        this.saveData.autoCrankLevel =
                            autoLevel + 1;
                        persistSave(this.saveData);
                        this.startAutoCrank();
                        AudioDirector.playEffect("upgrade");
                        this.updateHUD();
                        this.closeHubPanel();
                        this.openCrankhousePanel();
                        this.showHudToast(
                            "Clockwork helper hired!"
                        );
                    }
                }
            ]
        );

    }


    openSettingsPanel() {

        const musicOn =
            this.saveData.musicEnabled !== false;

        const sfxOn =
            this.saveData.sfxEnabled !== false;

        this.openHubPanel(
            "MEADOW SETTINGS",
            "",
            [
                {
                    title: "Meadow music",
                    description: "Abstraction • meadow theme",
                    action: musicOn ? "ON" : "OFF",
                    callback: () => {
                        this.saveData.musicEnabled = !musicOn;
                        persistSave(this.saveData);
                        AudioDirector.setMusicEnabled(
                            this.saveData.musicEnabled
                        );
                        this.closeHubPanel();
                        this.openSettingsPanel();
                    }
                },
                {
                    title: "Sound effects",
                    description: "Effects and ambient wind",
                    action: sfxOn ? "ON" : "OFF",
                    callback: () => {
                        this.saveData.sfxEnabled = !sfxOn;
                        persistSave(this.saveData);
                        AudioDirector.setPreferences(
                            this.saveData
                        );
                        this.closeHubPanel();
                        this.openSettingsPanel();
                    }
                }
            ]
        );

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


    crankOutputAmount() {

        return (
            1 +
            this.saveData.crankLevel +
            Math.floor(this.crankStreak / 5)
        );

    }


    autoCrankInterval() {

        return Math.max(
            11000,
            35000 -
            Math.max(
                0,
                this.saveData.autoCrankLevel - 1
            ) *
            6000
        );

    }


    loadMeadowAudio() {

        const pendingAudio = [
            ["meadowWind", ASSETS.meadowWind],
            ["cacheOpen", ASSETS.cacheOpen]
        ].filter(
            ([key]) => !this.cache.audio.exists(key)
        );

        if (!pendingAudio.length) {
            return;
        }

        this.load.once("complete", () => {
            AudioDirector.setSceneMusic(
                this,
                "meadowTheme",
                "meadowWind"
            );
        });

        for (const [key, path] of pendingAudio) {
            this.load.audio(key, path);
        }

        this.load.start();

    }


    startAutoCrank() {

        if (this.autoCrankEvent) {
            this.autoCrankEvent.remove(false);
            this.autoCrankEvent = null;
        }

        if (this.saveData.autoCrankLevel <= 0) {
            return;
        }

        this.autoCrankEvent =
            this.time.addEvent({
                delay: this.autoCrankInterval(),
                loop: true,
                callback: () =>
                    this.sendHelperToCrankhouse()
            });

    }


    sendHelperToCrankhouse() {

        const helper =
            this.crankhouseHelpers?.find(
                candidate => !candidate.busy
            );

        if (!helper) {
            this.grantPassiveGlimmer();
            return;
        }

        helper.busy = true;
        helper.zzz.setVisible(false);
        helper.sprite.play("crankhand-run");
        helper.sprite.setAngle(0);
        helper.sprite.setFlipX(
            helper.workX < helper.x
        );

        const workY =
            this.worldCenter.y + 92;

        const travelTime =
            Phaser.Math.Clamp(
                Phaser.Math.Distance.Between(
                    helper.sprite.x,
                    helper.sprite.y,
                    helper.workX,
                    workY
                ) * 5,
                450,
                1050
            );

        this.tweens.add({
            targets: helper.sprite,
            x: helper.workX,
            y: workY,
            duration: travelTime,
            ease: "Sine.InOut",
            onComplete: () => {
                helper.sprite.play("crankhand-work");
                helper.sprite.setFlipX(false);
                helper.sprite.setDepth(workY + 14);
                AudioDirector.playEffect("crank");

                this.tweens.add({
                    targets: this.crankhouse,
                    scaleX: 1.14,
                    scaleY: 1.14,
                    duration: 120,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        this.grantPassiveGlimmer();

                        this.time.delayedCall(550, () => {
                            helper.sprite.play("crankhand-run");
                            helper.sprite.setFlipX(
                                helper.restX < helper.workX
                            );

                            this.tweens.add({
                                targets: helper.sprite,
                                x: helper.restX,
                                y: helper.restY,
                                duration: travelTime,
                                ease: "Sine.InOut",
                                onComplete: () => {
                                    helper.sprite.setAngle(90);
                                    helper.sprite.setFlipX(false);
                                    helper.sprite.play("crankhand-sleep");
                                    helper.sprite.setDepth(helper.restY + 8);
                                    helper.zzz.setVisible(true);
                                    helper.busy = false;
                                }
                            });
                        });
                    }
                });
            }
        });

    }


    grantPassiveGlimmer() {

        const amount =
            1 +
            this.saveData.crankLevel;

        this.glimmerOwned += amount;
        this.saveData.glimmer =
            this.glimmerOwned;

        persistSave(this.saveData);
        this.updateHUD();
        AudioDirector.playEffect("pickup");

        this.floatText(
            this.worldCenter.x,
            this.worldCenter.y - 176,
            `AUTO +${amount}`,
            "#9fffc1"
        );

    }


    generateGlimmer() {

        const now = this.time.now;

        if (now - this.lastCrankAt <= 1900) {
            this.crankStreak++;
        } else {
            this.crankStreak = 0;
        }

        this.lastCrankAt = now;

        const amount =
            this.crankOutputAmount();

        try {

            this.sound.play(
                "crankClick",
                {
                    volume: 0.28
                }
            );

        } catch (_) {}

        AudioDirector.playEffect("crank");


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
                105,
                180
            );


        const targetX =
            this.worldCenter.x +
            Math.cos(angle) *
            distance;


        const targetY =
            this.worldCenter.y +
            Math.sin(angle) *
            distance;

        const activePiles =
            this.glimmerLoose.filter(
                pile =>
                    pile.active &&
                    !pile.__collected
            );

        if (activePiles.length >= 14) {

            const pile =
                activePiles.reduce(
                    (nearest, candidate) =>
                        Phaser.Math.Distance.Between(
                            candidate.x,
                            candidate.y,
                            targetX,
                            targetY
                        ) <
                        Phaser.Math.Distance.Between(
                            nearest.x,
                            nearest.y,
                            targetX,
                            targetY
                        )
                            ? candidate
                            : nearest
                );

            pile.__value += amount;
            pile.setScale(
                Math.min(
                    0.92,
                    0.58 +
                    Math.log2(pile.__value) * 0.045
                )
            );

            this.floatText(
                pile.x,
                pile.y - 35,
                `PILE +${amount}`,
                "#ffe26d"
            );

            return;

        }


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

        resource.__value =
            amount;

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

            `+${amount} GLIMMER`,

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

        AudioDirector.playEffect("pickup");

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


        const amount =
            Math.max(
                1,
                Math.floor(resource.__value || 1)
            );

        this.glimmerOwned += amount;


        this.saveData.glimmer =
            this.glimmerOwned;


        persistSave(
            this.saveData
        );


        this.updateHUD();


        this.floatText(
            this.player.x,
            this.player.y - 105,
            `+${amount}`,
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


    spawnFieldCache(initial = false) {

        const activeCaches =
            this.fieldCaches.filter(
                cache => cache.active && !cache.__opened
            );

        if (activeCaches.length >= 3) {
            this.nextCacheSpawnAt =
                this.time.now + Phaser.Math.Between(8000, 15000);
            return false;
        }

        const originX =
            this.player?.x ?? this.worldCenter.x;
        const originY =
            this.player?.y ?? this.worldCenter.y;

        for (let attempt = 0; attempt < 60; attempt++) {

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = initial
                ? Phaser.Math.Between(180, 260)
                : Phaser.Math.Between(260, 620);

            const x = Phaser.Math.Clamp(
                originX + Math.cos(angle) * distance,
                120,
                WORLD_SIZE - 120
            );
            const y = Phaser.Math.Clamp(
                originY + Math.sin(angle) * distance,
                120,
                WORLD_SIZE - 120
            );

            const blockedByLot = this.ghostlots.some(lot =>
                x > lot.rect.x - 72 &&
                x < lot.rect.right + 72 &&
                y > lot.rect.y - 72 &&
                y < lot.rect.bottom + 72
            );

            const tooNearCache = activeCaches.some(cache =>
                Phaser.Math.Distance.Between(x, y, cache.x, cache.y) < 190
            );

            if (
                blockedByLot ||
                tooNearCache ||
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < (initial ? 190 : 270)
            ) {
                continue;
            }

            const cache =
                this.add.image(x, y, "chest")
                    .setScale(Phaser.Math.FloatBetween(2.15, 2.4))
                    .setDepth(y + 16)
                    .setInteractive({
                        useHandCursor: true
                    });

            cache.__cacheId = `cache-${++this.cacheSerial}`;
            cache.__opened = false;
            cache.__cacheRing =
                this.add.circle(
                    x,
                    y + 15,
                    24,
                    0xffd660,
                    0.10
                )
                .setStrokeStyle(2, 0xffe58a, 0.72)
                .setDepth(y - 2);

            this.tweens.add({
                targets: cache.__cacheRing,
                scaleX: 1.22,
                scaleY: 1.22,
                alpha: 0.14,
                duration: 920,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut"
            });

            cache.on(
                "pointerdown",
                (pointer, localX, localY, event) => {
                    if (event?.stopPropagation) {
                        event.stopPropagation();
                    }
                    this.openFieldCache(cache);
                }
            );

            this.fieldCaches.push(cache);
            this.nextCacheSpawnAt =
                this.time.now + Phaser.Math.Between(18000, 34000);

            return true;
        }

        this.nextCacheSpawnAt =
            this.time.now + Phaser.Math.Between(5000, 9000);

        return false;

    }


    openFieldCache(cache) {

        if (
            !cache?.active ||
            cache.__opened ||
            !cache.__cacheId
        ) {
            return;
        }

        cache.__opened = true;
        cache.disableInteractive();

        this.tweens.killTweensOf(cache);

        if (cache.__cacheRing) {
            this.tweens.killTweensOf(
                cache.__cacheRing
            );
            cache.__cacheRing.destroy();
            cache.__cacheRing = null;
        }

        this.fieldCaches =
            this.fieldCaches.filter(
                fieldCache => fieldCache !== cache
            );

        const roll = Phaser.Math.Between(1, 100);
        let rewardText;
        let rewardIcon = "glimmer";

        if (roll <= 62) {
            const glimmer =
                Phaser.Math.Between(8, 18) +
                this.saveData.unlockedLots.length * 2;

            this.glimmerOwned += glimmer;
            this.saveData.glimmer = this.glimmerOwned;
            rewardText = `+${glimmer} Glimmer`;
        } else if (roll <= 84) {
            const valor = roll >= 82 ? 2 : 1;
            this.saveData.valor += valor;
            rewardText = `+${valor} Valor`;
            rewardIcon = "uiValor";
        } else if ((this.saveData.runWards || 0) < 3) {
            this.saveData.runWards =
                Math.min(3, (this.saveData.runWards || 0) + 1);
            rewardText = "Warden Sigil • +1 fence integrity";
            rewardIcon = "uiSword";
        } else {
            const glimmer = Phaser.Math.Between(12, 24);
            this.glimmerOwned += glimmer;
            this.saveData.glimmer = this.glimmerOwned;
            rewardText = `+${glimmer} Glimmer`;
        }

        persistSave(this.saveData);
        this.updateHUD();
        AudioDirector.playEffect("upgrade");

        if (
            this.saveData.sfxEnabled !== false &&
            this.cache.audio.exists("cacheOpen")
        ) {
            this.sound.play("cacheOpen", {
                volume: 0.32,
                rate: 1.08
            });
        }

        this.floatText(
            cache.x,
            cache.y - 58,
            rewardText.toUpperCase(),
            "#fff0a2"
        );

        this.showHudToast(`Cache • ${rewardText}`);

        const rewardSprite =
            this.add.image(
                cache.x,
                cache.y - 20,
                rewardIcon
            )
            .setScale(rewardIcon === "glimmer" ? 0.38 : 0.30)
            .setDepth(cache.depth + 20);

        this.tweens.add({
            targets: rewardSprite,
            y: cache.y - 92,
            alpha: 0,
            scaleX: 0.12,
            scaleY: 0.12,
            duration: 780,
            ease: "Cubic.Out",
            onComplete: () => rewardSprite.destroy()
        });

        this.tweens.add({
            targets: cache,
            scaleX: 0.05,
            scaleY: 0.05,
            alpha: 0,
            duration: 125,
            ease: "Back.In",
            onComplete: () => cache.destroy()
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


                AudioDirector.playEffect("hit");

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

        if (this.hubStatusText) {
            this.hubStatusText.setText(
                `CRANKHOUSE • LV ${this.saveData.crankLevel || 0}` +
                (
                    this.saveData.autoCrankLevel
                        ? ` • AUTO ${this.saveData.autoCrankLevel}`
                        : ""
                ) +
                (
                    this.saveData.runWards
                        ? ` • SIGIL ×${this.saveData.runWards}`
                        : ""
                )
            );
        }

        if (this.crankhouseHint) {
            this.crankhouseHint.setText(
                `E • +${this.crankOutputAmount()}`
            );
        }

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

            this.objectiveIcon
                .setTexture(opened ? "uiSword" : "glimmer")
                .setScale(opened ? 0.42 : 0.40);

            this.objectiveText
                .setText(

                    `${
                        this.activeGhostlot
                            .id
                            .toUpperCase()
                    } • ${
                        opened
                            ? "READY"
                            : "CALLING"
                    }`

                );


            this.objectiveSubText
                .setText(

                    opened
                        ? "APPROACH TO RETRY"
                        : "APPROACH TO ENTER"

                );

        } else if (
            this.objectiveText
        ) {

            this.objectiveText
                .setText(
                    "ALL GHOSTLOTS CLAIMED"
                );


            this.objectiveSubText
                .setText(
                    "The meadow is yours."
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

        this.updateWorldAtmosphere();

        /*
            Cheap insurance in case anything else changes
            the world-camera zoom later.
        */
        this.syncHudToCameraZoom();

        const body =
            this.player.body;

        if (
            this.crankKey &&
            Phaser.Input.Keyboard.JustDown(
                this.crankKey
            )
        ) {
            const nearCrankhouse =
                Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 310;

            if (nearCrankhouse) {
                this.generateGlimmer();
            } else {
                this.showHudToast(
                    "Walk closer to the Crankhouse to crank it."
                );
            }
        }


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

        if (this.time.now >= this.nextCacheSpawnAt) {
            this.spawnFieldCache();
        }

        for (const cache of this.fieldCaches) {

            if (
                cache.active &&
                !cache.__opened &&
                Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    cache.x,
                    cache.y
                ) < 82
            ) {
                this.openFieldCache(cache);
            }

        }


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
        this.updateCrankhousePrompt();

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
        false,

    antialias:
        true,

    roundPixels:
        false,


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

The game scripts load after Phaser in index.html.

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

    if (
        typeof document !== "undefined" &&
        document.head &&
        !document.getElementById("nullmeadow-render-style")
    ) {
        const style =
            document.createElement("style");

        style.id = "nullmeadow-render-style";
        style.textContent = `
            html, body {
                background:
                    radial-gradient(ellipse at center,
                        #273b38 0%,
                        #121a22 72%);
            }
            #game-container canvas {
                image-rendering: auto !important;
            }
        `;

        document.head.appendChild(style);
    }

    await loadGameFonts();

    new Phaser.Game(
        config
    );

}


bootGame();