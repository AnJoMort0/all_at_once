/*
===============================================================================
NULLMEADOW — PROJECT CONTRACT + CANON — v0.9 "EVERYWHERE"
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
- VISUAL ASSET RULE: if the imported asset library can represent something, use the
  asset instead of drawing a substitute icon/pictogram from Phaser primitives.
- ASSET-FIRST UI RULE: do not fake icons/pictograms with Phaser circles, lines,
  triangles, emoji or text glyphs when an imported asset can communicate the state.
  Primitive geometry is still fine for layout, hit areas, world boundaries, glow and
  effects; recognizable UI/world symbols should come from the asset library.

CURRENT WORLD CANON
- Nullmeadow: the overworld/hub settlement. It now has a persistent day/night
  clock plus deterministic CLEAR / MIST / DRIZZLE weather segments.
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
- Clockwork Helpers physically live around the Crankhouse. Auto-helper level equals
  the number of visible workers. A worker walks in, performs one hammer interaction,
  immediately walks back to its post, and only then becomes available again.
- Nullmeadow navigation indicators appear at the screen edge for important off-screen
  targets: the Crankhouse, the Calling Lot, the nearest claimed build-ready Ghostlot,
  any manifested Nightglass Reliquary, and any manifested Moonpond.
- Nightglass Reliquary: an intermittent black-tower anomaly that opens RIFTFALL.
  Riftfall is a separate scene for code organization, but fictionally it is the actual
  Nullmeadow being invaded. A later counter-attack mode may travel into the enemy realm.
- Moonpond: an intermittent watery anomaly. It offers three casts per manifestation;
  catches pay existing currencies instead of adding another wallet resource. Mist,
  drizzle and night can improve the catch table.
- The Backward Door: after the first successful Riftfall, a permanent black gate appears.
  It leads OUT of Nullmeadow into Hollowroad, a room-by-room counter-invasion dungeon run.
  Hollowroad is intentionally another genre: action dungeon crawl + roguelite room upgrades,
  treasure choices, an orc gatekeeper boss and persistent relic rewards.
- Fatehouse: a unique settlement building that opens Runehand, a turn-based card duel.
  Runehand reads enemy intent, spends Resolve on cards, and pays a premium daily win reward.
- Persistent relics from Hollowroad are cross-game modifiers; one genre should increasingly
  feed another rather than keeping every minigame in a sealed economy.
- Riftglass: purple kill currency physically dropped by enemies during Riftfall. It is
  spent to construct buildings on claimed Ghostlots.
- Dawnseals: rare gold victory currency earned by surviving a full Riftfall. It powers
  permanent research in the Brassroot Institute.
- Claimed Ghostlots are build sites. Building identities and effects are persistent;
  some blueprints are unique while recruiter buildings may be repeated.
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
        runWards: 0,
        riftglass: 0,
        dawnseals: 0,
        invasionRuns: 0,
        invasionWins: 0,
        invasionKills: 0,
        buildings: {},
        tech: {},
        claimedAchievements: [],
        bounty: null,
        meadowClock: 0.34,
        meadowDay: 0,
        moonpondCycleKey: "",
        moonpondCastsUsed: 0,
        pondCatches: 0,
        pondRareCatches: 0,
        hollowRuns: 0,
        hollowWins: 0,
        hollowBossKills: 0,
        relics: [],
        fateWins: 0,
        fateLosses: 0,
        fateLastRewardDay: -1
    };

}


function ensureMetaState(save) {

    if (!save || typeof save !== "object") {
        save = defaultSave();
    }

    if (!Array.isArray(save.unlockedLots)) save.unlockedLots = [];
    if (!Array.isArray(save.openedClaimruns)) save.openedClaimruns = [];
    if (!Array.isArray(save.openedCaches)) save.openedCaches = [];
    if (!Array.isArray(save.claimedAchievements)) save.claimedAchievements = [];

    if (!save.buildings || typeof save.buildings !== "object" || Array.isArray(save.buildings)) {
        save.buildings = {};
    }

    if (!save.tech || typeof save.tech !== "object" || Array.isArray(save.tech)) {
        save.tech = {};
    }

    save.riftglass = Math.max(0, Math.floor(Number(save.riftglass) || 0));
    save.dawnseals = Math.max(0, Math.floor(Number(save.dawnseals) || 0));
    save.invasionRuns = Math.max(0, Math.floor(Number(save.invasionRuns) || 0));
    save.invasionWins = Math.max(0, Math.floor(Number(save.invasionWins) || 0));
    save.invasionKills = Math.max(0, Math.floor(Number(save.invasionKills) || 0));
    save.hollowRuns = Math.max(0, Math.floor(Number(save.hollowRuns) || 0));
    save.hollowWins = Math.max(0, Math.floor(Number(save.hollowWins) || 0));
    save.hollowBossKills = Math.max(0, Math.floor(Number(save.hollowBossKills) || 0));
    save.fateWins = Math.max(0, Math.floor(Number(save.fateWins) || 0));
    save.fateLosses = Math.max(0, Math.floor(Number(save.fateLosses) || 0));
    save.fateLastRewardDay = Math.floor(Number(save.fateLastRewardDay));
    if (!Number.isFinite(save.fateLastRewardDay)) save.fateLastRewardDay = -1;
    if (!Array.isArray(save.relics)) save.relics = [];
    save.relics = [...new Set(save.relics.filter(value => typeof value === "string"))];

    const rawClock = Number(save.meadowClock);
    save.meadowClock =
        Number.isFinite(rawClock)
            ? ((rawClock % 1) + 1) % 1
            : 0.34;

    save.meadowDay =
        Math.max(
            0,
            Math.floor(Number(save.meadowDay) || 0)
        );

    save.moonpondCycleKey =
        typeof save.moonpondCycleKey === "string"
            ? save.moonpondCycleKey
            : "";

    save.moonpondCastsUsed =
        Phaser.Math.Clamp(
            Math.floor(Number(save.moonpondCastsUsed) || 0),
            0,
            3
        );

    save.pondCatches =
        Math.max(
            0,
            Math.floor(Number(save.pondCatches) || 0)
        );

    save.pondRareCatches =
        Math.max(
            0,
            Math.floor(Number(save.pondRareCatches) || 0)
        );

    for (const [key, max] of [
        ["riftTempo", 5],
        ["longstep", 5],
        ["ironPulse", 3],
        ["gravemagnet", 4],
        ["roadsteel", 4],
        ["coldRead", 3]
    ]) {
        save.tech[key] = Phaser.Math.Clamp(
            Math.floor(Number(save.tech[key]) || 0),
            0,
            max
        );
    }

    return save;

}


function buildingCountInSave(save, key) {
    const buildings = save?.buildings || {};
    return Object.values(buildings).filter(value => value === key).length;
}


function hasBuildingInSave(save, key) {
    return buildingCountInSave(save, key) > 0;
}


const BOUNTY_DEFS = [
    {
        id: "bone-tithe",
        title: "BONE TITHE",
        description: "Drop 30 invaders in Riftfall.",
        type: "kill",
        target: 30,
        reward: { riftglass: 28 }
    },
    {
        id: "hold-the-dark",
        title: "HOLD THE DARK",
        description: "Stay alive for 60 seconds in Riftfall.",
        type: "survive",
        target: 60,
        reward: { riftglass: 34 }
    },
    {
        id: "bring-back-dawn",
        title: "BRING BACK DAWN",
        description: "Survive one complete Riftfall.",
        type: "win",
        target: 1,
        reward: { dawnseals: 1 }
    },
    {
        id: "wrong-way-shift",
        title: "WRONG-WAY SHIFT",
        description: "Clear one Hollowroad counter-invasion.",
        type: "hollow",
        target: 1,
        reward: { riftglass: 70, dawnseals: 1 },
        eligible: save => (save.invasionWins || 0) >= 1
    },
    {
        id: "read-the-house",
        title: "READ THE HOUSE",
        description: "Win two Runehand duels.",
        type: "fate",
        target: 2,
        reward: { riftglass: 62 },
        eligible: save => hasBuildingInSave(save, "fatehouse")
    },
    {
        id: "three-lines-wet",
        title: "THREE LINES WET",
        description: "Land three Moonpond catches.",
        type: "pond",
        target: 3,
        reward: { riftglass: 48 },
        eligible: save => (save.pondCatches || 0) >= 1 || (save.meadowDay || 0) >= 1
    }
];


function ensureRotatingBounty(save) {

    ensureMetaState(save);

    const cycle = Math.floor(Date.now() / 86400000);
    const eligible =
        BOUNTY_DEFS.filter(definition =>
            typeof definition.eligible !== "function" ||
            definition.eligible(save)
        );
    const pool = eligible.length ? eligible : BOUNTY_DEFS.slice(0, 3);
    const definition = pool[Math.abs(cycle) % pool.length];

    if (!save.bounty || save.bounty.cycle !== cycle || save.bounty.id !== definition.id) {
        save.bounty = {
            cycle,
            id: definition.id,
            progress: 0,
            claimed: false
        };
    }

    return {
        state: save.bounty,
        definition
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

        const save = ensureMetaState({
            ...defaultSave(),
            ...(parsed || {})
        });

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

    releaseScene(scene) {

        if (this.currentScene !== scene) {
            return;
        }

        for (const sound of [this.musicSound, this.ambientSound]) {
            if (!sound) continue;
            try { sound.stop(); } catch (_) {}
            try { sound.destroy(); } catch (_) {}
        }

        this.musicSound = null;
        this.ambientSound = null;
        this.currentScene = null;
        this.currentMusicKey = null;
        this.currentAmbientKey = null;

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

        /*
            Audio may be requested on the same input that unlocks the
            browser AudioContext while a scene is still finishing a lazy
            load. Phaser throws if sound.add() receives a key that has not
            reached the audio cache yet, so missing cache entries are simply
            skipped. The next setSceneMusic()/lazy-load completion will sync
            them normally.
        */
        const hasAudio = key =>
            Boolean(
                key &&
                this.currentScene?.cache?.audio?.exists(key)
            );

        if (
            this.currentMusicKey &&
            hasAudio(this.currentMusicKey)
        ) {
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

        if (
            this.currentAmbientKey &&
            hasAudio(this.currentAmbientKey)
        ) {
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

    crankhandRun:
        "assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Run Hammer.png",

    crankhandInteract:
        "assets/images/spritesheets/characters/tiny_swords/Blue Units/Pawn/Pawn_Interact Hammer.png",

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

    cloud1:
        "assets/images/environment/decorations/tiny_swords/Clouds/Clouds_01.png",

    cloud4:
        "assets/images/environment/decorations/tiny_swords/Clouds/Clouds_04.png",

    moonWaterTile:
        "assets/images/tilesets/tiny_swords/Water Background color.png",

    moonWaterRocks:
        "assets/images/environment/decorations/tiny_swords/Rocks in the Water/Water Rocks_01.png",

    moonWaterSplash:
        "assets/images/spritesheets/effects/tiny_swords/Water Splash.png",

    moonpondIcon:
        "assets/images/icons/raven_fantasy_icons/64x64/fc19.png",


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

    // Riftfall Pip + recruit loadouts.
    invasionWarriorIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Warrior/Warrior_Idle.png",

    invasionWarriorRun:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Warrior/Warrior_Run.png",

    invasionWarriorAttack:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Warrior/Warrior_Attack1.png",

    invasionArcherIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Archer/Archer_Idle.png",

    invasionArcherShoot:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Archer/Archer_Shoot.png",

    invasionLancerIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Lancer/Lancer_Idle.png",

    invasionLancerAttack:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Lancer/Lancer_Right_Attack.png",

    invasionMonkIdle:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Monk/Idle.png",

    invasionMonkHeal:
        "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Monk/Heal.png",

    invasionSkeleton2:
        "assets/images/spritesheets/enemies/enemy_animations/enemies-skeleton2_movemen.png",

    invasionVampire:
        "assets/images/spritesheets/enemies/enemy_animations/enemies-vampire_movement.png",


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

    // Actual Raven gold key used as the Ghostlot locked-state symbol.
    uiLotLocked:
        "assets/images/icons/raven_fantasy_icons/64x64/fc179.png",

    // Imported pixel arrow for off-screen navigation pointers.
    navArrow:
        "assets/images/ui/controls/2d_pixel_dungeon/arrow_2.png",

    // Riftfall point-of-interest + persistent currencies.
    riftReliquary:
        "assets/images/environment/buildings/tiny_swords/Black Buildings/Tower.png",

    hollowDoor:
        "assets/images/environment/buildings/tiny_swords/Black Buildings/Castle.png",

    dungeonTiles:
        "assets/images/tilesets/2d_pixel_dungeon/Dungeon_Tileset_at.png",

    dungeonChest:
        "assets/images/environment/decorations/cute_fantasy/Chest.png",

    hollowOrcWalk:
        "assets/images/spritesheets/characters/tiny_rpg_soldier_orc/Orc/Orc with shadows/Orc_Walk.png",

    hollowOrcAttack:
        "assets/images/spritesheets/characters/tiny_rpg_soldier_orc/Orc/Orc with shadows/Orc_Attack01.png",

    riftGlassIcon:
        "assets/images/icons/raven_fantasy_icons/64x64/fc166.png",

    dawnSealIcon:
        "assets/images/icons/raven_fantasy_icons/64x64/fc171.png",

    // Claimed-lot construction set.
    buildingLaurel:
        "assets/images/environment/buildings/tiny_swords/Blue Buildings/Monastery.png",

    buildingBounty:
        "assets/images/environment/buildings/tiny_swords/Yellow Buildings/Tower.png",

    buildingTech:
        "assets/images/environment/buildings/tiny_swords/Purple Buildings/Monastery.png",

    buildingCafe:
        "assets/images/environment/buildings/tiny_swords/Blue Buildings/House3.png",

    buildingPipyard:
        "assets/images/environment/buildings/tiny_swords/Yellow Buildings/Barracks.png",

    buildingWarroom:
        "assets/images/environment/buildings/tiny_swords/Blue Buildings/Barracks.png",

    buildingBowyer:
        "assets/images/environment/buildings/tiny_swords/Yellow Buildings/Archery.png",

    buildingPikehouse:
        "assets/images/environment/buildings/tiny_swords/Red Buildings/Barracks.png",

    buildingCloister:
        "assets/images/environment/buildings/tiny_swords/Yellow Buildings/Monastery.png",

    buildingFate:
        "assets/images/environment/buildings/tiny_swords/Purple Buildings/Tower.png",


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


    moonpondWater:
        "assets/audio/sfx/environment/water_babbling_loop.wav",

    moonpondSplashSfx:
        "assets/audio/sfx/environment/water_splashing.wav",

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

    invasionTheme:
        "assets/audio/music/loop_music16.ogg",

    meadowWind:
        "assets/audio/sfx/environment/ambient_wind.wav",

    cacheOpen:
        "assets/audio/sfx/materials/wood_small_gather.wav",

    dungeonDoorSfx:
        "assets/audio/sfx/environment/door_open.wav",

    swordSliceSfx:
        "assets/audio/sfx/weapons/sword_slice.wav",

    heartCollectSfx:
        "assets/audio/sfx/items/heart_collect.wav",

    cardDrawSfx:
        "assets/audio/sfx/card_and_board/card_draw_1.wav",

    diceRollSfx:
        "assets/audio/sfx/card_and_board/dice_roll_1.wav"

};


const BUILDING_DEFS = {

    laurelArchive: {
        name: "Laurel Archive",
        short: "ARCHIVE",
        texture: "buildingLaurel",
        scale: 0.54,
        unique: true,
        cost: 38,
        description: "Unlocks settlement achievements and their oversized rewards."
    },

    bountyBell: {
        name: "Bounty Bell",
        short: "BOUNTIES",
        texture: "buildingBounty",
        scale: 0.62,
        unique: true,
        cost: 44,
        description: "Posts one rotating Riftfall contract with a small reward."
    },

    brassrootInstitute: {
        name: "Brassroot Institute",
        short: "TECH",
        texture: "buildingTech",
        scale: 0.54,
        unique: true,
        cost: 72,
        description: "Turns Dawnseals into permanent Pip research."
    },

    clockCafe: {
        name: "Clock Café",
        short: "CAFÉ",
        texture: "buildingCafe",
        scale: 0.72,
        unique: true,
        cost: 54,
        description: "Coffee, gears, and shorter helper travel / auto-crank cycles."
    },

    pipyard: {
        name: "Pipyard",
        short: "TRAINING",
        texture: "buildingPipyard",
        scale: 0.58,
        unique: true,
        cost: 62,
        description: "Pip moves faster in Nullmeadow and enters Riftfall tougher."
    },

    warroom: {
        name: "Blue Warroom",
        short: "WARROOM",
        texture: "buildingWarroom",
        scale: 0.58,
        unique: true,
        cost: 86,
        description: "All recruited soldiers deal substantially more Riftfall damage."
    },

    bowyerLodge: {
        name: "Bowyer Lodge",
        short: "ARCHER",
        texture: "buildingBowyer",
        scale: 0.58,
        unique: false,
        cost: 24,
        repeatCost: 14,
        description: "Adds one autonomous archer to every Riftfall squad."
    },

    pikehouse: {
        name: "Pikehouse",
        short: "LANCER",
        texture: "buildingPikehouse",
        scale: 0.58,
        unique: false,
        cost: 30,
        repeatCost: 18,
        description: "Adds one close-range lancer to every Riftfall squad."
    },

    lanternCloister: {
        name: "Lantern Cloister",
        short: "MONK",
        texture: "buildingCloister",
        scale: 0.54,
        unique: false,
        cost: 40,
        repeatCost: 22,
        description: "Adds one monk; monks periodically restore Pip during Riftfall."
    },

    fatehouse: {
        name: "Fatehouse",
        short: "RUNEHAND",
        texture: "buildingFate",
        scale: 0.58,
        unique: true,
        cost: 125,
        description: "Opens Runehand: a turn-based card duel with a once-per-day premium payout."
    }

};


const ACHIEVEMENT_DEFS = [
    {
        id: "first-blood",
        title: "FIRST BLOOD",
        description: "Defeat your first Riftfall invader.",
        test: save => save.invasionKills >= 1,
        reward: { riftglass: 45 }
    },
    {
        id: "claimkeeper",
        title: "CLAIMKEEPER",
        description: "Claim three Ghostlots.",
        test: save => save.unlockedLots.length >= 3,
        reward: { dawnseals: 1 }
    },
    {
        id: "bring-the-dawn",
        title: "BRING THE DAWN",
        description: "Win a Riftfall invasion.",
        test: save => save.invasionWins >= 1,
        reward: { riftglass: 80 }
    },
    {
        id: "little-city",
        title: "LITTLE CITY",
        description: "Construct three buildings.",
        test: save => Object.keys(save.buildings || {}).length >= 3,
        reward: { dawnseals: 2 }
    },
    {
        id: "night-eater",
        title: "NIGHT EATER",
        description: "Defeat 250 Riftfall invaders total.",
        test: save => save.invasionKills >= 250,
        reward: { riftglass: 180, dawnseals: 2 }
    },
    {
        id: "pond-whisperer",
        title: "POND WHISPERER",
        description: "Land your first Moonpond catch.",
        test: save => (save.pondCatches || 0) >= 1,
        reward: { riftglass: 55 }
    },
    {
        id: "dawn-on-a-line",
        title: "DAWN ON A LINE",
        description: "Land a rare Moonpond catch.",
        test: save => (save.pondRareCatches || 0) >= 1,
        reward: { dawnseals: 2 }
    },
    {
        id: "wrong-way-home",
        title: "WRONG WAY HOME",
        description: "Clear Hollowroad and return from the enemy side.",
        test: save => (save.hollowWins || 0) >= 1,
        reward: { dawnseals: 2, riftglass: 120 }
    },
    {
        id: "three-relics",
        title: "POCKET MUSEUM",
        description: "Bring three permanent relics back from Hollowroad.",
        test: save => (save.relics || []).length >= 3,
        reward: { dawnseals: 3 }
    },
    {
        id: "stacked-deck",
        title: "STACKED DECK",
        description: "Win your first Runehand duel at the Fatehouse.",
        test: save => (save.fateWins || 0) >= 1,
        reward: { riftglass: 95 }
    }
];

const TECH_DEFS = [
    {
        key: "riftTempo",
        title: "Rift Tempo",
        max: 5,
        description: "Pip attacks 8% faster per level during Riftfall.",
        sealCosts: [2, 4, 7, 11, 16],
        glassCosts: [60, 120, 220, 360, 560]
    },
    {
        key: "longstep",
        title: "Longstep",
        max: 5,
        description: "Pip movement increases 4% per level everywhere.",
        sealCosts: [2, 5, 9, 14, 20],
        glassCosts: [70, 150, 260, 420, 650]
    },
    {
        key: "ironPulse",
        title: "Iron Pulse",
        max: 3,
        description: "+1 maximum Riftfall health per level.",
        sealCosts: [4, 8, 14],
        glassCosts: [140, 300, 520]
    },
    {
        key: "gravemagnet",
        title: "Gravemagnet",
        max: 4,
        description: "Riftglass pickup radius increases by 12 per level.",
        sealCosts: [3, 6, 10, 15],
        glassCosts: [90, 180, 320, 500]
    },
    {
        key: "roadsteel",
        title: "Roadsteel",
        max: 4,
        description: "Hollowroad gains reach and movement each level; levels 2 and 4 add sword damage.",
        sealCosts: [4, 8, 13, 20],
        glassCosts: [150, 310, 540, 860]
    },
    {
        key: "coldRead",
        title: "Cold Read",
        max: 3,
        description: "Runehand starts tougher: +2 HP and +1 opening Block per level.",
        sealCosts: [5, 10, 18],
        glassCosts: [190, 420, 780]
    }
];


function techUpgradeCost(definition, level) {

    if (!definition || level >= definition.max) {
        return null;
    }

    return {
        dawnseals: definition.sealCosts[level] ?? Infinity,
        riftglass: definition.glassCosts[level] ?? Infinity
    };

}




class GameScene extends Phaser.Scene {

    constructor() {

        super("GameScene");

    }


    init(data) {

        this.returnFromInvasion = Boolean(data?.returnFromInvasion);
        this.returnFromMoonpond = Boolean(data?.returnFromMoonpond);
        this.returnFromHollowroad = Boolean(data?.returnFromHollowroad);
        this.returnFromRunehand = Boolean(data?.returnFromRunehand);

        const returningFromSideGame =
            this.returnFromInvasion ||
            this.returnFromMoonpond ||
            this.returnFromHollowroad ||
            this.returnFromRunehand;

        this.returnSpawn =
            returningFromSideGame &&
            Number.isFinite(data?.x) &&
            Number.isFinite(data?.y)
                ? { x: data.x, y: data.y }
                : null;

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

        for (const [key, source] of [
            ["weatherCloud1", ASSETS.cloud1],
            ["weatherCloud4", ASSETS.cloud4],
            ["moonWaterTile", ASSETS.moonWaterTile],
            ["moonpondIcon", ASSETS.moonpondIcon]
        ]) {
            if (!this.textures.exists(key)) {
                this.load.image(key, source);
            }
        }

        if (!this.textures.exists("moonWaterRocks")) {
            this.load.spritesheet(
                "moonWaterRocks",
                ASSETS.moonWaterRocks,
                {
                    frameWidth: 64,
                    frameHeight: 64
                }
            );
        }

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
            "uiTown",
            ASSETS.uiTown
        );

        this.load.image(
            "uiSettings",
            ASSETS.uiSettings
        );

        this.load.image(
            "uiLotLocked",
            ASSETS.uiLotLocked
        );

        this.load.image(
            "navArrow",
            ASSETS.navArrow
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

        for (const [key, source] of [
            ["riftReliquary", ASSETS.riftReliquary],
            ["hollowDoor", ASSETS.hollowDoor],
            ["riftGlassIcon", ASSETS.riftGlassIcon],
            ["dawnSealIcon", ASSETS.dawnSealIcon],
            ["buildingLaurel", ASSETS.buildingLaurel],
            ["buildingBounty", ASSETS.buildingBounty],
            ["buildingTech", ASSETS.buildingTech],
            ["buildingCafe", ASSETS.buildingCafe],
            ["buildingPipyard", ASSETS.buildingPipyard],
            ["buildingWarroom", ASSETS.buildingWarroom],
            ["buildingBowyer", ASSETS.buildingBowyer],
            ["buildingPikehouse", ASSETS.buildingPikehouse],
            ["buildingCloister", ASSETS.buildingCloister],
            ["buildingFate", ASSETS.buildingFate]
        ]) {
            this.load.image(key, source);
        }


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

        this.load.spritesheet(
            "crankhandRun",
            ASSETS.crankhandRun,
            {
                frameWidth: 192,
                frameHeight: 192
            }
        );

        this.load.spritesheet(
            "crankhandInteract",
            ASSETS.crankhandInteract,
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

        ensureMetaState(
            this.saveData
        );


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

        this.initializeMeadowClimateState();

        this.createGround();

        this.createGhostlots();

        this.createRiftReliquary();

        this.createMoonpond();

        this.createHollowroadGate();

        this.createScenery();

        this.createWorldAtmosphere();

        this.createMeadowClimateVisuals();

        this.createCrankhouse();

        this.createPip();

        if (this.returnSpawn) {
            this.player.setPosition(
                Phaser.Math.Clamp(this.returnSpawn.x, 70, WORLD_SIZE - 70),
                Phaser.Math.Clamp(this.returnSpawn.y, 70, WORLD_SIZE - 70)
            );
            this.player.body.updateFromGameObject();
            this.playerName.setPosition(
                this.player.x,
                this.player.y - 94
            );
        }

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



    initializeMeadowClimateState() {

        this.meadowClock =
            Number.isFinite(Number(this.saveData.meadowClock))
                ? ((Number(this.saveData.meadowClock) % 1) + 1) % 1
                : 0.34;

        this.meadowDay =
            Math.max(
                0,
                Math.floor(Number(this.saveData.meadowDay) || 0)
            );

        this.climateSegment =
            Math.floor(this.meadowClock * 8) % 8;

        this.currentWeather =
            this.weatherForSegment(
                this.meadowDay,
                this.climateSegment
            );

        this.currentDayPhase =
            this.getMeadowDayPhase(
                this.meadowClock
            );

        this.lastClimatePersistAt = 0;
        this.lastAnnouncedClimate =
            `${this.currentDayPhase}:${this.currentWeather}`;

    }


    getMeadowDayPhase(clock = this.meadowClock) {

        if (clock < 0.18 || clock >= 0.90) {
            return "NIGHT";
        }

        if (clock < 0.30) {
            return "DAWN";
        }

        if (clock < 0.70) {
            return "DAY";
        }

        if (clock < 0.82) {
            return "DUSK";
        }

        return "NIGHT";

    }


    weatherForSegment(day, segment) {

        const settlement =
            this.saveData.unlockedLots?.length || 0;

        let hash =
            Math.imul(day + 17, 1103515245) ^
            Math.imul(segment + 31, 1597334677) ^
            Math.imul(settlement + 7, 2654435761);

        hash >>>= 0;

        const roll =
            hash % 100;

        if (roll < 18) {
            return "MIST";
        }

        if (roll < 36) {
            return "DRIZZLE";
        }

        return "CLEAR";

    }


    persistMeadowClimate() {

        if (!this.saveData) {
            return;
        }

        this.saveData.meadowClock =
            this.meadowClock;

        this.saveData.meadowDay =
            this.meadowDay;

        persistSave(
            this.saveData
        );

        this.registry.set(
            "saveData",
            this.saveData
        );

    }


    createMeadowClimateVisuals() {

        /*
            The sky tint is deliberately a world overlay, not HUD art.
            World labels darken with the meadow; interaction prompts remain above it.
        */
        this.nightVeil =
            this.add.rectangle(
                WORLD_SIZE / 2,
                WORLD_SIZE / 2,
                WORLD_SIZE,
                WORLD_SIZE,
                0x0b1632,
                0
            )
            .setDepth(48000);

        this.weatherClouds = [];

        const rng =
            this.makeRng(
                0x434c494d ^
                ((this.meadowDay + 1) * 97)
            );

        for (let i = 0; i < 6; i++) {

            const cloud =
                this.add.image(
                    rng() * WORLD_SIZE,
                    100 + rng() * (WORLD_SIZE - 200),
                    i % 2
                        ? "weatherCloud1"
                        : "weatherCloud4"
                )
                .setScale(
                    0.45 + rng() * 0.42
                )
                .setAlpha(0)
                .setDepth(47000);

            cloud.__climateSpeed =
                7 + rng() * 13;

            cloud.__climateBaseY =
                cloud.y;

            cloud.__climatePhase =
                rng() * Math.PI * 2;

            this.weatherClouds.push(
                cloud
            );

        }

        this.weatherRain = [];

        for (let i = 0; i < 110; i++) {

            const drop =
                this.add.rectangle(
                    rng() * WORLD_SIZE,
                    rng() * WORLD_SIZE,
                    3,
                    18 + rng() * 12,
                    0xc6ebff,
                    0
                )
                .setRotation(-0.18)
                .setDepth(48500);

            drop.__rainSpeed =
                520 + rng() * 430;

            drop.__rainDrift =
                -70 - rng() * 55;

            this.weatherRain.push(
                drop
            );

        }

        this.applyMeadowWeatherVisuals(
            false
        );

        this.updateMeadowClimate(
            0
        );

    }


    applyMeadowWeatherVisuals(animate = true) {

        const cloudAlpha =
            this.currentWeather === "MIST"
                ? 0.34
                : this.currentWeather === "DRIZZLE"
                    ? 0.22
                    : 0.055;

        this.weatherRainActive =
            this.currentWeather === "DRIZZLE";

        for (const cloud of this.weatherClouds || []) {

            this.tweens.killTweensOf(
                cloud
            );

            if (animate) {
                this.tweens.add({
                    targets: cloud,
                    alpha: cloudAlpha,
                    duration: 900,
                    ease: "Sine.InOut"
                });
            } else {
                cloud.setAlpha(
                    cloudAlpha
                );
            }

        }

        if (!this.weatherRainActive) {
            for (const drop of this.weatherRain || []) {
                drop.setAlpha(0);
            }
        }

    }


    updateMeadowClimate(delta = 16.667) {

        if (!Number.isFinite(this.meadowClock)) {
            return;
        }

        const dt =
            Math.min(
                Math.max(Number(delta) || 16.667, 0),
                80
            );

        /*
            One complete Nullmeadow day is eight real minutes.
            Long enough to feel persistent, short enough to actually see change.
        */
        this.meadowClock +=
            dt /
            (8 * 60 * 1000);

        if (this.meadowClock >= 1) {
            this.meadowClock %= 1;
            this.meadowDay++;
        }

        const phase =
            this.getMeadowDayPhase(
                this.meadowClock
            );

        const segment =
            Math.floor(
                this.meadowClock * 8
            ) % 8;

        const segmentChanged =
            segment !==
            this.climateSegment;

        const phaseChanged =
            phase !==
            this.currentDayPhase;

        this.currentDayPhase =
            phase;

        if (segmentChanged) {

            this.climateSegment =
                segment;

            this.currentWeather =
                this.weatherForSegment(
                    this.meadowDay,
                    segment
                );

            this.applyMeadowWeatherVisuals(
                true
            );

        }

        const solar =
            (
                Math.cos(
                    (this.meadowClock - 0.5) *
                    Math.PI *
                    2
                )
                +
                1
            )
            /
            2;

        const nightStrength =
            Phaser.Math.Clamp(
                1 -
                Math.pow(
                    solar,
                    0.55
                ),
                0,
                1
            );

        if (this.nightVeil) {
            this.nightVeil.setAlpha(
                nightStrength * 0.48
            );
        }

        const climateTime =
            this.time.now * 0.00025;

        for (const cloud of this.weatherClouds || []) {

            cloud.x +=
                cloud.__climateSpeed *
                dt /
                1000;

            if (cloud.x > WORLD_SIZE + 320) {
                cloud.x = -320;
            }

            cloud.y =
                cloud.__climateBaseY +
                Math.sin(
                    climateTime +
                    cloud.__climatePhase
                ) *
                18;

        }

        if (this.weatherRainActive) {

            for (const drop of this.weatherRain || []) {

                drop.setAlpha(
                    this.currentDayPhase === "NIGHT"
                        ? 0.32
                        : 0.24
                );

                drop.y +=
                    drop.__rainSpeed *
                    dt /
                    1000;

                drop.x +=
                    drop.__rainDrift *
                    dt /
                    1000;

                if (drop.y > WORLD_SIZE + 40) {
                    drop.y = -40;
                }

                if (drop.x < -40) {
                    drop.x = WORLD_SIZE + 40;
                }

            }

        }

        if (
            segmentChanged ||
            phaseChanged
        ) {

            if (this.hudRoot) {

                const climateKey =
                    `${this.currentDayPhase}:${this.currentWeather}`;

                if (
                    climateKey !==
                    this.lastAnnouncedClimate
                ) {

                    this.lastAnnouncedClimate =
                        climateKey;

                    const weatherText =
                        this.currentWeather === "CLEAR"
                            ? ""
                            : ` • ${this.currentWeather}`;

                    this.showHudToast(
                        `${this.currentDayPhase}${weatherText} settles over Nullmeadow.`
                    );

                }

                this.updateHUD();

            }

        }

        if (
            this.time.now -
            this.lastClimatePersistAt
            >
            5000
        ) {

            this.lastClimatePersistAt =
                this.time.now;

            this.persistMeadowClimate();

        }

    }


    moonpondCycleKey() {

        return `${this.meadowDay}:${this.climateSegment}`;

    }


    syncMoonpondCycle() {

        const key =
            this.moonpondCycleKey();

        if (
            this.saveData.moonpondCycleKey !==
            key
        ) {

            this.saveData.moonpondCycleKey =
                key;

            this.saveData.moonpondCastsUsed =
                0;

            persistSave(
                this.saveData
            );

        }

        return key;

    }


    shouldSpawnMoonpond() {

        this.syncMoonpondCycle();

        if (
            (this.saveData.moonpondCastsUsed || 0)
            >=
            3
        ) {
            return false;
        }

        /*
            Guarantee the first pond so the player can discover the system.
            Later manifestations favor wet weather and darker hours.
        */
        if (
            (this.saveData.pondCatches || 0)
            ===
            0
        ) {
            return true;
        }

        const keySeed =
            Math.imul(this.meadowDay + 13, 374761393) ^
            Math.imul(this.climateSegment + 29, 668265263) ^
            Math.imul((this.saveData.invasionWins || 0) + 5, 2246822519);

        const roll =
            (keySeed >>> 0) % 100;

        const weatherBonus =
            this.currentWeather === "MIST"
                ? 32
                : this.currentWeather === "DRIZZLE"
                    ? 20
                    : 0;

        const phaseBonus =
            (
                this.currentDayPhase === "NIGHT" ||
                this.currentDayPhase === "DUSK"
            )
                ? 12
                : 0;

        return (
            roll <
            24 +
            weatherBonus +
            phaseBonus
        );

    }


    createMoonpond() {

        this.moonpond = null;
        this.moonpondPoint = null;
        this.moonpondPrompt = null;

        if (
            !this.shouldSpawnMoonpond()
        ) {
            return;
        }

        const rng =
            this.makeRng(
                0x504f4e44 ^
                ((this.meadowDay + 1) * 4789) ^
                ((this.climateSegment + 3) * 1613)
            );

        let point = null;

        for (
            let attempt = 0;
            attempt < 60;
            attempt++
        ) {

            const angle =
                rng() *
                Math.PI *
                2;

            const radius =
                520 +
                rng() *
                310;

            const x =
                Phaser.Math.Clamp(
                    this.worldCenter.x +
                    Math.cos(angle) *
                    radius,
                    170,
                    WORLD_SIZE - 170
                );

            const y =
                Phaser.Math.Clamp(
                    this.worldCenter.y +
                    Math.sin(angle) *
                    radius,
                    190,
                    WORLD_SIZE - 190
                );

            const collidesLot =
                this.ghostlots?.some(
                    lot =>
                        Phaser.Math.Distance.Between(
                            x,
                            y,
                            lot.x,
                            lot.y
                        )
                        <
                        lot.size * 0.75 +
                        120
                );

            const collidesRift =
                this.riftReliquaryPoint &&
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.riftReliquaryPoint.x,
                    this.riftReliquaryPoint.y
                )
                <
                260;

            if (
                !collidesLot &&
                !collidesRift
            ) {
                point = { x, y };
                break;
            }

        }

        point ||= {
            x:
                this.worldCenter.x -
                660,
            y:
                this.worldCenter.y +
                410
        };

        const waterBack =
            this.add.image(
                point.x,
                point.y,
                "moonWaterTile"
            )
            .setScale(
                3.75,
                2.25
            )
            .setTint(
                0x6faec0
            )
            .setAlpha(0.92)
            .setDepth(
                point.y - 18
            );

        const waterFront =
            this.add.image(
                point.x + 28,
                point.y + 5,
                "moonWaterTile"
            )
            .setScale(
                2.85,
                1.72
            )
            .setTint(
                0x8ad2d5
            )
            .setAlpha(0.48)
            .setDepth(
                point.y - 16
            );

        const rockOffsets = [
            [-105, -56, 1],
            [104, -43, 5],
            [-112, 52, 9],
            [98, 57, 13]
        ];

        for (
            const [dx, dy, frame]
            of rockOffsets
        ) {

            this.add.sprite(
                point.x + dx,
                point.y + dy,
                "moonWaterRocks",
                frame
            )
            .setScale(
                0.82
            )
            .setDepth(
                point.y + dy + 8
            );

        }

        const sigil =
            this.add.image(
                point.x,
                point.y - 94,
                "moonpondIcon"
            )
            .setScale(0.82)
            .setDepth(
                point.y + 35
            );

        this.tweens.add({
            targets: sigil,
            y: point.y - 106,
            scaleX: 0.90,
            scaleY: 0.90,
            duration: 980,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut"
        });

        const label =
            this.add.text(
                point.x,
                point.y + 112,
                "MOONPOND",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "18px",
                    color: "#d9fbff",
                    stroke: "#152535",
                    strokeThickness: 5
                }
            )
            .setOrigin(0.5)
            .setDepth(
                point.y + 120
            );

        const hitZone =
            this.add.zone(
                point.x,
                point.y,
                270,
                190
            )
            .setDepth(
                point.y + 110
            )
            .setInteractive({
                useHandCursor: true
            });

        hitZone.__blocksWorldInput =
            true;

        const prompt =
            this.add.container(
                point.x,
                point.y - 175
            )
            .setDepth(50020)
            .setVisible(false);

        const bubble =
            this.add.graphics();

        bubble.fillStyle(
            THEME.ink,
            0.97
        );

        bubble.fillRoundedRect(
            -160,
            -52,
            320,
            104,
            22
        );

        bubble.lineStyle(
            3,
            0x86e2ef,
            0.80
        );

        bubble.strokeRoundedRect(
            -160,
            -52,
            320,
            104,
            22
        );

        bubble.fillStyle(
            THEME.ink,
            0.97
        );

        bubble.fillTriangle(
            -12,
            52,
            12,
            52,
            0,
            69
        );

        const title =
            this.add.text(
                -138,
                -37,
                "MOONPOND",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "20px",
                    color: "#d9fbff"
                }
            );

        const castsLeft =
            Math.max(
                0,
                3 -
                (this.saveData.moonpondCastsUsed || 0)
            );

        const sub =
            this.add.text(
                -138,
                -7,
                `${castsLeft} CASTS • ${this.currentDayPhase} • ${this.currentWeather}`,
                {
                    fontFamily: FONT_TECH,
                    fontSize: "10px",
                    fontStyle: "bold",
                    color: "#a9c7d1"
                }
            );

        const play =
            this.add.image(
                114,
                0,
                "uiRoundBlue"
            )
            .setScale(0.66)
            .setInteractive({
                useHandCursor: true
            });

        play.__blocksWorldInput =
            true;

        const playIcon =
            this.add.image(
                114,
                0,
                "moonpondIcon"
            )
            .setScale(0.48);

        prompt.add([
            bubble,
            title,
            sub,
            play,
            playIcon
        ]);

        const interact =
            event => {

                event?.stopPropagation?.();

                const distance =
                    Phaser.Math.Distance.Between(
                        this.player?.x ??
                            this.worldCenter.x,
                        this.player?.y ??
                            this.worldCenter.y,
                        point.x,
                        point.y
                    );

                if (
                    distance >
                    270
                ) {

                    this.walkTo(
                        point.x,
                        point.y + 125
                    );

                    this.showHudToast(
                        "Something is moving under the Moonpond."
                    );

                    return;

                }

                prompt.setVisible(
                    true
                );

            };

        hitZone.on(
            "pointerdown",
            (
                pointer,
                localX,
                localY,
                event
            ) =>
                interact(event)
        );

        play.on(
            "pointerdown",
            (
                pointer,
                localX,
                localY,
                event
            ) => {

                event?.stopPropagation?.();
                this.beginMoonpond();

            }
        );

        this.moonpond =
            hitZone;

        this.moonpondPoint =
            point;

        this.moonpondPrompt =
            prompt;

        this.moonpondLabel =
            label;

        this.moonpondWater = [
            waterBack,
            waterFront
        ];

    }


    updateMoonpondPrompt() {

        if (
            !this.moonpond ||
            !this.moonpondPrompt ||
            !this.player
        ) {
            return;
        }

        const near =
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.moonpondPoint.x,
                this.moonpondPoint.y
            )
            <
            275;

        this.moonpondPrompt
            .setVisible(
                near
            );

    }


    beginMoonpond() {

        if (
            !this.moonpond ||
            this.claimrunLaunching
        ) {
            return;
        }

        this.claimrunLaunching =
            true;

        this.moveTarget =
            null;

        this.persistMeadowClimate();

        AudioDirector.playEffect(
            "click"
        );

        this.cameras.main.fadeOut(
            240,
            12,
            28,
            36
        );

        this.time.delayedCall(
            255,
            () => {

                this.scene.start(
                    "MoonpondScene",
                    {
                        x:
                            this.player.x,
                        y:
                            this.player.y,
                        pondX:
                            this.moonpondPoint.x,
                        pondY:
                            this.moonpondPoint.y,
                        cycleKey:
                            this.moonpondCycleKey(),
                        phase:
                            this.currentDayPhase,
                        weather:
                            this.currentWeather
                    }
                );

            }
        );

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
                unlocked,
                buildingKey:
                    this.saveData.buildings?.[id] ||
                    null
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

        const buildingKey =
            unlocked
                ? this.saveData.buildings?.[id] || null
                : null;

        const builtDefinition =
            buildingKey
                ? BUILDING_DEFS[buildingKey] || null
                : null;

        const g =
            this.add.graphics()
                .setDepth(-100);

        const half =
            size / 2;

        lot.buildingSprite = null;
        lot.buildBadge = null;
        lot.buildIcon = null;
        lot.label = null;

        /*
            Once a building exists, the old Ghostlot square is gone.
            The lot has graduated into the settlement and the building itself
            becomes the landmark, matching the Crankhouse treatment.
        */
        if (!builtDefinition) {

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
        }

        if (unlocked) {

            if (builtDefinition) {

                const building =
                    this.add.image(
                        x,
                        y + 6,
                        builtDefinition.texture
                    )
                    .setScale(builtDefinition.scale)
                    .setDepth(y + 4)
                    .setInteractive({
                        useHandCursor: true
                    });

                building.__lotId = id;
                building.__buildingKey = buildingKey;
                building.__blocksWorldInput = true;
                lot.buildingSprite = building;

            } else {

                const claimedBack =
                    this.add.image(
                        x,
                        y,
                        "uiTinyRoundBlue"
                    )
                    .setScale(0.96)
                    .setDepth(-95)
                    .setAlpha(0.98)
                    .setInteractive({
                        useHandCursor: true
                    });

                claimedBack.__lotId = id;
                claimedBack.__buildReady = true;
                claimedBack.__blocksWorldInput = true;

                const claimedIcon =
                    this.add.image(
                        x,
                        y - 1,
                        "uiBuild"
                    )
                    .setScale(0.44)
                    .setDepth(-94)
                    .setTint(0xeaffd7);

                lot.buildBadge = claimedBack;
                lot.buildIcon = claimedIcon;

                this.tweens.add({
                    targets: claimedBack,
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.InOut"
                });

                this.tweens.add({
                    targets: claimedIcon,
                    y: y - 4,
                    duration: 980,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.InOut"
                });
            }

        } else {

            const lockedBack =
                this.add.image(
                    x,
                    y,
                    active
                        ? "uiTinyRoundBlue"
                        : "uiTinyRoundRed"
                )
                .setScale(active ? 0.98 : 0.90)
                .setDepth(-95)
                .setAlpha(active ? 1 : 0.78);

            const lockedIcon =
                this.add.image(
                    x,
                    y - 1,
                    "uiLotLocked"
                )
                .setScale(active ? 0.62 : 0.56)
                .setDepth(-94)
                .setTint(active ? 0xffef9a : 0xe8d8c3)
                .setAlpha(active ? 1 : 0.80);

            if (active) {

                this.tweens.add({
                    targets: lockedBack,
                    scaleX: 1.04,
                    scaleY: 1.04,
                    duration: 720,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.InOut"
                });

                this.tweens.add({
                    targets: lockedIcon,
                    scaleX: 0.67,
                    scaleY: 0.67,
                    angle: 7,
                    duration: 180,
                    yoyo: true,
                    repeat: -1,
                    repeatDelay: 520,
                    ease: "Sine.InOut"
                });
            }
        }

        if (builtDefinition) {

            const labelY =
                y - Math.max(
                    half + 18,
                    112
                );

            lot.label =
                this.add.text(
                    x,
                    labelY,
                    builtDefinition.name.toUpperCase(),
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "21px",
                        color: "#fff1aa",
                        stroke: "#1f2823",
                        strokeThickness: 6,
                        align: "center"
                    }
                )
                .setOrigin(0.5, 1)
                .setDepth(y + 90);

            this.syncBuildingAttentionBadge(lot);

        } else {

            const suffix =
                unlocked
                    ? " • BUILD READY"
                    : active
                        ? " • CALLING"
                        : "";

            lot.label =
                this.add.text(
                    x,
                    y + half + 14,
                    `${id.toUpperCase()}${suffix}`,
                    {
                        fontFamily: FONT_TECH,
                        fontSize: "14px",
                        fontStyle: "bold",
                        color:
                            unlocked
                                ? "#d8ffc0"
                                : active
                                    ? "#fff0a2"
                                    : "#e8e1c3",
                        stroke: "#203021",
                        strokeThickness: 4
                    }
                )
                .setOrigin(0.5, 0)
                .setDepth(-90)
                .setAlpha(
                    unlocked || active
                        ? 0.95
                        : 0.58
                );
        }

        return g;

    }


    clearGhostlotVisual(lot) {

        if (!lot) {
            return;
        }

        for (const key of [
            "graphics",
            "buildBadge",
            "buildIcon",
            "buildingSprite",
            "label",
            "attentionBack",
            "attentionIcon"
        ]) {
            const object = lot[key];
            if (object) {
                this.tweens.killTweensOf(object);
                if (object.active !== false) {
                    object.destroy();
                }
                lot[key] = null;
            }
        }

    }


    getBuildingAttentionState(buildingKey) {

        if (buildingKey === "laurelArchive") {
            const claimable =
                ACHIEVEMENT_DEFS.find(definition =>
                    !this.saveData.claimedAchievements.includes(definition.id) &&
                    Boolean(definition.test(this.saveData))
                );

            if (claimable) {
                return {
                    texture:
                        claimable.reward.dawnseals
                            ? "dawnSealIcon"
                            : claimable.reward.riftglass
                                ? "riftGlassIcon"
                                : "uiValor"
                };
            }
        }

        if (buildingKey === "bountyBell") {
            const { state, definition } =
                ensureRotatingBounty(this.saveData);

            if (
                !state.claimed &&
                Number(state.progress || 0) >= definition.target
            ) {
                return {
                    texture:
                        definition.reward.dawnseals
                            ? "dawnSealIcon"
                            : "riftGlassIcon"
                };
            }
        }

        if (buildingKey === "brassrootInstitute") {
            const affordableResearch =
                TECH_DEFS.some(definition => {
                    const level = this.saveData.tech?.[definition.key] || 0;
                    const cost = techUpgradeCost(definition, level);
                    return Boolean(
                        cost &&
                        this.saveData.dawnseals >= cost.dawnseals &&
                        this.saveData.riftglass >= cost.riftglass
                    );
                });

            if (affordableResearch) {
                return { texture: "dawnSealIcon" };
            }
        }

        if (buildingKey === "fatehouse") {
            if ((this.saveData.fateLastRewardDay ?? -1) !== this.meadowDay) {
                return { texture: "uiCrossed" };
            }
        }

        return null;

    }


    syncBuildingAttentionBadge(lot) {

        if (!lot) {
            return;
        }

        const buildingKey =
            this.saveData.buildings?.[lot.id] || null;

        const state =
            buildingKey
                ? this.getBuildingAttentionState(buildingKey)
                : null;

        if (!state) {
            for (const key of ["attentionBack", "attentionIcon"]) {
                const object = lot[key];
                if (object) {
                    this.tweens.killTweensOf(object);
                    object.destroy();
                    lot[key] = null;
                }
            }
            return;
        }

        const half = lot.size / 2;
        const badgeX = lot.x + Math.min(72, half * 0.72);
        const badgeY = lot.y - Math.max(half + 42, 136);

        if (!lot.attentionBack) {
            lot.attentionBack =
                this.add.image(
                    badgeX,
                    badgeY,
                    "uiTinyRoundBlue"
                )
                .setScale(0.54)
                .setDepth(lot.y + 104);

            lot.attentionIcon =
                this.add.image(
                    badgeX,
                    badgeY,
                    state.texture
                )
                .setScale(0.28)
                .setDepth(lot.y + 105);

            this.tweens.add({
                targets: [
                    lot.attentionBack,
                    lot.attentionIcon
                ],
                y: badgeY - 7,
                duration: 620,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut"
            });
        } else {
            lot.attentionBack.setPosition(badgeX, badgeY);
            lot.attentionIcon
                .setPosition(badgeX, badgeY)
                .setTexture(state.texture);
        }

    }


    refreshBuildingAttentionBadges() {

        if (!this.ghostlots) {
            return;
        }

        for (const lot of this.ghostlots) {
            if (this.saveData.buildings?.[lot.id]) {
                this.syncBuildingAttentionBadge(lot);
            }
        }

    }


    animateConstructedBuilding(lot, definition) {

        const building = lot?.buildingSprite;

        if (!building || !definition) {
            return;
        }

        const finalY = lot.y + 6;

        building
            .setScale(0.08)
            .setAlpha(0.15)
            .setY(finalY + 54);

        if (lot.label) {
            lot.label
                .setAlpha(0)
                .setY(lot.label.y + 14);
        }

        for (let i = 0; i < 7; i++) {
            const angle =
                (Math.PI * 2 * i) / 7;

            const shard =
                this.add.image(
                    lot.x,
                    lot.y + 12,
                    "riftGlassIcon"
                )
                .setScale(0.20 + (i % 3) * 0.03)
                .setDepth(lot.y + 95)
                .setAlpha(0.9);

            this.tweens.add({
                targets: shard,
                x: lot.x + Math.cos(angle) * (58 + (i % 2) * 22),
                y: lot.y + Math.sin(angle) * 38 - 24,
                alpha: 0,
                scaleX: 0.08,
                scaleY: 0.08,
                duration: 480 + i * 34,
                ease: "Quad.Out",
                onComplete: () => shard.destroy()
            });
        }

        this.tweens.add({
            targets: building,
            y: finalY,
            scaleX: definition.scale,
            scaleY: definition.scale,
            alpha: 1,
            duration: 680,
            ease: "Back.Out"
        });

        if (lot.label) {
            this.tweens.add({
                targets: lot.label,
                y: lot.label.y - 14,
                alpha: 1,
                delay: 220,
                duration: 360,
                ease: "Quad.Out"
            });
        }

        this.cameras.main.flash(
            150,
            196,
            226,
            255
        );

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


    shouldSpawnRiftReliquary() {

        /*
            The first Riftfall is guaranteed so the new system can be discovered.
            After that the anomaly is intermittent but deterministic for the current
            settlement state, so simply reopening a menu cannot reroll it.
        */
        if (
            (this.saveData.invasionWins || 0) === 0 ||
            (this.saveData.unlockedLots?.length || 0) >= 8
        ) {
            return true;
        }

        const roll =
            (
                (this.saveData.invasionWins || 0) * 47 +
                (this.saveData.unlockedLots?.length || 0) * 19
            ) % 100;

        return roll < 68;

    }


    createRiftReliquary() {

        this.riftReliquary = null;
        this.riftReliquaryPrompt = null;
        this.riftReliquaryButton = null;

        if (!this.shouldSpawnRiftReliquary()) {
            return;
        }

        const rng = this.makeRng(
            0x52494654 ^
            ((this.saveData.invasionWins || 0) + 1) * 7919 ^
            ((this.saveData.unlockedLots?.length || 0) + 3) * 3571
        );

        let point = null;

        for (let attempt = 0; attempt < 40; attempt++) {
            const angle = rng() * Math.PI * 2;
            const radius = 610 + rng() * 210;
            const x = Phaser.Math.Clamp(
                this.worldCenter.x + Math.cos(angle) * radius,
                150,
                WORLD_SIZE - 150
            );
            const y = Phaser.Math.Clamp(
                this.worldCenter.y + Math.sin(angle) * radius,
                180,
                WORLD_SIZE - 170
            );

            const collidesLot =
                this.ghostlots?.some(lot =>
                    Phaser.Math.Distance.Between(
                        x,
                        y,
                        lot.x,
                        lot.y
                    ) < lot.size * 0.75 + 105
                );

            if (!collidesLot) {
                point = { x, y };
                break;
            }
        }

        point ||= {
            x: this.worldCenter.x + 700,
            y: this.worldCenter.y - 470
        };

        const tower =
            this.add.image(
                point.x,
                point.y,
                "riftReliquary"
            )
            .setScale(0.82)
            .setDepth(point.y + 6)
            .setInteractive({
                useHandCursor: true
            });

        tower.__blocksWorldInput = true;
        tower.__riftReliquary = true;

        const sigil =
            this.add.image(
                point.x,
                point.y - 116,
                "riftGlassIcon"
            )
            .setScale(0.72)
            .setDepth(point.y + 18);

        this.tweens.add({
            targets: sigil,
            y: point.y - 128,
            scaleX: 0.80,
            scaleY: 0.80,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut"
        });

        const label =
            this.add.text(
                point.x,
                point.y + 148,
                "NIGHTGLASS RELIQUARY",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "18px",
                    color: "#d9c5ff",
                    stroke: "#161220",
                    strokeThickness: 5
                }
            )
            .setOrigin(0.5)
            .setDepth(point.y + 20);

        const prompt =
            this.add.container(
                point.x,
                point.y - 188
            )
            .setDepth(50020)
            .setVisible(false);

        const bubble = this.add.graphics();
        bubble.fillStyle(THEME.ink, 0.97);
        bubble.fillRoundedRect(-154, -50, 308, 100, 22);
        bubble.lineStyle(3, 0xb884ff, 0.80);
        bubble.strokeRoundedRect(-154, -50, 308, 100, 22);
        bubble.fillStyle(THEME.ink, 0.97);
        bubble.fillTriangle(-12, 50, 12, 50, 0, 67);

        const title =
            this.add.text(
                -134,
                -35,
                "RIFTFALL",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "20px",
                    color: "#eadcff"
                }
            );

        const sub =
            this.add.text(
                -134,
                -5,
                "SURVIVE THE NIGHT • KEEP WHAT YOU COLLECT",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "10px",
                    fontStyle: "bold",
                    color: "#aab3c7"
                }
            );

        const play =
            this.add.image(
                111,
                1,
                "uiRoundRed"
            )
            .setScale(0.66)
            .setInteractive({
                useHandCursor: true
            });

        play.__blocksWorldInput = true;

        const playIcon =
            this.add.image(
                111,
                1,
                "riftGlassIcon"
            )
            .setScale(0.46);

        prompt.add([
            bubble,
            title,
            sub,
            play,
            playIcon
        ]);

        play.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            this.beginRiftfall();
        });

        tower.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation?.();

            const distance =
                Phaser.Math.Distance.Between(
                    this.player?.x ?? this.worldCenter.x,
                    this.player?.y ?? this.worldCenter.y,
                    point.x,
                    point.y
                );

            if (distance > 250) {
                this.walkTo(point.x, point.y + 105);
                this.showHudToast("The Reliquary is calling. Get closer.");
                return;
            }

            prompt.setVisible(true);
        });

        this.riftReliquary = tower;
        this.riftReliquaryPoint = point;
        this.riftReliquaryPrompt = prompt;
        this.riftReliquaryLabel = label;

    }


    updateRiftReliquaryPrompt() {

        if (!this.riftReliquary || !this.riftReliquaryPrompt || !this.player) {
            return;
        }

        const near =
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.riftReliquary.x,
                this.riftReliquary.y
            ) < 255;

        this.riftReliquaryPrompt.setVisible(near);

    }


    beginRiftfall() {

        if (!this.riftReliquary || this.claimrunLaunching) {
            return;
        }

        this.claimrunLaunching = true;
        this.moveTarget = null;
        this.persistMeadowClimate();
        AudioDirector.playEffect("click");

        this.cameras.main.fadeOut(
            240,
            18,
            10,
            30
        );

        this.time.delayedCall(
            255,
            () => {
                this.physics.resume();
                this.scene.start(
                    "InvasionScene",
                    {
                        x: this.player.x,
                        y: this.player.y,
                        riftX: this.riftReliquary.x,
                        riftY: this.riftReliquary.y,
                        meadowClock: this.meadowClock,
                        meadowDay: this.meadowDay,
                        weather: this.currentWeather
                    }
                );
            }
        );

    }


    createHollowroadGate() {

        this.hollowroadGate = null;
        this.hollowroadPoint = null;
        this.hollowroadPrompt = null;

        if ((this.saveData.invasionWins || 0) < 1) {
            return;
        }

        const candidates = [
            { x: 360, y: 390 },
            { x: WORLD_SIZE - 360, y: 410 },
            { x: 390, y: WORLD_SIZE - 390 },
            { x: WORLD_SIZE - 390, y: WORLD_SIZE - 390 },
            { x: WORLD_SIZE / 2 - 760, y: WORLD_SIZE / 2 + 650 },
            { x: WORLD_SIZE / 2 + 760, y: WORLD_SIZE / 2 - 650 }
        ];

        const offset =
            ((this.saveData.hollowWins || 0) + this.meadowDay) %
            candidates.length;

        const ordered =
            candidates.slice(offset)
                .concat(candidates.slice(0, offset));

        const isClear = point => {
            if (
                Phaser.Math.Distance.Between(
                    point.x,
                    point.y,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 470
            ) {
                return false;
            }

            if (
                this.ghostlots?.some(lot =>
                    Phaser.Math.Distance.Between(
                        point.x,
                        point.y,
                        lot.x,
                        lot.y
                    ) < 210
                )
            ) {
                return false;
            }

            if (
                this.riftReliquaryPoint &&
                Phaser.Math.Distance.Between(
                    point.x,
                    point.y,
                    this.riftReliquaryPoint.x,
                    this.riftReliquaryPoint.y
                ) < 310
            ) {
                return false;
            }

            if (
                this.moonpondPoint &&
                Phaser.Math.Distance.Between(
                    point.x,
                    point.y,
                    this.moonpondPoint.x,
                    this.moonpondPoint.y
                ) < 310
            ) {
                return false;
            }

            return true;
        };

        const point =
            ordered.find(isClear) ||
            { x: 360, y: 390 };

        this.add.ellipse(
            point.x,
            point.y + 72,
            190,
            70,
            0x160b19,
            0.35
        )
        .setDepth(point.y - 2);

        const gate =
            this.add.image(
                point.x,
                point.y,
                "hollowDoor"
            )
            .setScale(0.72)
            .setDepth(point.y + 2)
            .setInteractive({ useHandCursor: true });

        gate.__blocksWorldInput = true;

        const aura =
            this.add.image(
                point.x,
                point.y - 24,
                "riftGlassIcon"
            )
            .setScale(0.48)
            .setTint(0xd6a2ff)
            .setAlpha(0.56)
            .setDepth(point.y + 3);

        this.tweens.add({
            targets: aura,
            y: point.y - 42,
            alpha: 0.90,
            scaleX: 0.58,
            scaleY: 0.58,
            duration: 1250,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        const label =
            this.add.text(
                point.x,
                point.y - 150,
                "THE BACKWARD DOOR",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "22px",
                    color: "#f1d8ff",
                    stroke: "#170d1d",
                    strokeThickness: 6
                }
            )
            .setOrigin(0.5)
            .setDepth(point.y + 4);

        const record =
            this.add.text(
                point.x,
                point.y + 116,
                `HOLLOWROAD • CLEARS ${this.saveData.hollowWins || 0} • RELICS ${(this.saveData.relics || []).length}/4`,
                {
                    fontFamily: FONT_TECH,
                    fontSize: "12px",
                    fontStyle: "bold",
                    color: "#cbb4da",
                    stroke: "#170d1d",
                    strokeThickness: 4
                }
            )
            .setOrigin(0.5)
            .setDepth(point.y + 4);

        const prompt =
            this.add.container(
                point.x,
                point.y + 178
            )
            .setDepth(50002)
            .setVisible(false);

        const promptButton =
            this.add.image(0, 0, "uiRoundRed")
                .setScale(0.70)
                .setInteractive({ useHandCursor: true });

        const promptIcon =
            this.add.image(0, -2, "uiSword")
                .setScale(0.36);

        const promptText =
            this.add.text(
                0,
                47,
                "COUNTERATTACK",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "12px",
                    fontStyle: "bold",
                    color: "#ffe7ff",
                    stroke: "#160b18",
                    strokeThickness: 4
                }
            )
            .setOrigin(0.5);

        prompt.add([
            promptButton,
            promptIcon,
            promptText
        ]);

        const tryEnter = () => {
            const near =
                this.player &&
                Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    point.x,
                    point.y
                ) < 265;

            if (!near) {
                this.showHudToast(
                    "The Backward Door only opens for someone standing beside it."
                );
                return;
            }

            this.beginHollowroad();
        };

        gate.on("pointerdown", tryEnter);
        promptButton.on("pointerdown", tryEnter);

        this.hollowroadGate = gate;
        this.hollowroadPoint = point;
        this.hollowroadPrompt = prompt;
        this.hollowroadLabel = label;
        this.hollowroadRecord = record;

    }


    updateHollowroadPrompt() {

        if (!this.hollowroadGate || !this.hollowroadPrompt || !this.player) {
            return;
        }

        const near =
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.hollowroadGate.x,
                this.hollowroadGate.y
            ) < 265;

        this.hollowroadPrompt.setVisible(near);

    }


    beginHollowroad() {

        if (!this.hollowroadGate || this.claimrunLaunching) {
            return;
        }

        this.claimrunLaunching = true;
        this.moveTarget = null;
        this.persistMeadowClimate();
        AudioDirector.playEffect("click");

        this.cameras.main.fadeOut(
            240,
            20,
            8,
            30
        );

        this.time.delayedCall(
            255,
            () => {
                if (this.physics?.world) {
                    this.physics.resume();
                }

                this.scene.start(
                    "HollowroadScene",
                    {
                        x: this.player.x,
                        y: this.player.y,
                        gateX: this.hollowroadGate.x,
                        gateY: this.hollowroadGate.y,
                        meadowClock: this.meadowClock,
                        meadowDay: this.meadowDay,
                        weather: this.currentWeather
                    }
                );
            }
        );

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

            if (
                this.riftReliquaryPoint &&
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.riftReliquaryPoint.x,
                    this.riftReliquaryPoint.y
                ) < 190
            ) {
                continue;
            }

            if (
                this.moonpondPoint &&
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.moonpondPoint.x,
                    this.moonpondPoint.y
                ) < 190
            ) {
                continue;
            }

            if (
                this.hollowroadPoint &&
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.hollowroadPoint.x,
                    this.hollowroadPoint.y
                ) < 220
            ) {
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
                (
                    this.riftReliquaryPoint &&
                    Phaser.Math.Distance.Between(
                        centerX,
                        centerY,
                        this.riftReliquaryPoint.x,
                        this.riftReliquaryPoint.y
                    ) < 235
                ) ||
                (
                    this.hollowroadPoint &&
                    Phaser.Math.Distance.Between(
                        centerX,
                        centerY,
                        this.hollowroadPoint.x,
                        this.hollowroadPoint.y
                    ) < 250
                ) ||
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

                if (
                    nearLot ||
                    (
                        this.riftReliquaryPoint &&
                        Phaser.Math.Distance.Between(
                            treeX,
                            treeY,
                            this.riftReliquaryPoint.x,
                            this.riftReliquaryPoint.y
                        ) < 165
                    ) ||
                    (
                        this.hollowroadPoint &&
                        Phaser.Math.Distance.Between(
                            treeX,
                            treeY,
                            this.hollowroadPoint.x,
                            this.hollowroadPoint.y
                        ) < 185
                    )
                ) {
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
                ) ||
                (
                    this.hollowroadPoint &&
                    Phaser.Math.Distance.Between(
                        centerX,
                        centerY,
                        this.hollowroadPoint.x,
                        this.hollowroadPoint.y
                    ) < 260
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


        for (const [key, texture, end, frameRate, repeat] of [
            ["crankhand-idle", "crankhandIdle", 7, 7, -1],
            ["crankhand-run", "crankhandRun", 5, 11, -1],
            ["crankhand-work", "crankhandInteract", 2, 10, 0]
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
                    repeat
                });
            }
        }


        this.player.play(
            "pip-idle"
        );

    }


    createCrankhouseHelpers() {

        if (this.crankhouseHelpers) {
            for (const helper of this.crankhouseHelpers) {
                this.tweens.killTweensOf(helper.sprite);
                if (helper.sprite?.active) {
                    helper.sprite.destroy();
                }
            }
        }

        this.crankhouseHelpers = [];
        this.helperDispatchIndex = 0;

        const helperLevel =
            Phaser.Math.Clamp(
                Math.floor(Number(this.saveData.autoCrankLevel) || 0),
                0,
                5
            );

        /*
            One visible worker per helper level.
            The worker sprite itself communicates the state; no fake beds / Z shapes.
        */
        const helperSpots = [
            {
                restX: this.worldCenter.x - 205,
                restY: this.worldCenter.y + 130,
                workX: this.worldCenter.x - 63,
                workY: this.worldCenter.y + 82,
                tint: 0xd8efff
            },
            {
                restX: this.worldCenter.x + 205,
                restY: this.worldCenter.y + 132,
                workX: this.worldCenter.x + 63,
                workY: this.worldCenter.y + 82,
                tint: 0xffdfaf
            },
            {
                restX: this.worldCenter.x - 185,
                restY: this.worldCenter.y - 102,
                workX: this.worldCenter.x - 70,
                workY: this.worldCenter.y - 34,
                tint: 0xc9f6c2
            },
            {
                restX: this.worldCenter.x + 185,
                restY: this.worldCenter.y - 96,
                workX: this.worldCenter.x + 70,
                workY: this.worldCenter.y - 34,
                tint: 0xffc1d7
            },
            {
                restX: this.worldCenter.x,
                restY: this.worldCenter.y + 220,
                workX: this.worldCenter.x,
                workY: this.worldCenter.y + 103,
                tint: 0xe5d2ff
            }
        ];

        helperSpots
            .slice(0, helperLevel)
            .forEach((spot, index) => {

                const sprite =
                    this.add.sprite(
                        spot.restX,
                        spot.restY,
                        "crankhandIdle",
                        index % 8
                    )
                    .setOrigin(0.5, 0.72)
                    .setScale(0.36)
                    .setTint(spot.tint)
                    .setDepth(spot.restY + 8)
                    .play("crankhand-idle");

                this.crankhouseHelpers.push({
                    ...spot,
                    sprite,
                    busy: false,
                    index,
                    cranksPerVisit: 1
                });

            });

    }


    createNavigationIndicators() {

        this.navIndicators = [];
        this.navIndicatorActions = [];

        const makeIndicator = ({ key, label, iconTexture, iconScale, targetProvider }) => {

            const root =
                this.add.container(0, 0)
                    .setVisible(false)
                    .setDepth(135000);

            const plate =
                this.add.image(0, 0, "uiTinyRoundBlue")
                    .setScale(0.92);

            const icon =
                this.add.image(0, 1, iconTexture)
                    .setScale(iconScale);

            const arrow =
                this.add.image(0, -35, "navArrow")
                    .setScale(1.65);

            const tag =
                this.add.text(
                    0,
                    37,
                    label,
                    {
                        fontFamily: FONT_TECH,
                        fontSize: "10px",
                        fontStyle: "bold",
                        color: "#fff3c5",
                        stroke: "#0b111a",
                        strokeThickness: 4
                    }
                )
                .setOrigin(0.5);

            root.add([plate, icon, arrow, tag]);
            this.hudRoot.add(root);

            const indicator = {
                key,
                root,
                plate,
                icon,
                arrow,
                tag,
                targetProvider,
                currentTarget: null
            };

            this.navIndicators.push(indicator);
            this.navIndicatorActions.push(indicator);

            return indicator;

        };

        makeIndicator({
            key: "crankhouse",
            label: "CRANK",
            iconTexture: "crankhouse",
            iconScale: 0.24,
            targetProvider: () => ({
                x: this.worldCenter.x,
                y: this.worldCenter.y,
                name: "Crankhouse"
            })
        });

        makeIndicator({
            key: "calling",
            label: "CLAIM",
            iconTexture: "uiLotLocked",
            iconScale: 0.42,
            targetProvider: () =>
                this.activeGhostlot
                    ? {
                        x: this.activeGhostlot.x,
                        y: this.activeGhostlot.y,
                        name: this.activeGhostlot.id
                    }
                    : null
        });

        makeIndicator({
            key: "build",
            label: "BUILD",
            iconTexture: "uiBuild",
            iconScale: 0.42,
            targetProvider: () => {
                const site = this.getClosestBuildReadyLot();
                return site
                    ? { x: site.x, y: site.y, name: site.id }
                    : null;
            }
        });

        makeIndicator({
            key: "rift",
            label: "RIFT",
            iconTexture: "riftGlassIcon",
            iconScale: 0.46,
            targetProvider: () =>
                this.riftReliquary
                    ? {
                        x: this.riftReliquary.x,
                        y: this.riftReliquary.y,
                        name: "Nightglass Reliquary"
                    }
                    : null
        });

        makeIndicator({
            key: "moonpond",
            label: "POND",
            iconTexture: "moonpondIcon",
            iconScale: 0.50,
            targetProvider: () =>
                this.moonpond
                    ? {
                        x: this.moonpondPoint.x,
                        y: this.moonpondPoint.y,
                        name: "Moonpond"
                    }
                    : null
        });

        makeIndicator({
            key: "hollowroad",
            label: "ROAD",
            iconTexture: "uiSword",
            iconScale: 0.38,
            targetProvider: () =>
                this.hollowroadGate
                    ? {
                        x: this.hollowroadGate.x,
                        y: this.hollowroadGate.y,
                        name: "The Backward Door"
                    }
                    : null
        });

    }


    getClosestBuildReadyLot() {

        if (!this.player || !this.ghostlots) {
            return null;
        }

        const candidates =
            this.ghostlots
                .filter(
                    lot =>
                        lot.unlocked &&
                        !this.saveData.buildings?.[lot.id]
                )
                .sort(
                    (a, b) =>
                        Phaser.Math.Distance.Between(
                            this.player.x,
                            this.player.y,
                            a.x,
                            a.y
                        )
                        -
                        Phaser.Math.Distance.Between(
                            this.player.x,
                            this.player.y,
                            b.x,
                            b.y
                        )
                );

        return candidates[0] || null;

    }


    updateNavigationIndicators() {

        if (!this.navIndicators?.length) {
            return;
        }

        const camera = this.cameras.main;
        const safe = {
            left: 54,
            right: GAME_WIDTH - 54,
            top: 166,
            bottom: GAME_HEIGHT - 92
        };

        const centerX = GAME_WIDTH / 2;
        const centerY = (safe.top + safe.bottom) / 2;
        const occupied = [];

        for (const indicator of this.navIndicators) {

            const target = indicator.targetProvider?.();
            indicator.currentTarget = target;

            if (!target) {
                indicator.root.setVisible(false);
                continue;
            }

            const screenX =
                (target.x - camera.worldView.x) * camera.zoom;
            const screenY =
                (target.y - camera.worldView.y) * camera.zoom;

            const onScreen =
                screenX >= safe.left + 18 &&
                screenX <= safe.right - 18 &&
                screenY >= safe.top + 18 &&
                screenY <= safe.bottom - 18;

            if (onScreen) {
                indicator.root.setVisible(false);
                continue;
            }

            const dx = screenX - centerX;
            const dy = screenY - centerY;
            const candidates = [];

            if (Math.abs(dx) > 0.001) {
                candidates.push(
                    dx > 0
                        ? (safe.right - centerX) / dx
                        : (safe.left - centerX) / dx
                );
            }

            if (Math.abs(dy) > 0.001) {
                candidates.push(
                    dy > 0
                        ? (safe.bottom - centerY) / dy
                        : (safe.top - centerY) / dy
                );
            }

            const positiveCandidates =
                candidates.filter(value => value > 0);

            const t =
                positiveCandidates.length
                    ? Math.min(...positiveCandidates)
                    : 1;

            let x =
                Phaser.Math.Clamp(
                    centerX + dx * t,
                    safe.left,
                    safe.right
                );

            let y =
                Phaser.Math.Clamp(
                    centerY + dy * t,
                    safe.top,
                    safe.bottom
                );

            for (const used of occupied) {
                if (
                    Phaser.Math.Distance.Between(
                        x,
                        y,
                        used.x,
                        used.y
                    ) < 58
                ) {
                    const nudge = y < centerY ? 58 : -58;
                    y = Phaser.Math.Clamp(
                        y + nudge,
                        safe.top,
                        safe.bottom
                    );
                }
            }

            occupied.push({ x, y });

            const angle = Math.atan2(dy, dx);

            indicator.root
                .setPosition(x, y)
                .setVisible(true);

            indicator.arrow.setPosition(
                Math.cos(angle) * 34,
                Math.sin(angle) * 34
            );

            // Source arrow points down; rotate that direction toward the target.
            indicator.arrow.setRotation(angle - Math.PI / 2);

        }

    }


    handleNavigationIndicatorTap(pointer) {

        const hit =
            this.navIndicatorActions
                ?.slice()
                .reverse()
                .find(indicator =>
                    indicator.root.visible &&
                    Phaser.Math.Distance.Between(
                        pointer.x,
                        pointer.y,
                        indicator.root.x,
                        indicator.root.y
                    ) <= 34
                );

        if (!hit?.currentTarget) {
            return false;
        }

        AudioDirector.playEffect("click");

        this.walkTo(
            hit.currentTarget.x,
            hit.currentTarget.y
        );

        return true;

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
                    Scroll an open settlement menu instead of zooming the meadow.
                */
                if (this.hubPanel && this.hubScroll) {
                    this.scrollHubBy(deltaY * 0.72);
                    return;
                }

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
                    this.beginHubPointer(pointer);
                    return;
                }

                if (this.handleNavigationIndicatorTap(pointer)) {
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

                const clickedLotObject =
                    currentlyOver &&
                    currentlyOver.find(
                        object => object?.__lotId
                    );

                if (clickedLotObject) {
                    const lot =
                        this.findGhostlotById(
                            clickedLotObject.__lotId
                        );

                    if (lot?.unlocked) {
                        AudioDirector.playEffect("click");
                        this.handleClaimedLotTap(lot);
                        return;
                    }
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
                    pointer.y < 160 ||
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
            pointer => {

                if (this.hubPanel && this.updateHubPointer(pointer)) {
                    return;
                }

                this.updatePinchZoom();

            }
        );


        this.input.on(
            "pointerup",
            pointer => {

                if (this.finishHubPointer(pointer)) {
                    return;
                }

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
            pointer => {

                if (this.finishHubPointer(pointer, true)) {
                    return;
                }

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
            138,
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
            138,
            20
        );


        top.lineStyle(
            3,
            THEME.gold,
            0.32
        );


        top.lineBetween(
            30,
            150,
            690,
            150
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

        this.riftGlassHud =
            this.createCurrencyChip(
                430,
                108,
                "riftGlassIcon",
                0.48,

                "Riftglass",

                "Dropped by Riftfall invaders. Builds on claimed Ghostlots."
            );

        this.dawnSealHud =
            this.createCurrencyChip(
                558,
                108,
                "dawnSealIcon",
                0.48,

                "Dawnseals",

                "Earned by surviving Riftfall. Powers Brassroot research."
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

        this.createNavigationIndicators();

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

        this.hubPointerState = null;

        if (this.hubScroll?.mask?.destroy) {
            this.hubScroll.mask.destroy();
        }

        this.hubScroll = null;

        if (this.hubPanel) {
            this.hubPanel.destroy(true);
            this.hubPanel = null;
        }

        this.hubActionZones = [];

    }


    getHubActionAt(pointer) {

        if (!this.hubActionZones?.length) {
            return null;
        }

        return this.hubActionZones
            .slice()
            .reverse()
            .find(action => {

                if (action.enabled === false) {
                    return false;
                }

                if (
                    action.scrollable &&
                    this.hubScroll &&
                    (
                        pointer.y < this.hubScroll.viewportTop ||
                        pointer.y > this.hubScroll.viewportBottom
                    )
                ) {
                    return false;
                }

                return (
                    Math.abs(pointer.x - action.x) <= action.width / 2 &&
                    Math.abs(pointer.y - action.y) <= action.height / 2
                );
            }) || null;

    }


    beginHubPointer(pointer) {

        if (!this.hubPanel || !this.hubScroll) {
            return;
        }

        const bounds = this.hubScroll.panelBounds;

        if (
            pointer.x < bounds.left ||
            pointer.x > bounds.right ||
            pointer.y < bounds.top ||
            pointer.y > bounds.bottom
        ) {
            this.closeHubPanel();
            return;
        }

        this.hubPointerState = {
            id: pointer.id,
            startX: pointer.x,
            startY: pointer.y,
            lastY: pointer.y,
            dragged: false,
            pendingAction: this.getHubActionAt(pointer),
            canScroll:
                this.hubScroll.maxScroll > 0 &&
                pointer.y >= this.hubScroll.viewportTop &&
                pointer.y <= this.hubScroll.viewportBottom
        };

    }


    updateHubPointer(pointer) {

        const state = this.hubPointerState;

        if (!state || state.id !== pointer.id) {
            return false;
        }

        const dy = pointer.y - state.lastY;
        const total = Math.hypot(
            pointer.x - state.startX,
            pointer.y - state.startY
        );

        if (state.canScroll && total > 8) {
            state.dragged = true;
        }

        if (state.dragged) {
            this.scrollHubBy(-dy);
        }

        state.lastY = pointer.y;
        return true;

    }


    finishHubPointer(pointer, cancelled = false) {

        const state = this.hubPointerState;

        if (!state || state.id !== pointer.id) {
            return false;
        }

        this.hubPointerState = null;

        if (
            !cancelled &&
            !state.dragged &&
            state.pendingAction
        ) {
            const currentAction =
                this.getHubActionAt(pointer);

            if (currentAction === state.pendingAction) {
                state.pendingAction.callback?.();
            }
        }

        return true;

    }


    scrollHubBy(delta) {

        if (!this.hubScroll || this.hubScroll.maxScroll <= 0) {
            return;
        }

        this.setHubScrollOffset(
            this.hubScroll.offset + delta
        );

    }


    setHubScrollOffset(offset) {

        const scroll = this.hubScroll;

        if (!scroll) {
            return;
        }

        scroll.offset =
            Phaser.Math.Clamp(
                offset,
                0,
                scroll.maxScroll
            );

        scroll.content.y =
            scroll.viewportTop - scroll.offset;

        for (const zone of scroll.rowZones) {
            zone.y =
                scroll.viewportTop +
                zone.contentY -
                scroll.offset;

            const rowTop =
                zone.y - zone.height / 2;

            const rowBottom =
                zone.y + zone.height / 2;

            /*
                The header/footer curtains clip rows while they travel through
                the panel chrome. Once a row would actually cross the rounded
                panel's outer edge, hide the row entirely so no text, preview
                art, card geometry or price icon can leak into the darkened
                world above/below the modal.

                We intentionally do this in HUD coordinates instead of using a
                Phaser GeometryMask: the HUD is inverse-scaled against camera
                zoom, while renderer masks live in a different transform space.
            */
            const insidePanelShell =
                rowTop >= scroll.visualClipTop &&
                rowBottom <= scroll.visualClipBottom;

            for (const visual of zone.visuals || []) {
                if (visual?.active) {
                    visual.setVisible(insidePanelShell);
                }
            }

            zone.enabled =
                insidePanelShell &&
                rowBottom >= scroll.viewportTop &&
                rowTop <= scroll.viewportBottom;
        }

        if (scroll.thumb) {
            const travel =
                scroll.viewportHeight -
                scroll.thumbHeight;

            scroll.thumb.y =
                scroll.viewportTop +
                scroll.thumbHeight / 2 +
                (
                    scroll.maxScroll > 0
                        ? travel * (scroll.offset / scroll.maxScroll)
                        : 0
                );
        }

    }


    openHubPanel(title, subtitle, rows, options = {}) {

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

        const manyRows = rows.length > 3;
        const panelTop = manyRows ? 150 : 292;
        const panelHeight = manyRows ? 980 : 660;
        const panelBottom = panelTop + panelHeight;
        const headerHeight = options.heroTexture ? 154 : 136;
        const footerHeight = 92;
        const viewportTop = panelTop + headerHeight;
        const viewportBottom = panelBottom - footerHeight;
        const viewportHeight = viewportBottom - viewportTop;
        const rowHeight = 104;
        const rowGap = 14;
        const rowStep = rowHeight + rowGap;
        const contentHeight =
            Math.max(
                viewportHeight,
                rows.length * rowStep + 8
            );

        const panel =
            this.add.graphics();

        panel.fillStyle(0x0d1724, 0.99);
        panel.fillRoundedRect(42, panelTop, 636, panelHeight, 28);
        panel.lineStyle(3, THEME.gold, 0.55);
        panel.strokeRoundedRect(42, panelTop, 636, panelHeight, 28);
        panel.lineStyle(2, 0xffffff, 0.08);
        panel.lineBetween(68, viewportTop - 12, 652, viewportTop - 12);

        // Hero panels reserve the left side for the actual building art.
        // The old value (394) was used with a left origin, which pushed the
        // title/subtitle beyond the right edge of the 720px viewport.
        const headerX = options.heroTexture ? 190 : GAME_WIDTH / 2;

        const heading =
            this.add.text(
                headerX,
                panelTop + 42,
                title,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: options.heroTexture ? "30px" : "34px",
                    color: "#fff0a2",
                    align: options.heroTexture ? "left" : "center",
                    wordWrap: { width: options.heroTexture ? 430 : 560 }
                }
            )
            .setOrigin(options.heroTexture ? 0 : 0.5, 0.5);

        const detail =
            this.add.text(
                headerX,
                panelTop + 82,
                subtitle,
                {
                    fontFamily: FONT_BODY,
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#bdc9d5",
                    align: options.heroTexture ? "left" : "center",
                    wordWrap: { width: options.heroTexture ? 430 : 540 }
                }
            )
            .setOrigin(options.heroTexture ? 0 : 0.5, 0);

        root.add([
            shade,
            panel,
            heading,
            detail
        ]);

        let heroPlate = null;
        let hero = null;

        if (options.heroTexture) {
            heroPlate =
                this.add.image(
                    118,
                    panelTop + 74,
                    "uiTinyRoundBlue"
                )
                .setScale(1.38)
                .setAlpha(0.92);

            hero =
                this.add.image(
                    118,
                    panelTop + 76,
                    options.heroTexture
                )
                .setScale(options.heroScale || 0.34);

            root.add([heroPlate, hero]);
        }

        const scrollContent =
            this.add.container(0, viewportTop);

        root.add(scrollContent);

        /*
            Do not use a Phaser GeometryMask for settlement menus.

            hudRoot is inverse-scaled to compensate for camera zoom. Geometry
            masks live in renderer/world space, so nesting one under this HUD
            caused the mask and its content to disagree about coordinates on
            some camera zooms. The result was an apparently empty building
            panel even though every row existed.

            Instead the list remains a normal Container and opaque HUD-space
            curtains cover anything that scrolls above/below the viewport.
            This is boring, deterministic and works at every Nullmeadow zoom.
        */
        const mask = null;

        const rowZones = [];

        rows.forEach((row, index) => {

            const localY =
                8 + index * rowStep;

            const y = localY + rowHeight / 2;
            const contentX = row.previewTexture ? 178 : 92;

            const card =
                this.add.graphics();

            card.fillStyle(
                row.ready === false
                    ? 0x241e28
                    : 0x172638,
                0.98
            );
            card.fillRoundedRect(70, localY, 568, rowHeight, 18);
            card.lineStyle(
                2,
                row.ready === false
                    ? THEME.red
                    : THEME.cyan,
                row.highlight ? 0.62 : 0.28
            );
            card.strokeRoundedRect(70, localY, 568, rowHeight, 18);

            const titleText =
                this.add.text(
                    contentX,
                    localY + 14,
                    row.title,
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "21px",
                        color: row.ready === false
                            ? "#ffabb3"
                            : "#eff4e8",
                        wordWrap: {
                            width: row.previewTexture ? 300 : 390
                        }
                    }
                );

            const descriptionText =
                this.add.text(
                    contentX,
                    localY + 43,
                    row.description,
                    {
                        fontFamily: FONT_BODY,
                        fontSize: "14px",
                        fontStyle: "bold",
                        color: "#aebdca",
                        wordWrap: {
                            width: row.previewTexture ? 302 : 394
                        },
                        lineSpacing: 1
                    }
                );

            const actionText =
                this.add.text(
                    625,
                    localY + 22,
                    row.action || "OPEN",
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: "12px",
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

            if (row.previewTexture) {
                const previewPlate =
                    this.add.image(
                        124,
                        y,
                        row.ready === false
                            ? "uiTinyRoundRed"
                            : "uiTinyRoundBlue"
                    )
                    .setScale(0.78)
                    .setAlpha(0.88);

                const preview =
                    this.add.image(
                        124,
                        y,
                        row.previewTexture
                    )
                    .setScale(
                        row.previewScale ||
                        0.22
                    );

                rowChildren.push(previewPlate, preview);
            }

            const costs =
                Array.isArray(row.costs)
                    ? row.costs
                    : row.currencyIcon && Number.isFinite(row.costAmount)
                        ? [{
                            icon: row.currencyIcon,
                            amount: row.costAmount
                        }]
                        : [];

            costs.slice(0, 2).forEach((cost, costIndex) => {
                const costY =
                    localY + 52 + costIndex * 25;

                const costIcon =
                    this.add.image(
                        548,
                        costY,
                        cost.icon
                    )
                    .setScale(0.26);

                const costAmount =
                    this.add.text(
                        565,
                        costY,
                        compactAmount(cost.amount),
                        {
                            fontFamily: FONT_DISPLAY,
                            fontSize: "17px",
                            color: row.ready === false
                                ? "#ff9da8"
                                : "#ffd660"
                        }
                    )
                    .setOrigin(0, 0.5);

                rowChildren.push(costIcon, costAmount);
            });

            scrollContent.add(rowChildren);

            const zone = {
                x: 354,
                y: viewportTop + y,
                contentY: y,
                width: 568,
                height: rowHeight,
                scrollable: true,
                enabled: true,
                visuals: rowChildren,
                callback: () => {
                    if (row.ready === false) {
                        AudioDirector.playEffect("hit");
                        this.showHudToast(
                            row.lockedMessage ||
                            "That option is not available yet."
                        );
                        return;
                    }

                    AudioDirector.playEffect("click");
                    row.callback?.();
                }
            };

            rowZones.push(zone);
            this.hubActionZones.push(zone);
        });

        /*
            HUD-space clipping curtains. Rows may move continuously under
            these while dragging/wheeling, but can never paint over the menu
            title or BACK control. setHubScrollOffset() also hides a row once
            its bounds would cross the modal's outer rounded edge, preventing
            any content from leaking above or below the panel itself.
        */
        const topCurtain = this.add.graphics();
        topCurtain.fillStyle(0x0d1724, 1);
        topCurtain.fillRect(
            47,
            panelTop + 4,
            626,
            Math.max(0, viewportTop - panelTop - 4)
        );
        topCurtain.lineStyle(2, 0xffffff, 0.08);
        topCurtain.lineBetween(68, viewportTop - 12, 652, viewportTop - 12);

        const bottomCurtain = this.add.graphics();
        bottomCurtain.fillStyle(0x0d1724, 1);
        bottomCurtain.fillRect(
            47,
            viewportBottom,
            626,
            Math.max(0, panelBottom - viewportBottom - 4)
        );
        bottomCurtain.lineStyle(2, 0xffffff, 0.06);
        bottomCurtain.lineBetween(68, viewportBottom, 652, viewportBottom);

        root.add([topCurtain, bottomCurtain]);

        // Curtains were added after the list, so put the actual header art/text
        // back above them. This gives us clipping without renderer masks.
        root.bringToTop(heading);
        root.bringToTop(detail);
        if (heroPlate) root.bringToTop(heroPlate);
        if (hero) root.bringToTop(hero);

        let thumb = null;
        let thumbHeight = viewportHeight;
        const maxScroll =
            Math.max(
                0,
                contentHeight - viewportHeight
            );

        if (maxScroll > 0) {
            const scrollTrack =
                this.add.graphics();

            scrollTrack.fillStyle(0xffffff, 0.08);
            scrollTrack.fillRoundedRect(
                652,
                viewportTop,
                8,
                viewportHeight,
                4
            );

            thumbHeight =
                Math.max(
                    58,
                    viewportHeight *
                    (viewportHeight / contentHeight)
                );

            thumb =
                this.add.image(
                    656,
                    viewportTop + thumbHeight / 2,
                    "uiTinyRoundBlue"
                )
                .setScale(0.34, Math.max(0.34, thumbHeight / 64))
                .setAlpha(0.82);

            const scrollHint =
                this.add.text(
                    620,
                    panelBottom - 82,
                    "DRAG / WHEEL",
                    {
                        fontFamily: FONT_TECH,
                        fontSize: "10px",
                        fontStyle: "bold",
                        color: "#71859a"
                    }
                )
                .setOrigin(1, 0.5);

            root.add([scrollTrack, thumb, scrollHint]);
        }

        const closeButton =
            this.add.image(
                GAME_WIDTH / 2,
                panelBottom - 48,
                "uiRoundBlue"
            )
            .setScale(0.78);

        closeButton.__blocksWorldInput = true;

        const closeLabel =
            this.add.text(
                GAME_WIDTH / 2,
                panelBottom - 48,
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
            y: panelBottom - 48,
            width: 104,
            height: 72,
            scrollable: false,
            enabled: true,
            callback: () => {
                AudioDirector.playEffect("click");
                this.closeHubPanel();
            }
        });

        this.hudRoot.add(root);
        this.hubPanel = root;
        this.hubScroll = {
            content: scrollContent,
            mask,
            rowZones,
            offset: 0,
            maxScroll,
            viewportTop,
            viewportBottom,
            viewportHeight,
            visualClipTop: panelTop + 6,
            visualClipBottom: panelBottom - 6,
            thumb,
            thumbHeight,
            panelBounds: {
                left: 42,
                right: 678,
                top: panelTop,
                bottom: panelBottom
            }
        };

        this.setHubScrollOffset(0);

    }


    buildingCost(key) {

        const definition = BUILDING_DEFS[key];

        if (!definition) {
            return Infinity;
        }

        const copies =
            buildingCountInSave(
                this.saveData,
                key
            );

        return (
            definition.cost +
            (definition.repeatCost || 0) * copies
        );

    }


    formatMetaReward(reward) {

        const parts = [];

        if (reward?.riftglass) {
            parts.push(`${reward.riftglass} Riftglass`);
        }

        if (reward?.dawnseals) {
            parts.push(`${reward.dawnseals} Dawnseal${reward.dawnseals === 1 ? "" : "s"}`);
        }

        if (reward?.glimmer) {
            parts.push(`${reward.glimmer} Glimmer`);
        }

        return parts.join(" + ") || "Mystery reward";

    }


    findGhostlotById(id) {

        return this.ghostlots?.find(
            lot => lot.id === id
        ) || null;

    }


    handleClaimedLotTap(lot) {

        if (!lot?.unlocked) {
            return;
        }

        const distance =
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                lot.x,
                lot.y
            );

        if (distance > Math.max(230, lot.size * 0.9)) {
            this.walkTo(lot.x, lot.y + lot.size * 0.45);
            this.showHudToast(
                this.saveData.buildings?.[lot.id]
                    ? "Walk closer to inspect that building."
                    : "Walk closer to the build site."
            );
            return;
        }

        const buildingKey =
            this.saveData.buildings?.[lot.id] ||
            null;

        if (buildingKey) {
            this.openBuildingPanel(lot, buildingKey);
        } else {
            this.openBuildMenu(lot);
        }

    }


    openBuildMenu(lot) {

        if (!lot?.unlocked || this.saveData.buildings?.[lot.id]) {
            return;
        }

        const blueprintOrder = [
            "laurelArchive",
            "bountyBell",
            "brassrootInstitute",
            "clockCafe",
            "pipyard",
            "warroom",
            "fatehouse",
            "bowyerLodge",
            "pikehouse",
            "lanternCloister"
        ];

        const rows =
            blueprintOrder.map(key => {

                const definition =
                    BUILDING_DEFS[key];

                const alreadyBuilt =
                    definition.unique &&
                    hasBuildingInSave(
                        this.saveData,
                        key
                    );

                const cost =
                    this.buildingCost(key);

                const affordable =
                    this.saveData.riftglass >= cost;

                return {
                    title:
                        definition.name +
                        (definition.unique ? "  •  UNIQUE" : "  •  REPEATABLE"),
                    previewTexture:
                        definition.texture,
                    previewScale:
                        0.22,
                    description:
                        alreadyBuilt
                            ? "This unique building already exists elsewhere in Nullmeadow."
                            : definition.description,
                    action:
                        alreadyBuilt
                            ? "BUILT"
                            : affordable
                                ? "BUILD"
                                : "NEED GLASS",
                    currencyIcon:
                        alreadyBuilt
                            ? null
                            : "riftGlassIcon",
                    costAmount:
                        alreadyBuilt
                            ? null
                            : cost,
                    ready:
                        !alreadyBuilt &&
                        affordable,
                    lockedMessage:
                        alreadyBuilt
                            ? "Only one of these may exist."
                            : `Short ${Math.max(0, cost - this.saveData.riftglass)} Riftglass.`,
                    callback: () =>
                        this.constructBuilding(
                            lot,
                            key
                        )
                };

            });

        this.openHubPanel(
            `${lot.id.toUpperCase()} • BUILD`,
            `Riftglass ${compactAmount(this.saveData.riftglass)} • drag to browse every blueprint`,
            rows,
            {
                heroTexture: "uiBuild",
                heroScale: 0.58
            }
        );

    }


    constructBuilding(lot, key) {

        const definition =
            BUILDING_DEFS[key];

        if (!lot?.unlocked || !definition) {
            return;
        }

        if (this.saveData.buildings?.[lot.id]) {
            this.showHudToast("That lot already has a building.");
            return;
        }

        if (
            definition.unique &&
            hasBuildingInSave(
                this.saveData,
                key
            )
        ) {
            this.showHudToast(`${definition.name} is unique.`);
            return;
        }

        const cost =
            this.buildingCost(key);

        if (this.saveData.riftglass < cost) {
            this.showHudToast(
                `Need ${cost - this.saveData.riftglass} more Riftglass.`
            );
            return;
        }

        this.saveData.riftglass -= cost;
        this.saveData.buildings[lot.id] = key;
        lot.buildingKey = key;

        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);
        AudioDirector.playEffect("upgrade");

        this.closeHubPanel();

        /*
            IMPORTANT: construction never restarts GameScene.
            Restarting the scene used to snap Pip back to the spawn point after
            every purchase. Instead the lot is rebuilt visually in-place.
        */
        this.clearGhostlotVisual(lot);
        lot.graphics = this.drawGhostlot(lot, false);
        this.animateConstructedBuilding(lot, definition);

        this.updateHUD();
        this.refreshBuildingAttentionBadges();
        this.showHudToast(`${definition.name} founded.`);

    }


    openBuildingPanel(lot, key) {

        const definition =
            BUILDING_DEFS[key];

        if (!definition) {
            return;
        }

        if (key === "laurelArchive") {
            this.openAchievementPanel();
            return;
        }

        if (key === "bountyBell") {
            this.openBountyPanel();
            return;
        }

        if (key === "brassrootInstitute") {
            this.openTechPanel();
            return;
        }

        if (key === "fatehouse") {
            this.openFatehousePanel(lot);
            return;
        }

        let effect = definition.description;

        if (key === "clockCafe") {
            effect = "Clockwork Helpers travel faster and their automatic dispatch cycle is 22% shorter.";
        } else if (key === "pipyard") {
            effect = "Pip moves 12% faster in Nullmeadow, moves faster in Riftfall, and gains +1 Riftfall health.";
        } else if (key === "warroom") {
            effect = "All recruited soldiers deal +35% damage in Riftfall.";
        } else if (key === "bowyerLodge") {
            effect = `${buildingCountInSave(this.saveData, key)} Bowyer Lodge(s) • that many archers join every Riftfall.`;
        } else if (key === "pikehouse") {
            effect = `${buildingCountInSave(this.saveData, key)} Pikehouse(s) • that many lancers join every Riftfall.`;
        } else if (key === "lanternCloister") {
            effect = `${buildingCountInSave(this.saveData, key)} Lantern Cloister(s) • that many monks join every Riftfall and heal Pip.`;
        }

        this.openHubPanel(
            definition.name.toUpperCase(),
            `${lot.id.toUpperCase()} • OPERATIONAL`,
            [
                {
                    title: "Settlement effect",
                    description: effect,
                    action: "ACTIVE",
                    callback: () => {}
                }
            ],
            {
                heroTexture: definition.texture,
                heroScale: definition.scale * 0.62
            }
        );

    }


    openFatehousePanel(lot) {

        const dailyReady =
            (this.saveData.fateLastRewardDay ?? -1) !==
            this.meadowDay;

        const record =
            `${this.saveData.fateWins || 0}W • ${this.saveData.fateLosses || 0}L`;

        this.openHubPanel(
            "FATEHOUSE",
            `RUNEHAND • ${record}`,
            [
                {
                    title:
                        dailyReady
                            ? "The daily omen is still unclaimed"
                            : "The daily omen has already paid",
                    description:
                        dailyReady
                            ? "Turn-based duel. Read the enemy intent, spend 3 Resolve, build block, and break the hand. First win today pays a Dawnseal bonus."
                            : "You can keep dueling for Riftglass and record progression. The larger Dawnseal payout refreshes on the next Nullmeadow day.",
                    action: "DEAL",
                    previewTexture: "uiCrossed",
                    previewScale: 0.42,
                    callback: () => {
                        if (this.claimrunLaunching) {
                            return;
                        }

                        this.claimrunLaunching = true;
                        this.persistMeadowClimate();
                        const returnX = this.player?.x ?? lot.x;
                        const returnY = this.player?.y ?? lot.y;
                        this.closeHubPanel();
                        AudioDirector.playEffect("click");
                        this.cameras.main.fadeOut(180, 18, 8, 26);
                        this.time.delayedCall(
                            195,
                            () => {
                                this.scene.start(
                                    "RunehandScene",
                                    {
                                        x: returnX,
                                        y: returnY,
                                        meadowDay: this.meadowDay
                                    }
                                );
                            }
                        );
                    }
                },
                {
                    title: "Rule of the house",
                    description: "Cards cost Resolve. Block vanishes after it absorbs damage. The opponent telegraphs its next action before you commit your turn.",
                    action: dailyReady ? "DAILY LIVE" : "PRACTICE",
                    callback: () => {}
                },
                {
                    title: `Relic cabinet  •  ${(this.saveData.relics || []).length}/4`,
                    description:
                        (this.saveData.relics || []).length
                            ? (this.saveData.relics || [])
                                .map(id => ({
                                    "ashfang": "Ashfang",
                                    "lantern-heart": "Lantern Heart",
                                    "glass-compass": "Glass Compass",
                                    "red-thread": "Red Thread"
                                }[id] || id))
                                .join(" • ")
                            : "Hollowroad clears can bring back permanent relics that modify other game modes.",
                    action: "PASSIVE",
                    previewTexture: "riftGlassIcon",
                    previewScale: 0.36,
                    callback: () => {}
                }
            ],
            {
                heroTexture: "buildingFate",
                heroScale: 0.34
            }
        );

    }


    openAchievementPanel() {

        const rows =
            ACHIEVEMENT_DEFS.map(definition => {

                const claimed =
                    this.saveData.claimedAchievements.includes(
                        definition.id
                    );

                const unlocked =
                    Boolean(
                        definition.test(this.saveData)
                    );

                return {
                    title: definition.title,
                    previewTexture:
                        definition.reward.dawnseals
                            ? "dawnSealIcon"
                            : definition.reward.riftglass
                                ? "riftGlassIcon"
                                : "uiValor",
                    previewScale: 0.27,
                    highlight: unlocked && !claimed,
                    description:
                        `${definition.description} • Reward: ${this.formatMetaReward(definition.reward)}`,
                    action:
                        claimed
                            ? "CLAIMED"
                            : unlocked
                                ? "CLAIM"
                                : "LOCKED",
                    ready:
                        claimed
                            ? true
                            : unlocked,
                    lockedMessage:
                        claimed
                            ? "Already claimed."
                            : "Achievement not completed yet.",
                    callback: () =>
                        this.claimAchievement(
                            definition.id
                        )
                };

            });

        this.openHubPanel(
            "LAUREL ARCHIVE",
            "Completed entries glow until their rewards are collected.",
            rows,
            {
                heroTexture: "buildingLaurel",
                heroScale: 0.34
            }
        );

    }


    claimAchievement(id) {

        const definition =
            ACHIEVEMENT_DEFS.find(
                item => item.id === id
            );

        if (
            !definition ||
            this.saveData.claimedAchievements.includes(id) ||
            !definition.test(this.saveData)
        ) {
            return;
        }

        this.saveData.claimedAchievements.push(id);
        this.saveData.riftglass += definition.reward.riftglass || 0;
        this.saveData.dawnseals += definition.reward.dawnseals || 0;
        this.glimmerOwned += definition.reward.glimmer || 0;
        this.saveData.glimmer = this.glimmerOwned;

        persistSave(this.saveData);
        this.updateHUD();
        AudioDirector.playEffect("win");
        this.showHudToast(
            `${definition.title} • ${this.formatMetaReward(definition.reward)}`
        );
        this.refreshBuildingAttentionBadges();
        this.openAchievementPanel();

    }


    openBountyPanel() {

        const { state, definition } =
            ensureRotatingBounty(
                this.saveData
            );

        const progress =
            Phaser.Math.Clamp(
                Math.floor(Number(state.progress) || 0),
                0,
                definition.target
            );

        const complete =
            progress >= definition.target;

        this.openHubPanel(
            "BOUNTY BELL",
            "A new contract rotates with the real-world day.",
            [
                {
                    title: definition.title,
                    previewTexture:
                        definition.reward.dawnseals
                            ? "dawnSealIcon"
                            : "riftGlassIcon",
                    previewScale: 0.27,
                    highlight: complete && !state.claimed,
                    description:
                        `${definition.description} • ${progress}/${definition.target} • Reward: ${this.formatMetaReward(definition.reward)}`,
                    action:
                        state.claimed
                            ? "PAID"
                            : complete
                                ? "CLAIM"
                                : "WORKING",
                    ready:
                        state.claimed
                            ? true
                            : complete,
                    lockedMessage:
                        state.claimed
                            ? "Today's bounty has already paid out."
                            : "The contract is not finished yet.",
                    callback: () =>
                        this.claimBounty()
                }
            ],
            {
                heroTexture: "buildingBounty",
                heroScale: 0.38
            }
        );

    }


    claimBounty() {

        const { state, definition } =
            ensureRotatingBounty(
                this.saveData
            );

        if (
            state.claimed ||
            Number(state.progress || 0) < definition.target
        ) {
            return;
        }

        state.claimed = true;
        this.saveData.riftglass += definition.reward.riftglass || 0;
        this.saveData.dawnseals += definition.reward.dawnseals || 0;

        persistSave(this.saveData);
        this.updateHUD();
        AudioDirector.playEffect("upgrade");
        this.showHudToast(
            `${definition.title} paid • ${this.formatMetaReward(definition.reward)}`
        );
        this.refreshBuildingAttentionBadges();
        this.openBountyPanel();

    }


    openTechPanel() {

        const rows =
            TECH_DEFS.map(definition => {

                const level =
                    this.saveData.tech[definition.key] || 0;

                const maxed =
                    level >= definition.max;

                const cost =
                    techUpgradeCost(
                        definition,
                        level
                    );

                const affordable =
                    maxed ||
                    (
                        this.saveData.dawnseals >= cost.dawnseals &&
                        this.saveData.riftglass >= cost.riftglass
                    );

                return {
                    title: `${definition.title}  •  LV ${level}/${definition.max}`,
                    previewTexture: maxed ? "uiValor" : "dawnSealIcon",
                    previewScale: 0.26,
                    description:
                        maxed
                            ? `${definition.description} • Research complete.`
                            : definition.description,
                    action:
                        maxed
                            ? "MAX"
                            : affordable
                                ? "RESEARCH"
                                : "LOCKED",
                    costs:
                        maxed
                            ? []
                            : [
                                {
                                    icon: "dawnSealIcon",
                                    amount: cost.dawnseals
                                },
                                {
                                    icon: "riftGlassIcon",
                                    amount: cost.riftglass
                                }
                            ],
                    ready: affordable,
                    lockedMessage:
                        maxed
                            ? "Research complete."
                            : `Research requires ${cost.dawnseals} Dawnseal(s) and ${cost.riftglass} Riftglass.`,
                    callback: () =>
                        this.buyTech(definition.key)
                };

            });

        this.openHubPanel(
            "BRASSROOT INSTITUTE",
            `Permanent research • ${compactAmount(this.saveData.dawnseals)} Dawnseals • ${compactAmount(this.saveData.riftglass)} Riftglass`,
            rows,
            {
                heroTexture: "buildingTech",
                heroScale: 0.34
            }
        );

    }


    buyTech(key) {

        const definition =
            TECH_DEFS.find(item => item.key === key);

        if (!definition) {
            return;
        }

        const level =
            this.saveData.tech[key] || 0;

        const cost =
            techUpgradeCost(
                definition,
                level
            );

        if (!cost) {
            return;
        }

        if (
            this.saveData.dawnseals < cost.dawnseals ||
            this.saveData.riftglass < cost.riftglass
        ) {
            this.showHudToast(
                `Need ${cost.dawnseals} Dawnseal(s) + ${cost.riftglass} Riftglass.`
            );
            return;
        }

        this.saveData.dawnseals -= cost.dawnseals;
        this.saveData.riftglass -= cost.riftglass;
        this.saveData.tech[key] = level + 1;

        persistSave(this.saveData);
        this.updateHUD();
        AudioDirector.playEffect("upgrade");
        this.refreshBuildingAttentionBadges();
        this.showHudToast(
            `${definition.title} advanced to LV ${level + 1}.`
        );
        this.openTechPanel();

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
                this.autoCrankInterval() /
                1000
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
                        this.createCrankhouseHelpers();
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
            ],
            {
                heroTexture: "crankhouse",
                heroScale: 0.42
            }
        );

    }


    openSettingsPanel() {

        const musicOn =
            this.saveData.musicEnabled !== false;

        const sfxOn =
            this.saveData.sfxEnabled !== false;

        const zoomPresets = [
            0.8,
            1.0,
            1.2,
            1.4,
            1.6
        ];

        const currentZoom =
            this.cameras.main.zoom;

        let presetIndex =
            zoomPresets.findIndex(
                zoom =>
                    Math.abs(
                        zoom - currentZoom
                    ) < 0.04
            );

        if (presetIndex < 0) {
            presetIndex = 1;
        }

        this.openHubPanel(
            "MEADOW SETTINGS",
            "A tiny menu for noise and camera meddling.",
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
                },
                {
                    title: `Camera zoom  •  ${Math.round(currentZoom * 100)}%`,
                    description: "Mouse wheel, trackpad and pinch all work too. Tap to cycle preset zooms.",
                    action: "CYCLE",
                    callback: () => {
                        const nextZoom =
                            zoomPresets[
                                (presetIndex + 1) %
                                zoomPresets.length
                            ];

                        this.setNullmeadowZoom(
                            nextZoom
                        );

                        this.closeHubPanel();
                        this.openSettingsPanel();
                        this.showHudToast(
                            `Camera zoom ${Math.round(nextZoom * 100)}%`
                        );
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

                        160,

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

        const base = Math.max(
            11000,
            35000 -
            Math.max(
                0,
                this.saveData.autoCrankLevel - 1
            ) *
            6000
        );

        return Math.round(
            base *
            (
                hasBuildingInSave(
                    this.saveData,
                    "clockCafe"
                )
                    ? 0.78
                    : 1
            )
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

        if (!this.crankhouseHelpers?.length) {
            return;
        }

        let helper = null;

        for (
            let offset = 0;
            offset < this.crankhouseHelpers.length;
            offset++
        ) {
            const index =
                (this.helperDispatchIndex + offset) %
                this.crankhouseHelpers.length;

            if (!this.crankhouseHelpers[index].busy) {
                helper = this.crankhouseHelpers[index];
                this.helperDispatchIndex =
                    (index + 1) %
                    this.crankhouseHelpers.length;
                break;
            }
        }

        // Passive production is never granted invisibly; a worker has to do it.
        if (!helper) {
            return;
        }

        helper.busy = true;
        helper.sprite.play("crankhand-run", true);
        helper.sprite.setAngle(0);
        helper.sprite.setFlipX(helper.workX < helper.sprite.x);

        const helperTravelMultiplier =
            hasBuildingInSave(
                this.saveData,
                "clockCafe"
            )
                ? 0.78
                : 1;

        const travelTime =
            Phaser.Math.Clamp(
                Phaser.Math.Distance.Between(
                    helper.sprite.x,
                    helper.sprite.y,
                    helper.workX,
                    helper.workY
                ) * 4.4 * helperTravelMultiplier,
                320,
                950
            );

        const returnHome = () => {

            helper.sprite.play("crankhand-run", true);
            helper.sprite.setFlipX(helper.restX < helper.workX);

            this.tweens.add({
                targets: helper.sprite,
                x: helper.restX,
                y: helper.restY,
                duration: travelTime,
                ease: "Sine.InOut",
                onUpdate: () => {
                    helper.sprite.setDepth(helper.sprite.y + 8);
                },
                onComplete: () => {
                    helper.sprite.setFlipX(false);
                    helper.sprite.play("crankhand-idle", true);
                    helper.sprite.setDepth(helper.restY + 8);
                    helper.busy = false;
                }
            });

        };

        this.tweens.add({
            targets: helper.sprite,
            x: helper.workX,
            y: helper.workY,
            duration: travelTime,
            ease: "Sine.InOut",
            onUpdate: () => {
                helper.sprite.setDepth(helper.sprite.y + 14);
            },
            onComplete: () => {

                helper.sprite.setFlipX(false);
                helper.sprite.setDepth(helper.workY + 14);

                /*
                    One visit currently means exactly one crank.
                    cranksPerVisit exists for a later multi-crank helper upgrade.
                */
                helper.sprite.once(
                    "animationcomplete-crankhand-work",
                    () => {

                        for (
                            let crank = 0;
                            crank < helper.cranksPerVisit;
                            crank++
                        ) {
                            this.grantPassiveGlimmer();
                        }

                        AudioDirector.playEffect("crank");

                        /*
                            IMPORTANT:
                            Helper state must never depend on a tween attached
                            to the Crankhouse itself.

                            Manual cranking intentionally kills Crankhouse
                            tweens so the click feedback can restart cleanly.
                            Previously that could also kill this helper pulse
                            before its onComplete callback fired, leaving the
                            worker permanently parked beside the building.

                            The building pulse is now purely cosmetic; the
                            worker starts going home independently as soon as
                            its single crank is complete.
                        */
                        this.tweens.add({
                            targets: this.crankhouse,
                            scaleX: 1.13,
                            scaleY: 1.13,
                            duration: 90,
                            yoyo: true,
                            repeat: 0
                        });

                        returnHome();

                    }
                );

                helper.sprite.play("crankhand-work", true);

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
                170,

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
                182,

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

        if (this.riftGlassHud) {
            this.riftGlassHud.setText(
                compactAmount(
                    this.saveData.riftglass ||
                    0
                )
            );
        }

        if (this.dawnSealHud) {
            this.dawnSealHud.setText(
                compactAmount(
                    this.saveData.dawnseals ||
                    0
                )
            );
        }

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
                ) +
                (
                    this.currentDayPhase
                        ? ` • ${this.currentDayPhase}`
                        : ""
                ) +
                (
                    this.currentWeather &&
                    this.currentWeather !== "CLEAR"
                        ? ` • ${this.currentWeather}`
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

            const buildSite =
                this.getClosestBuildReadyLot();

            if (this.riftReliquary) {
                this.objectiveIcon
                    .setTexture("riftGlassIcon")
                    .setScale(0.42);

                this.objectiveText
                    .setText(
                        "NIGHTGLASS RELIQUARY • MANIFESTED"
                    );

                this.objectiveSubText
                    .setText(
                        "FOLLOW THE RIFT INDICATOR"
                    );
            } else if (this.moonpond) {
                this.objectiveIcon
                    .setTexture("moonpondIcon")
                    .setScale(0.46);

                this.objectiveText
                    .setText(
                        "MOONPOND • MANIFESTED"
                    );

                this.objectiveSubText
                    .setText(
                        `${Math.max(0, 3 - (this.saveData.moonpondCastsUsed || 0))} CASTS LEFT • FOLLOW THE POND INDICATOR`
                    );
            } else if (this.hollowroadGate) {
                this.objectiveIcon
                    .setTexture("uiSword")
                    .setScale(0.38);

                this.objectiveText
                    .setText(
                        "THE BACKWARD DOOR • OPEN"
                    );

                this.objectiveSubText
                    .setText(
                        "COUNTERATTACK • FOLLOW THE ROAD INDICATOR"
                    );
            } else if (buildSite) {
                this.objectiveIcon
                    .setTexture("uiBuild")
                    .setScale(0.42);

                this.objectiveText
                    .setText(
                        `${buildSite.id.toUpperCase()} • BUILD READY`
                    );

                this.objectiveSubText
                    .setText(
                        "SPEND RIFTGLASS TO FOUND A BUILDING"
                    );
            } else {
                this.objectiveIcon
                    .setTexture("uiTown")
                    .setScale(0.42);

                this.objectiveText
                    .setText(
                        "NULLMEADOW COMPLETE"
                    );

                this.objectiveSubText
                    .setText(
                        "THE MEADOW IS YOURS. FOR NOW."
                    );
            }

        }


        this.refreshBuildingAttentionBadges();
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


    update(time, delta) {

        this.updateMeadowClimate(delta);
        this.updateWorldAtmosphere();

        /*
            Cheap insurance in case anything else changes
            the world-camera zoom later.
        */
        this.syncHudToCameraZoom();
        this.updateNavigationIndicators();

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

        const speed =
            (
                315 *
                (
                    hasBuildingInSave(
                        this.saveData,
                        "pipyard"
                    )
                        ? 1.12
                        : 1
                ) *
                (
                    1 +
                    (this.saveData.tech?.longstep || 0) *
                    0.04
                )
            ) +
            ((this.saveData.relics || []).includes("glass-compass") ? 18 : 0);


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
        this.updateRiftReliquaryPrompt();
        this.updateMoonpondPrompt();
        this.updateHollowroadPrompt();

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
        ClaimRunScene,
        InvasionScene,
        MoonpondScene,
        HollowroadScene,
        RunehandScene
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