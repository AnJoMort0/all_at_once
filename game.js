/*
===============================================================================
NULLMEADOW — PROJECT CONTRACT + CANON — v0.4
===============================================================================

DEVELOPMENT RULES
- The user supplies small feature ideas; expand them freely into a playable design.
- Creative freedom is intentionally broad: mix art styles, genres, archetypes,
  minigames, mechanics, libraries and dependencies whenever useful.
- This project is intentionally becoming "all the games in one". Expect feature
  bloat; keep systems modular enough that unrelated silly games can coexist.
- Prefer the lowest-effort implementation that remains easy to extend.
- Modify as few files as possible. Return ONLY files that actually changed.
- Do not create bookkeeping/readme/asset-selection files merely for documentation.
  Put useful canon, implementation notes and asset descriptions here in game.js.
- Existing names become canon unless changing them materially improves the game.

CURRENT WORLD CANON
- Nullmeadow: the overworld/hub settlement.
- Pip: the roaming player character who physically picks up loose resources.
- The Crankhouse: central clickable building. Each crank ejects one Glimmer.
- Glimmer: primary hub currency/resource, represented by the gold-resource sprite.
- Ghostlots: locked building plots scattered around Nullmeadow. The nearest locked
  Ghostlot becomes the Calling Lot.
- Claimrun: the first embedded minigame. Pip auto-fires up-screen through a finite
  procedural horde while shootable arithmetic walls descend toward him. Each wall
  pair modifies VOLLEY, RATE or SPEED when crossed; shooting a positive number
  increases it (+1 → +2), while shooting a negative number makes it more negative.
  Claimrun difficulty scales from the number of previously claimed Ghostlots.
- Valor: reward currency earned by winning Claimruns, represented by a shield icon.
- A Calling Lot's Claimrun must be opened with a ONE-TIME Glimmer entry fee. Entry
  costs rise with each claimed lot. If Pip loses after paying, retries for that lot
  are free until the lot is claimed.
- Winning permanently claims that Ghostlot, awards +1 Valor, and calls the next lot.
- UI direction: deliberately dense/mobile-game-like, icon-heavy and future-proof.
  Important icons explain themselves on hover (desktop) or tap (touch).

ASSET NOTES live beside ASSETS below.
===============================================================================
*/

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const WORLD_SIZE = 2100;
const SAVE_KEY = "nullmeadow-save-v2"; // Keep old key so v0.2 saves migrate forward.

// One-time Glimmer cost to open each successive Claimrun.
const CLAIM_COSTS = [5, 12, 22, 36, 55, 80, 110, 150, 200, 260, 330];

function claimCostForProgress(claimedCount) {
    if (claimedCount < CLAIM_COSTS.length) return CLAIM_COSTS[claimedCount];
    const extra = claimedCount - CLAIM_COSTS.length + 1;
    return CLAIM_COSTS[CLAIM_COSTS.length - 1] + extra * 90;
}

function compactAmount(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) < 1000) return String(n);
    const units = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (const [size, suffix] of units) {
        if (Math.abs(n) >= size) {
            const scaled = n / size;
            let formatted = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
            formatted = formatted.replace(/\.00$/, "").replace(/(\.[0-9])0$/, "$1");
            return formatted + suffix;
        }
    }
    return String(n);
}

const ASSETS = {
    crankhouse: "assets/images/environment/buildings/tiny_swords/Blue Buildings/House1.png",
    pipIdle: "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Idle.png",
    pipRun: "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Run.png",
    glimmer: "assets/images/environment/resources/tiny_swords/Gold/Gold Resource/Gold_Resource.png",

    oakTree: "assets/images/environment/decorations/cute_fantasy/Oak_Tree.png",
    oakClump: "assets/images/environment/decorations/cute_fantasy/Oak_Tree_Small.png",
    treeStrip: "assets/images/environment/resources/tiny_swords/Wood/Trees/Tree1.png",
    bushStrip: "assets/images/environment/decorations/tiny_swords/Bushes/Bushe1.png",
    rock1: "assets/images/environment/decorations/tiny_swords/Rocks/Rock1.png",
    rock2: "assets/images/environment/decorations/tiny_swords/Rocks/Rock2.png",
    fence: "assets/images/environment/decorations/cute_fantasy/Fences.png",

    skeletonMove: "assets/images/spritesheets/enemies/enemy_animations/enemies-skeleton1_movement.png",
    arrow: "assets/images/projectiles/tiny_rpg_soldier_orc/Arrow01(32x32).png",

    // Tiny Swords UI pack. These are intentionally mixed into the other art styles.
    uiSword: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_05.png",     // games / combat
    uiValor: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_06.png",     // shield = Valor
    uiTown: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_07.png",      // world / Nullmeadow
    uiBuild: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_01.png",     // axe = construction
    uiCrossed: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_09.png",   // game archive
    uiSettings: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_10.png",  // settings
    uiInfo: "assets/images/ui/tiny_swords/UI Elements/Icons/Icon_11.png",      // codex / explanations

    crankClick: "assets/audio/sfx/other/finger_click.wav",
    glimmerCollect: "assets/audio/sfx/items/gem_collect.wav",
    shot: "assets/audio/sfx/weapons/shot_muffled.wav",
    enemyHit: "assets/audio/sfx/retro/hurt.wav",
    powerUp: "assets/audio/sfx/retro/power_up.wav",
    powerDown: "assets/audio/sfx/retro/power_down.wav",
    confirm: "assets/audio/sfx/ui/synth_confirmation.wav"
};

function defaultSave() {
    return {
        glimmer: 0,
        valor: 0,
        unlockedLots: [],
        openedClaimruns: [] // One-time Glimmer entry already paid for these lots.
    };
}

function loadSave() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
        return { ...defaultSave(), ...(parsed || {}) };
    } catch (_) {
        return defaultSave();
    }
}

function persistSave(save) {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) {}
}

class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("crankhouse", ASSETS.crankhouse);
        this.load.image("glimmer", ASSETS.glimmer);
        this.load.image("oakTree", ASSETS.oakTree);
        this.load.image("oakClump", ASSETS.oakClump);
        this.load.image("rock1", ASSETS.rock1);
        this.load.image("rock2", ASSETS.rock2);
        this.load.image("fence", ASSETS.fence);
        this.load.image("arrow", ASSETS.arrow);

        this.load.image("uiSword", ASSETS.uiSword);
        this.load.image("uiValor", ASSETS.uiValor);
        this.load.image("uiTown", ASSETS.uiTown);
        this.load.image("uiBuild", ASSETS.uiBuild);
        this.load.image("uiCrossed", ASSETS.uiCrossed);
        this.load.image("uiSettings", ASSETS.uiSettings);
        this.load.image("uiInfo", ASSETS.uiInfo);

        this.load.spritesheet("fieldTrees", ASSETS.treeStrip, {
            frameWidth: 256,
            frameHeight: 256
        });

        this.load.spritesheet("fieldBushes", ASSETS.bushStrip, {
            frameWidth: 128,
            frameHeight: 128
        });

        this.load.spritesheet("pipIdle", ASSETS.pipIdle, {
            frameWidth: 192,
            frameHeight: 192
        });

        this.load.spritesheet("pipRun", ASSETS.pipRun, {
            frameWidth: 192,
            frameHeight: 192
        });

        this.load.spritesheet("skeletonMove", ASSETS.skeletonMove, {
            frameWidth: 32,
            frameHeight: 32
        });

        this.load.audio("crankClick", ASSETS.crankClick);
        this.load.audio("glimmerCollect", ASSETS.glimmerCollect);
        this.load.audio("shot", ASSETS.shot);
        this.load.audio("enemyHit", ASSETS.enemyHit);
        this.load.audio("powerUp", ASSETS.powerUp);
        this.load.audio("powerDown", ASSETS.powerDown);
        this.load.audio("confirm", ASSETS.confirm);
    }

    create() {
        this.worldCenter = new Phaser.Math.Vector2(WORLD_SIZE / 2, WORLD_SIZE / 2);
        this.saveData = this.registry.get("saveData") || loadSave();
        if (!Array.isArray(this.saveData.openedClaimruns)) this.saveData.openedClaimruns = [];
        if (!Array.isArray(this.saveData.unlockedLots)) this.saveData.unlockedLots = [];
        this.registry.set("saveData", this.saveData);

        this.glimmerOwned = this.saveData.glimmer || 0;
        this.glimmerLoose = [];
        this.moveTarget = null;

        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBackgroundColor("#748d59");

        this.createGround();
        this.createGhostlots();
        this.createScenery();
        this.createCrankhouse();
        this.createPip();
        this.createAnimations();
        this.createActiveGhostlotPrompt();
        this.createInput();
        this.createHUD();

        this.cameras.main.startFollow(this.player, true, 0.11, 0.11);
        this.cameras.main.setDeadzone(120, 220);
        this.cameras.main.fadeIn(300, 19, 27, 34);
    }

    createGround() {
        const g = this.add.graphics().setDepth(-1000);
        const tile = 128;

        for (let y = 0; y < WORLD_SIZE; y += tile) {
            for (let x = 0; x < WORLD_SIZE; x += tile) {
                const odd = ((x / tile) + (y / tile)) % 2;
                g.fillStyle(odd ? 0x78915a : 0x718955, 1);
                g.fillRect(x, y, tile, tile);
            }
        }

        g.lineStyle(2, 0x344934, 0.08);
        for (let p = 0; p <= WORLD_SIZE; p += tile) {
            g.lineBetween(p, 0, p, WORLD_SIZE);
            g.lineBetween(0, p, WORLD_SIZE, p);
        }

        g.fillStyle(0xb8aa76, 0.20);
        g.fillCircle(this.worldCenter.x, this.worldCenter.y, 285);
        g.lineStyle(8, 0xd5c28c, 0.10);
        g.strokeCircle(this.worldCenter.x, this.worldCenter.y, 285);

        const rng = this.makeRng(0x4e554c4c);
        for (let i = 0; i < 310; i++) {
            const x = 30 + rng() * (WORLD_SIZE - 60);
            const y = 30 + rng() * (WORLD_SIZE - 60);
            const r = 2 + rng() * 5;
            g.fillStyle(rng() > 0.45 ? 0x4e6e43 : 0xc0b179, 0.30);
            g.fillCircle(x, y, r);
        }
    }

    createGhostlots() {
        this.ghostlots = [];
        const rng = this.makeRng(0x47484f53);
        const placed = [];

        for (let i = 0; i < 11; i++) {
            let candidate = null;

            for (let attempt = 0; attempt < 320; attempt++) {
                const angle = rng() * Math.PI * 2;
                const radius = 315 + rng() * 355;
                const size = 150 + Math.floor(rng() * 65);
                const x = Phaser.Math.Clamp(this.worldCenter.x + Math.cos(angle) * radius, 145, WORLD_SIZE - 145);
                const y = Phaser.Math.Clamp(this.worldCenter.y + Math.sin(angle) * radius, 145, WORLD_SIZE - 145);
                const rect = new Phaser.Geom.Rectangle(x - size / 2, y - size / 2, size, size);
                const padded = new Phaser.Geom.Rectangle(rect.x - 45, rect.y - 45, rect.width + 90, rect.height + 90);

                const tooClose = placed.some(other => Phaser.Geom.Intersects.RectangleToRectangle(padded, other));
                if (!tooClose) {
                    candidate = { x, y, size, rect, padded };
                    break;
                }
            }

            if (!candidate) continue;
            placed.push(candidate.padded);

            const id = `Ghostlot ${String(i + 1).padStart(2, "0")}`;
            const unlocked = this.saveData.unlockedLots.includes(id);
            const lot = { id, ...candidate, unlocked };
            this.ghostlots.push(lot);
        }

        const locked = this.ghostlots
            .filter(lot => !lot.unlocked)
            .sort((a, b) =>
                Phaser.Math.Distance.Between(a.x, a.y, this.worldCenter.x, this.worldCenter.y)
                - Phaser.Math.Distance.Between(b.x, b.y, this.worldCenter.x, this.worldCenter.y)
            );

        this.activeGhostlot = locked[0] || null;

        for (const lot of this.ghostlots) {
            lot.graphics = this.drawGhostlot(lot, lot === this.activeGhostlot);
        }

        if (this.activeGhostlot) this.createAttentionBeacon(this.activeGhostlot);
    }

    drawGhostlot(lot, active) {
        const { x, y, size, id, unlocked } = lot;
        const g = this.add.graphics().setDepth(-100);
        const half = size / 2;

        if (unlocked) {
            g.fillStyle(0x9bd57b, 0.12);
            g.fillRoundedRect(x - half, y - half, size, size, 18);
            g.lineStyle(7, 0xbff59b, 0.55);
            g.strokeRoundedRect(x - half, y - half, size, size, 18);
            g.lineStyle(8, 0xeaffd7, 0.72);
            g.lineBetween(x - 30, y + 2, x - 6, y + 26);
            g.lineBetween(x - 6, y + 26, x + 38, y - 28);
        } else {
            g.fillStyle(active ? 0x7e681e : 0x18222a, active ? 0.16 : 0.10);
            g.fillRoundedRect(x - half, y - half, size, size, 18);
            g.lineStyle(7, active ? 0xffdf68 : 0xe9e2bd, active ? 0.72 : 0.30);
            g.strokeRoundedRect(x - half, y - half, size, size, 18);

            g.lineStyle(5, active ? 0xfff3b0 : 0xffffff, active ? 0.60 : 0.38);
            const c = 28;
            g.lineBetween(x - half, y - half + c, x - half, y - half);
            g.lineBetween(x - half, y - half, x - half + c, y - half);
            g.lineBetween(x + half - c, y - half, x + half, y - half);
            g.lineBetween(x + half, y - half, x + half, y - half + c);
            g.lineBetween(x - half, y + half - c, x - half, y + half);
            g.lineBetween(x - half, y + half, x - half + c, y + half);
            g.lineBetween(x + half - c, y + half, x + half, y + half);
            g.lineBetween(x + half, y + half, x + half, y + half - c);

            const lockY = y - 4;
            g.lineStyle(7, 0xf2d477, 0.70);
            g.strokeCircle(x, lockY - 17, 17);
            g.fillStyle(0x6b613b, 0.76);
            g.fillRoundedRect(x - 27, lockY - 10, 54, 46, 8);
            g.fillStyle(0xf2d477, 0.82);
            g.fillCircle(x, lockY + 8, 5);
            g.fillRect(x - 3, lockY + 8, 6, 13);
        }

        const suffix = unlocked ? "  //  CLAIMED" : active ? "  //  CALLING" : "";
        this.add.text(x, y + half + 18, `${id.toUpperCase()}${suffix}`, {
            fontFamily: "Arial",
            fontSize: "16px",
            fontStyle: "bold",
            color: unlocked ? "#d8ffc0" : active ? "#fff0a2" : "#e8e1c3",
            stroke: "#203021",
            strokeThickness: 5
        }).setOrigin(0.5, 0).setDepth(-90).setAlpha(unlocked || active ? 0.95 : 0.62);

        return g;
    }

    createAttentionBeacon(lot) {
        const ring = this.add.circle(lot.x, lot.y, lot.size * 0.62, 0xffdc55, 0.035)
            .setStrokeStyle(6, 0xffe36f, 0.60)
            .setDepth(-80);

        this.tweens.add({
            targets: ring,
            scaleX: 1.13,
            scaleY: 1.13,
            alpha: 0.18,
            duration: 820,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut"
        });

        const call = this.add.text(lot.x, lot.y - lot.size / 2 - 70, "CALLING LOT", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#2b2414",
            backgroundColor: "#ffdf68",
            padding: { x: 12, y: 7 }
        }).setOrigin(0.5).setDepth(lot.y + 80);

        this.tweens.add({ targets: call, y: call.y - 9, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    }

    createScenery() {
        const rng = this.makeRng(0x46524545);
        let placed = 0;
        let attempts = 0;

        while (placed < 175 && attempts < 2400) {
            attempts++;
            const x = 65 + rng() * (WORLD_SIZE - 130);
            const y = 65 + rng() * (WORLD_SIZE - 130);
            const centerDistance = Phaser.Math.Distance.Between(x, y, this.worldCenter.x, this.worldCenter.y);
            if (centerDistance < 230) continue;

            const blockedByLot = this.ghostlots.some(lot => {
                const pad = 34;
                return x > lot.rect.x - pad && x < lot.rect.right + pad && y > lot.rect.y - pad && y < lot.rect.bottom + pad;
            });
            if (blockedByLot) continue;

            const pick = rng();
            let obj;

            if (pick < 0.29) {
                obj = this.add.sprite(x, y, "fieldTrees", Math.floor(rng() * 6))
                    .setScale(0.34 + rng() * 0.10);
            } else if (pick < 0.47) {
                obj = this.add.image(x, y, "oakTree").setScale(1.05 + rng() * 0.45);
            } else if (pick < 0.58) {
                obj = this.add.image(x, y, "oakClump").setScale(0.95 + rng() * 0.35);
            } else if (pick < 0.75) {
                obj = this.add.sprite(x, y, "fieldBushes", Math.floor(rng() * 8))
                    .setScale(0.42 + rng() * 0.18);
            } else if (pick < 0.91) {
                obj = this.add.image(x, y, rng() > 0.5 ? "rock1" : "rock2").setScale(0.60 + rng() * 0.42);
            } else {
                obj = this.add.image(x, y, "fence")
                    .setScale(0.72 + rng() * 0.28)
                    .setAngle(Math.floor(rng() * 4) * 90);
            }

            obj.setDepth(y - 150).setAlpha(0.90 + rng() * 0.10);
            if (rng() < 0.17) obj.setFlipX(true);
            placed++;
        }
    }

    createCrankhouse() {
        const x = this.worldCenter.x;
        const y = this.worldCenter.y;

        this.add.ellipse(x, y + 79, 150, 62, 0x1b211c, 0.25).setDepth(y - 2);

        this.crankhouse = this.add.image(x, y, "crankhouse")
            .setScale(1.08)
            .setDepth(y)
            .setInteractive({ useHandCursor: true });

        this.crankhouseLabel = this.add.text(x, y - 142, "THE CRANKHOUSE", {
            fontFamily: "Arial",
            fontSize: "25px",
            fontStyle: "bold",
            color: "#fff1aa",
            stroke: "#1f2823",
            strokeThickness: 7,
            align: "center"
        }).setOrigin(0.5).setDepth(y + 3);

        this.crankhouseHint = this.add.text(x, y + 124, "CLICK / TAP TO CRANK", {
            fontFamily: "Arial",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#1f2823",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(y + 3).setAlpha(0.78);

        this.crankhouse.on("pointerover", () => {
            this.tweens.add({ targets: this.crankhouse, scaleX: 1.13, scaleY: 1.13, duration: 90 });
        });

        this.crankhouse.on("pointerout", () => {
            this.tweens.add({ targets: this.crankhouse, scaleX: 1.08, scaleY: 1.08, duration: 90 });
        });

        this.crankhouse.on("pointerdown", () => this.generateGlimmer());
    }

    createPip() {
        this.player = this.physics.add.sprite(
            this.worldCenter.x,
            this.worldCenter.y + 275,
            "pipIdle",
            0
        );

        this.player.setScale(0.62);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(this.player.y + 10);
        this.player.body.setCircle(48, 48, 70);
        this.player.body.setMaxSpeed(330);
        this.player.body.setDrag(1450, 1450);

        this.playerName = this.add.text(this.player.x, this.player.y - 94, "PIP", {
            fontFamily: "Arial",
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#20251f",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(this.player.depth + 20);

        this.targetMarker = this.add.graphics().setDepth(9000).setVisible(false);
    }

    createAnimations() {
        if (!this.anims.exists("pip-idle")) {
            this.anims.create({
                key: "pip-idle",
                frames: this.anims.generateFrameNumbers("pipIdle", { start: 0, end: 7 }),
                frameRate: 8,
                repeat: -1
            });
        }

        if (!this.anims.exists("pip-run")) {
            this.anims.create({
                key: "pip-run",
                frames: this.anims.generateFrameNumbers("pipRun", { start: 0, end: 5 }),
                frameRate: 12,
                repeat: -1
            });
        }

        if (!this.anims.exists("skeleton-move")) {
            this.anims.create({
                key: "skeleton-move",
                frames: this.anims.generateFrameNumbers("skeletonMove", { start: 0, end: 9 }),
                frameRate: 10,
                repeat: -1
            });
        }

        this.player.play("pip-idle");
    }

    createActiveGhostlotPrompt() {
        this.ghostlotPrompt = null;
        this.challengeButton = null;
        this.claimCostText = null;
        this.claimStatusText = null;
        this.claimCostIcon = null;
        if (!this.activeGhostlot) return;

        const lot = this.activeGhostlot;
        const container = this.add.container(lot.x, lot.y - lot.size / 2 - 125)
            .setDepth(50000)
            .setVisible(false);

        const bubble = this.add.graphics();
        bubble.fillStyle(0x111923, 0.97);
        bubble.fillRoundedRect(-165, -67, 330, 134, 28);
        bubble.lineStyle(4, 0xffdf68, 0.92);
        bubble.strokeRoundedRect(-165, -67, 330, 134, 28);
        bubble.fillStyle(0x111923, 0.97);
        bubble.fillTriangle(-16, 67, 16, 67, 0, 89);

        const label = this.add.text(-142, -45, "CLAIMRUN", {
            fontFamily: "Arial",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#fff3b0"
        });

        this.claimStatusText = this.add.text(-142, -14, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#c8d0cc"
        });

        this.claimCostIcon = this.add.image(-127, 31, "glimmer").setScale(0.22);
        this.claimCostText = this.add.text(-98, 31, "", {
            fontFamily: "Arial",
            fontSize: "21px",
            fontStyle: "bold",
            color: "#ffe170"
        }).setOrigin(0, 0.5);

        const button = this.add.circle(105, 0, 43, 0xffd34f, 1)
            .setStrokeStyle(5, 0xffffff, 0.72)
            .setInteractive({ useHandCursor: true });
        button.__blocksWorldInput = true;

        const triangle = this.add.triangle(112, 0, -11, -17, -11, 17, 18, 0, 0x2b281b, 1);
        container.add([bubble, label, this.claimStatusText, this.claimCostIcon, this.claimCostText, button, triangle]);

        button.on("pointerover", () => this.tweens.add({ targets: button, scaleX: 1.08, scaleY: 1.08, duration: 80 }));
        button.on("pointerout", () => this.tweens.add({ targets: button, scaleX: 1, scaleY: 1, duration: 80 }));
        button.on("pointerdown", (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.beginClaimrun();
        });

        this.ghostlotPrompt = container;
        this.challengeButton = button;
        this.refreshGhostlotPrompt();
    }

    refreshGhostlotPrompt() {
        if (!this.activeGhostlot || !this.ghostlotPrompt) return;
        const lotId = this.activeGhostlot.id;
        const opened = this.saveData.openedClaimruns.includes(lotId);
        const cost = claimCostForProgress(this.saveData.unlockedLots.length);
        const canAfford = this.glimmerOwned >= cost;

        if (opened) {
            this.claimStatusText.setText("ENTRY PAID • FIGHT FOR THE DEED").setColor("#a8f0b8");
            this.claimCostText.setText("READY").setColor("#a8f0b8");
            this.claimCostIcon.setTexture("uiSword").setScale(0.42);
            this.challengeButton.setFillStyle(0x71e58e, 1);
        } else {
            this.claimStatusText.setText(canAfford ? "PAY ONCE • RETRIES STAY OPEN" : "NOT ENOUGH GLIMMER");
            this.claimStatusText.setColor(canAfford ? "#c8d0cc" : "#ff9ba2");
            this.claimCostText.setText(String(cost)).setColor(canAfford ? "#ffe170" : "#ff9ba2");
            this.claimCostIcon.setTexture("glimmer").setScale(0.22);
            this.challengeButton.setFillStyle(canAfford ? 0xffd34f : 0x7c5960, 1);
        }
    }

    createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.input.on("pointerdown", (pointer, currentlyOver) => {
            if (currentlyOver && currentlyOver.some(obj => obj && obj.__blocksWorldInput)) return;
            if (currentlyOver && currentlyOver.includes(this.crankhouse)) return;
            if (pointer.y < 145 || pointer.y > GAME_HEIGHT - 100) return;

            const world = pointer.positionToCamera(this.cameras.main);
            this.moveTarget = new Phaser.Math.Vector2(
                Phaser.Math.Clamp(world.x, 40, WORLD_SIZE - 40),
                Phaser.Math.Clamp(world.y, 40, WORLD_SIZE - 40)
            );
            this.drawTargetMarker(this.moveTarget.x, this.moveTarget.y);
        });
    }

    createHUD() {
        // HUD is intentionally a little excessive: this is the hub for many future games.
        this.hudRoot = this.add.container(0, 0).setDepth(100000).setScrollFactor(0);

        const top = this.add.graphics();
        top.fillStyle(0x0c121a, 0.94);
        top.fillRoundedRect(14, 14, 692, 116, 24);
        top.lineStyle(3, 0xffffff, 0.10);
        top.strokeRoundedRect(14, 14, 692, 116, 24);
        this.hudRoot.add(top);

        this.hudRoot.add(this.add.text(34, 28, "NULLMEADOW", {
            fontFamily: "Arial",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#dbe9bc"
        }));
        this.hudRoot.add(this.add.text(34, 51, "HUB // 001", {
            fontFamily: "Arial",
            fontSize: "11px",
            fontStyle: "bold",
            color: "#687789"
        }));

        // Wallet: icons carry the currency identity; names live in tooltips instead of labels.
        this.glimmerHud = this.createCurrencyChip(215, 72, "glimmer", 0.30, "Glimmer",
            "Cranked out by the Crankhouse. Used to open Claimruns and future Nullmeadow systems.");
        this.valorHud = this.createCurrencyChip(340, 72, "uiValor", 0.54, "Valor",
            "Won by conquering Ghostlot games. Its purpose is intentionally suspicious for now.");

        // Reserved currency sockets make later currencies cheap to add without redesigning the bar.
        this.createFutureCurrencySocket(435, 72, "Currency socket", "Reserved for whatever economy gets stapled on next.");
        this.createFutureCurrencySocket(489, 72, "Currency socket", "Another future wallet slot. Of course there will be more currencies.");

        // Loose Glimmer indicator: icon + downward arrow rather than another named counter.
        const looseBg = this.add.graphics();
        looseBg.fillStyle(0x1a2230, 0.90);
        looseBg.fillRoundedRect(526, 38, 155, 68, 18);
        looseBg.lineStyle(2, 0xffffff, 0.08);
        looseBg.strokeRoundedRect(526, 38, 155, 68, 18);
        this.hudRoot.add(looseBg);
        const looseIcon = this.add.image(554, 70, "glimmer").setScale(0.23);
        looseIcon.__blocksWorldInput = true;
        this.hudRoot.add(looseIcon);
        this.looseHud = this.add.text(581, 69, `↓ ${this.glimmerLoose.length}`, {
            fontFamily: "Arial", fontSize: "22px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0, 0.5);
        this.hudRoot.add(this.looseHud);
        this.attachTooltip(looseIcon, "Loose Glimmer", "Glimmer currently lying in the world. Pip must physically collect it.");

        // Right-side app rail. Some buttons are intentionally placeholders for the future mega-game UI.
        const rail = this.add.graphics();
        rail.fillStyle(0x0c121a, 0.84);
        rail.fillRoundedRect(635, 154, 70, 390, 24);
        rail.lineStyle(2, 0xffffff, 0.08);
        rail.strokeRoundedRect(635, 154, 70, 390, 24);
        this.hudRoot.add(rail);

        this.createHudIconButton(670, 194, "uiTown", "Nullmeadow", "The current hub world. Buildings, resources and increasingly questionable systems live here.", false);
        this.createHudIconButton(670, 265, "uiCrossed", "Game Cabinet", "Embedded games will accumulate here. Claimrun is Game #001.", false);
        this.createHudIconButton(670, 336, "uiBuild", "Build", "Construction is reserved for claimed Ghostlots. Nothing can be built yet.", true);
        this.createHudIconButton(670, 407, "uiInfo", "Codex", "Names, mechanics and discoveries will eventually collect here.", true);
        this.createHudIconButton(670, 478, "uiSettings", "Settings", "A future home for audio, accessibility and other switches.", true);

        // Bottom objective dock: always exposes the next actionable loop.
        const objectiveBg = this.add.graphics();
        objectiveBg.fillStyle(0x0c121a, 0.90);
        objectiveBg.fillRoundedRect(20, GAME_HEIGHT - 104, 680, 76, 20);
        objectiveBg.lineStyle(3, 0xffffff, 0.08);
        objectiveBg.strokeRoundedRect(20, GAME_HEIGHT - 104, 680, 76, 20);
        this.hudRoot.add(objectiveBg);

        const objectiveIcon = this.add.image(55, GAME_HEIGHT - 66, "uiSword").setScale(0.46);
        objectiveIcon.__blocksWorldInput = true;
        this.hudRoot.add(objectiveIcon);
        this.objectiveText = this.add.text(92, GAME_HEIGHT - 82, "", {
            fontFamily: "Arial", fontSize: "16px", fontStyle: "bold", color: "#eef3e4"
        });
        this.hudRoot.add(this.objectiveText);
        this.objectiveSubText = this.add.text(92, GAME_HEIGHT - 57, "", {
            fontFamily: "Arial", fontSize: "12px", fontStyle: "bold", color: "#94a2ae"
        });
        this.hudRoot.add(this.objectiveSubText);
        this.attachTooltip(objectiveIcon, "Current objective", "This dock follows the next useful thing Pip can do in the hub.");

        this.createHudTooltipLayer();
        this.updateHUD();
    }

    createCurrencyChip(x, y, texture, iconScale, title, description) {
        const bg = this.add.rectangle(x, y, 118, 62, 0x1a2230, 0.94)
            .setStrokeStyle(2, 0xffffff, 0.08)
            .setInteractive({ useHandCursor: true });
        bg.__blocksWorldInput = true;
        this.hudRoot.add(bg);

        const icon = this.add.image(x - 35, y, texture).setScale(iconScale);
        this.hudRoot.add(icon);

        const amount = this.add.text(x - 4, y, "0", {
            fontFamily: "Arial", fontSize: "26px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0, 0.5);
        this.hudRoot.add(amount);
        this.attachTooltip(bg, title, description);
        return amount;
    }

    createFutureCurrencySocket(x, y, title, description) {
        const bg = this.add.circle(x, y, 27, 0x161e29, 0.92)
            .setStrokeStyle(2, 0xffffff, 0.10)
            .setInteractive({ useHandCursor: true });
        bg.__blocksWorldInput = true;
        this.hudRoot.add(bg);
        const q = this.add.text(x, y - 1, "?", {
            fontFamily: "Arial", fontSize: "23px", fontStyle: "bold", color: "#596778"
        }).setOrigin(0.5);
        this.hudRoot.add(q);
        this.attachTooltip(bg, title, description);
    }

    createHudIconButton(x, y, texture, title, description, disabled = false) {
        const bg = this.add.circle(x, y, 26, disabled ? 0x171d25 : 0x263449, disabled ? 0.78 : 0.96)
            .setStrokeStyle(2, disabled ? 0xffffff : 0xffdc68, disabled ? 0.08 : 0.22)
            .setInteractive({ useHandCursor: true });
        bg.__blocksWorldInput = true;
        this.hudRoot.add(bg);

        const icon = this.add.image(x, y, texture).setScale(0.52).setAlpha(disabled ? 0.38 : 0.92);
        this.hudRoot.add(icon);

        bg.on("pointerover", () => {
            this.tweens.add({ targets: [bg, icon], scaleX: 1.08, scaleY: 1.08, duration: 70 });
        });
        bg.on("pointerout", () => {
            this.tweens.add({ targets: [bg, icon], scaleX: 1, scaleY: 1, duration: 70 });
        });
        this.attachTooltip(bg, title + (disabled ? " • LOCKED" : ""), description);
        return bg;
    }

    createHudTooltipLayer() {
        // Created after the other HUD pieces so explanations always render on top.
        this.tooltipBox = this.add.container(0, 0).setDepth(120000).setScrollFactor(0).setVisible(false);
        const bg = this.add.graphics();
        bg.fillStyle(0x070b11, 0.97);
        bg.fillRoundedRect(0, 0, 310, 112, 16);
        bg.lineStyle(2, 0xffdf68, 0.45);
        bg.strokeRoundedRect(0, 0, 310, 112, 16);
        this.tooltipTitle = this.add.text(16, 13, "", {
            fontFamily: "Arial", fontSize: "17px", fontStyle: "bold", color: "#fff0a2"
        });
        this.tooltipBody = this.add.text(16, 39, "", {
            fontFamily: "Arial", fontSize: "13px", color: "#c9d1dc", wordWrap: { width: 278 }
        });
        this.tooltipBox.add([bg, this.tooltipTitle, this.tooltipBody]);
        this.tooltipHideEvent = null;
    }

    attachTooltip(target, title, description) {
        if (!target.input) target.setInteractive({ useHandCursor: true });
        target.__blocksWorldInput = true;
        const show = (pointer, sticky) => {
            if (!this.tooltipBox) return;
            this.tooltipTitle.setText(title);
            this.tooltipBody.setText(description);
            const px = Phaser.Math.Clamp((pointer?.x ?? 360) - 155, 16, GAME_WIDTH - 326);
            const py = Phaser.Math.Clamp((pointer?.y ?? 220) + 24, 138, GAME_HEIGHT - 236);
            this.tooltipBox.setPosition(px, py).setVisible(true);
            if (this.tooltipHideEvent) {
                this.tooltipHideEvent.remove(false);
                this.tooltipHideEvent = null;
            }
            if (sticky) {
                this.tooltipHideEvent = this.time.delayedCall(2500, () => {
                    if (this.tooltipBox) this.tooltipBox.setVisible(false);
                    this.tooltipHideEvent = null;
                });
            }
        };
        target.on("pointerover", pointer => show(pointer, false));
        target.on("pointerout", () => {
            if (!this.tooltipHideEvent && this.tooltipBox) this.tooltipBox.setVisible(false);
        });
        target.on("pointerdown", (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            show(pointer, true); // Touch-friendly explanation bubble.
        });
    }

    generateGlimmer() {
        try { this.sound.play("crankClick", { volume: 0.28 }); } catch (_) {}

        this.tweens.killTweensOf(this.crankhouse);
        this.crankhouse.setScale(1.02, 1.15);
        this.tweens.add({
            targets: this.crankhouse,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 170,
            ease: "Back.Out"
        });

        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.Between(125, 230);
        const targetX = this.worldCenter.x + Math.cos(angle) * distance;
        const targetY = this.worldCenter.y + Math.sin(angle) * distance;

        const resource = this.add.image(this.worldCenter.x, this.worldCenter.y + 10, "glimmer")
            .setScale(0.46)
            .setDepth(this.worldCenter.y + 120)
            .setAlpha(0.1);

        resource.__collected = false;
        this.glimmerLoose.push(resource);
        this.updateHUD();

        this.tweens.add({
            targets: resource,
            x: targetX,
            y: targetY,
            alpha: 1,
            angle: Phaser.Math.Between(-90, 90),
            scaleX: 0.42,
            scaleY: 0.42,
            duration: 360,
            ease: "Back.Out"
        });

        this.tweens.add({
            targets: resource,
            y: targetY - 10,
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
            delay: 360
        });

        this.floatText(this.worldCenter.x + Phaser.Math.Between(-35, 35), this.worldCenter.y - 120, "+1 GLIMMER", "#ffe26d");
    }

    collectGlimmer(resource) {
        if (!resource.active || resource.__collected) return;
        resource.__collected = true;

        try { this.sound.play("glimmerCollect", { volume: 0.22 }); } catch (_) {}

        const index = this.glimmerLoose.indexOf(resource);
        if (index !== -1) this.glimmerLoose.splice(index, 1);

        this.glimmerOwned += 1;
        this.saveData.glimmer = this.glimmerOwned;
        persistSave(this.saveData);
        this.updateHUD();
        this.floatText(this.player.x, this.player.y - 105, "+1", "#fff0a5");

        this.tweens.killTweensOf(resource);
        this.tweens.add({
            targets: resource,
            x: this.player.x,
            y: this.player.y - 35,
            scaleX: 0.05,
            scaleY: 0.05,
            alpha: 0,
            duration: 150,
            ease: "Quad.In",
            onComplete: () => resource.destroy()
        });
    }

    beginClaimrun() {
        if (!this.activeGhostlot || this.claimrunLaunching) return;

        const lotId = this.activeGhostlot.id;
        const opened = this.saveData.openedClaimruns.includes(lotId);
        const cost = claimCostForProgress(this.saveData.unlockedLots.length);

        if (!opened) {
            if (this.glimmerOwned < cost) {
                const missing = cost - this.glimmerOwned;
                try { this.sound.play("powerDown", { volume: 0.18 }); } catch (_) {}
                this.floatText(this.activeGhostlot.x, this.activeGhostlot.y - 80, `NEED ${missing} MORE`, "#ff9ba2");
                this.showHudToast(`Need ${missing} more Glimmer to open this Claimrun.`);
                return;
            }

            this.glimmerOwned -= cost;
            this.saveData.glimmer = this.glimmerOwned;
            this.saveData.openedClaimruns.push(lotId);
            persistSave(this.saveData);
            this.registry.set("saveData", this.saveData);
            this.updateHUD();
            this.refreshGhostlotPrompt();
            this.floatText(this.activeGhostlot.x, this.activeGhostlot.y - 80, `-${cost}`, "#ffe170");
        }

        this.claimrunLaunching = true;
        this.moveTarget = null;
        try { this.sound.play("confirm", { volume: 0.30 }); } catch (_) {}
        this.cameras.main.fadeOut(260, 255, 219, 88);
        this.time.delayedCall(285, () => {
            this.scene.start("ClaimRunScene", { lotId });
        });
    }

    showHudToast(message) {
        if (this.hudToast && this.hudToast.active) this.hudToast.destroy();
        const toast = this.add.text(GAME_WIDTH / 2, 154, message, {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#fff3f4",
            backgroundColor: "#7a3540",
            padding: { x: 14, y: 9 },
            align: "center"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(130000);
        toast.__blocksWorldInput = true;
        this.hudToast = toast;
        this.tweens.add({
            targets: toast,
            y: 166,
            alpha: 0,
            delay: 1500,
            duration: 350,
            onComplete: () => toast.destroy()
        });
    }

    floatText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
            fontFamily: "Arial",
            fontSize: "22px",
            fontStyle: "bold",
            color,
            stroke: "#20251f",
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(9999);

        this.tweens.add({
            targets: t,
            y: y - 54,
            alpha: 0,
            duration: 700,
            ease: "Cubic.Out",
            onComplete: () => t.destroy()
        });
    }

    drawTargetMarker(x, y) {
        this.targetMarker.clear().setVisible(true);
        this.targetMarker.lineStyle(5, 0xffffff, 0.48);
        this.targetMarker.strokeCircle(x, y, 25);
        this.targetMarker.lineStyle(3, 0xffe26d, 0.62);
        this.targetMarker.strokeCircle(x, y, 12);

        this.tweens.killTweensOf(this.targetMarker);
        this.targetMarker.setAlpha(1);
        this.tweens.add({
            targets: this.targetMarker,
            alpha: 0.12,
            duration: 380,
            yoyo: true,
            repeat: 1,
            onComplete: () => this.targetMarker.setVisible(false)
        });
    }

    updateHUD() {
        if (!this.glimmerHud) return;
        this.glimmerHud.setText(compactAmount(this.glimmerOwned));
        this.valorHud.setText(compactAmount(this.saveData.valor || 0));
        this.looseHud.setText(`↓ ${this.glimmerLoose.length}`);

        if (this.activeGhostlot && this.objectiveText) {
            const opened = this.saveData.openedClaimruns.includes(this.activeGhostlot.id);
            const cost = claimCostForProgress(this.saveData.unlockedLots.length);
            this.objectiveText.setText(`CALLING // ${this.activeGhostlot.id.toUpperCase()}`);
            this.objectiveSubText.setText(opened
                ? "Entry paid • walk onto the lot and launch Claimrun"
                : `Walk onto the lot • Claimrun entry: ${cost} Glimmer`);
        } else if (this.objectiveText) {
            this.objectiveText.setText("NULLMEADOW // ALL CURRENT LOTS CLAIMED");
            this.objectiveSubText.setText("The hub is waiting for another terrible idea.");
        }

        this.refreshGhostlotPrompt();
    }

    updateGhostlotPrompt() {
        if (!this.activeGhostlot || !this.ghostlotPrompt) return;
        const lot = this.activeGhostlot;
        const inside = Phaser.Math.Distance.Between(this.player.x, this.player.y, lot.x, lot.y) < Math.max(112, lot.size * 0.72);
        this.ghostlotPrompt.setVisible(inside);
        if (inside) this.refreshGhostlotPrompt();
    }

    update() {
        const body = this.player.body;
        const keyboardX = (this.keys.right.isDown || this.cursors.right.isDown ? 1 : 0)
                        - (this.keys.left.isDown || this.cursors.left.isDown ? 1 : 0);
        const keyboardY = (this.keys.down.isDown || this.cursors.down.isDown ? 1 : 0)
                        - (this.keys.up.isDown || this.cursors.up.isDown ? 1 : 0);

        let vx = 0;
        let vy = 0;
        const speed = 315;

        if (keyboardX !== 0 || keyboardY !== 0) {
            this.moveTarget = null;
            this.targetMarker.setVisible(false);
            const dir = new Phaser.Math.Vector2(keyboardX, keyboardY).normalize();
            vx = dir.x * speed;
            vy = dir.y * speed;
        } else if (this.moveTarget) {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
            if (distance < 20) {
                this.moveTarget = null;
            } else {
                const dir = new Phaser.Math.Vector2(this.moveTarget.x - this.player.x, this.moveTarget.y - this.player.y).normalize();
                vx = dir.x * speed;
                vy = dir.y * speed;
            }
        }

        body.setVelocity(vx, vy);

        const moving = Math.abs(vx) + Math.abs(vy) > 5;
        if (moving) {
            if (this.player.anims.currentAnim?.key !== "pip-run") this.player.play("pip-run");
            if (Math.abs(vx) > 10) this.player.setFlipX(vx < 0);
        } else if (this.player.anims.currentAnim?.key !== "pip-idle") {
            this.player.play("pip-idle");
        }

        this.player.setDepth(this.player.y + 10);
        this.playerName.setPosition(this.player.x, this.player.y - 94);
        this.playerName.setDepth(this.player.depth + 20);

        for (const resource of [...this.glimmerLoose]) {
            if (!resource.active || resource.__collected) continue;
            resource.setDepth(resource.y + 4);
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, resource.x, resource.y) < 80) {
                this.collectGlimmer(resource);
            }
        }

        this.updateGhostlotPrompt();
    }

    makeRng(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
}

class ClaimRunScene extends Phaser.Scene {
    constructor() {
        super("ClaimRunScene");
    }

    init(data) {
        this.lotId = data.lotId || "Ghostlot 01";
    }

    create() {
        this.saveData = this.registry.get("saveData") || loadSave();
        this.registry.set("saveData", this.saveData);

        // Claimrun is procedural. Difficulty is based on successful claims, so retries
        // stay on the same tier while every newly claimed Ghostlot escalates the next run.
        this.difficulty = Math.max(1, (this.saveData.unlockedLots || []).length + 1);
        this.totalEnemies = 16 + this.difficulty * 5 + Math.floor(Math.pow(this.difficulty, 1.12) * 1.35);
        this.totalGatePairs = 3 + Math.floor((this.difficulty - 1) * 0.65);
        this.enemySpawnDelay = Math.max(285, 660 - (this.difficulty - 1) * 30);
        this.enemyBaseSpeed = 76 + (this.difficulty - 1) * 6.5;
        this.enemyBaseHp = 1 + Math.floor((this.difficulty - 1) / 4);
        this.gateSpeed = 120 + Math.min(62, (this.difficulty - 1) * 5.5);
        this.gateSpawnDelay = Math.max(2250, 3500 - (this.difficulty - 1) * 105);

        this.spawnedEnemies = 0;
        this.defeatedEnemies = 0;
        this.integrityMax = 5;
        this.integrity = this.integrityMax;
        this.spawnedGatePairs = 0;
        this.resolvedGatePairs = 0;
        this.gatePairCounter = 0;
        this.gatePairs = new Map();

        // The three arithmetic stats modified by walls.
        this.volley = 1;      // projectiles per shot
        this.rateTier = 0;    // each tier changes firing interval by ~9%
        this.speedTier = 0;   // each tier changes projectile speed by 55 px/s

        this.challengeOver = false;
        this.nextShotAt = 0;
        this.playerTargetX = GAME_WIDTH / 2;

        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.cameras.main.setBackgroundColor("#101522");
        this.createArena();
        this.createChallengePlayer();
        this.createChallengeGroups();
        this.createChallengeHUD();
        this.createChallengeInput();
        this.startProceduralRun();

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.bullets, this.gates, this.hitGate, null, this);
        this.physics.add.overlap(this.challengePlayer, this.gates, this.crossGate, null, this);

        this.cameras.main.fadeIn(300, 255, 219, 88);
    }

    createArena() {
        const g = this.add.graphics().setDepth(-1000);
        g.fillStyle(0x101522, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        g.fillStyle(0x1b2437, 1);
        g.fillRoundedRect(54, 138, GAME_WIDTH - 108, GAME_HEIGHT - 230, 28);

        g.lineStyle(5, 0x6f8ba8, 0.34);
        g.strokeRoundedRect(54, 138, GAME_WIDTH - 108, GAME_HEIGHT - 230, 28);

        for (let y = 190; y < GAME_HEIGHT - 120; y += 100) {
            g.lineStyle(2, 0xffffff, 0.045);
            g.lineBetween(82, y, GAME_WIDTH - 82, y);
        }

        // Player/fence line.
        g.fillStyle(0xffd34f, 0.10);
        g.fillRect(80, 1010, GAME_WIDTH - 160, 130);
        g.lineStyle(4, 0xffd34f, 0.25);
        g.lineBetween(80, 1010, GAME_WIDTH - 80, 1010);

        // Tiny fake perspective rails help sell the terrible mobile-ad aesthetic.
        g.lineStyle(3, 0x88a5c2, 0.10);
        g.lineBetween(80, 1010, 210, 138);
        g.lineBetween(GAME_WIDTH - 80, 1010, 510, 138);
    }

    createChallengePlayer() {
        this.challengePlayer = this.physics.add.sprite(GAME_WIDTH / 2, 1092, "pipIdle", 0)
            .setScale(0.52)
            .setDepth(5000);
        this.challengePlayer.body.setAllowGravity(false);
        this.challengePlayer.setCollideWorldBounds(true);
        this.challengePlayer.body.setSize(75, 92).setOffset(58, 66);
        this.challengePlayer.play("pip-idle");

        this.add.text(GAME_WIDTH / 2, 1175, "PIP // CLAIM MODE", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#fff0a2",
            stroke: "#101522",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(5001);
    }

    createChallengeGroups() {
        this.bullets = this.physics.add.group({ allowGravity: false });
        this.enemies = this.physics.add.group({ allowGravity: false });
        this.gates = this.physics.add.group({ allowGravity: false });
    }

    startProceduralRun() {
        // Spawn enemies continuously in increasingly chunky horde ticks.
        this.enemySpawnEvent = this.time.addEvent({
            delay: this.enemySpawnDelay,
            loop: true,
            callback: () => this.spawnEnemyTick()
        });
        this.spawnEnemyTick();

        // Gate pairs are generated at runtime: one positive, one negative, same stat.
        // Their values mutate every time a projectile hits them.
        this.time.delayedCall(650, () => {
            if (!this.challengeOver) this.spawnGatePair();
        });

        this.gateSpawnEvent = this.time.addEvent({
            delay: this.gateSpawnDelay,
            loop: true,
            callback: () => {
                if (this.spawnedGatePairs < this.totalGatePairs) this.spawnGatePair();
                if (this.spawnedGatePairs >= this.totalGatePairs && this.gateSpawnEvent) {
                    this.gateSpawnEvent.remove(false);
                }
            }
        });
    }

    spawnEnemyTick() {
        if (this.challengeOver || this.spawnedEnemies >= this.totalEnemies) {
            if (this.enemySpawnEvent) this.enemySpawnEvent.remove(false);
            return;
        }

        let batch = 1;
        if (this.difficulty >= 4 && Math.random() < Math.min(0.60, 0.18 + this.difficulty * 0.025)) batch++;
        if (this.difficulty >= 8 && Math.random() < Math.min(0.38, 0.08 + this.difficulty * 0.018)) batch++;
        batch = Math.min(batch, this.totalEnemies - this.spawnedEnemies);

        for (let i = 0; i < batch; i++) {
            this.time.delayedCall(i * 95, () => this.spawnEnemy());
        }
    }

    spawnEnemy() {
        if (this.challengeOver || this.spawnedEnemies >= this.totalEnemies) return;
        this.spawnedEnemies++;

        const progress = this.spawnedEnemies / this.totalEnemies;
        const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const eliteChance = Math.min(0.34, 0.05 + this.difficulty * 0.022 + progress * 0.08);
        const elite = Math.random() < eliteChance;
        const hp = this.enemyBaseHp + (elite ? 1 : 0);
        const speed = Math.min(250,
            this.enemyBaseSpeed + Phaser.Math.Between(-7, 24) + progress * (24 + this.difficulty * 1.6)
        );

        const enemy = this.enemies.create(x, 160, "skeletonMove", 0)
            .setScale(elite ? 2.55 : 2.20)
            .setDepth(700);

        enemy.play("skeleton-move");
        enemy.body.setAllowGravity(false);
        enemy.body.setSize(22, 26).setOffset(5, 4);
        enemy.setVelocityY(speed);
        enemy.__hp = hp;
        enemy.__maxHp = hp;
        enemy.__resolved = false;
        enemy.__elite = elite;
        if (elite) enemy.setTint(0xffd870);
    }

    spawnGatePair() {
        if (this.challengeOver || this.spawnedGatePairs >= this.totalGatePairs) return;

        this.spawnedGatePairs++;
        this.gatePairCounter++;
        const pairId = `wall-${this.gatePairCounter}`;
        const effects = ["VOLLEY", "RATE", "SPEED"];
        const effect = effects[Phaser.Math.Between(0, effects.length - 1)];

        // Later runs can begin with larger numbers, especially on the bad side.
        const tier = 1 + Math.floor((this.difficulty - 1) / 4);
        const positiveStart = Phaser.Math.Between(1, Math.min(3, tier));
        const negativeStart = -Phaser.Math.Between(1, Math.min(4, tier + (this.difficulty >= 7 ? 1 : 0)));
        const reversed = Math.random() < 0.5;

        const leftX = 217.5;
        const rightX = 502.5;
        const positiveX = reversed ? rightX : leftX;
        const negativeX = reversed ? leftX : rightX;
        const y = 176;

        const pair = { id: pairId, resolved: false, gates: [] };
        this.gatePairs.set(pairId, pair);
        pair.gates.push(this.createGate(positiveX, y, positiveStart, effect, pairId));
        pair.gates.push(this.createGate(negativeX, y, negativeStart, effect, pairId));
        this.updateChallengeHUD();
    }

    createGate(x, y, value, effect, pairId) {
        const positive = value > 0;
        const gate = this.add.rectangle(x, y, 275, 86, positive ? 0x3dd878 : 0xf1515c, 0.25)
            .setStrokeStyle(6, positive ? 0x74ff9f : 0xff7b84, 0.96)
            .setDepth(1200);

        this.physics.add.existing(gate);
        gate.body.setAllowGravity(false);
        gate.body.setImmovable(true);
        gate.body.setVelocityY(this.gateSpeed);
        gate.__pairId = pairId;
        gate.__effect = effect;
        gate.__value = value;
        gate.__positive = positive;
        gate.__resolved = false;

        gate.__valueText = this.add.text(x, y - 10, this.formatGateValue(value), {
            fontFamily: "Arial",
            fontSize: "34px",
            fontStyle: "bold",
            color: positive ? "#c9ffda" : "#ffd0d4",
            stroke: "#101522",
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(1202);

        gate.__effectText = this.add.text(x, y + 25, effect, {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(1202).setAlpha(0.9);

        // Cheap moving-wall bars: no asset needed, but visually reads more like a gate.
        gate.__bars = [-92, -46, 0, 46, 92].map(offset =>
            this.add.rectangle(x + offset, y, 5, 70, positive ? 0xb2ffc9 : 0xffb0b7, 0.24)
                .setDepth(1201)
        );

        this.gates.add(gate);
        return gate;
    }

    formatGateValue(value) {
        return value > 0 ? `+${value}` : String(value);
    }

    refreshGateVisual(gate) {
        if (!gate || !gate.active) return;
        gate.__valueText.setText(this.formatGateValue(gate.__value));
    }

    syncGateVisual(gate) {
        if (!gate.active) return;
        gate.__valueText.setPosition(gate.x, gate.y - 10);
        gate.__effectText.setPosition(gate.x, gate.y + 25);
        gate.__bars.forEach((bar, index) => {
            if (bar.active) bar.setPosition(gate.x + [-92, -46, 0, 46, 92][index], gate.y);
        });
    }

    destroyGate(gate) {
        if (!gate) return;
        if (gate.__valueText?.active) gate.__valueText.destroy();
        if (gate.__effectText?.active) gate.__effectText.destroy();
        for (const bar of gate.__bars || []) if (bar.active) bar.destroy();
        if (gate.active) gate.destroy();
    }

    resolveGatePair(pairId, chosenGate = null) {
        const pair = this.gatePairs.get(pairId);
        if (!pair || pair.resolved) return;
        pair.resolved = true;
        this.resolvedGatePairs++;

        if (chosenGate) this.applyGateEffect(chosenGate);
        for (const gate of pair.gates) this.destroyGate(gate);
        this.updateChallengeHUD();
    }

    hitGate(bullet, gate) {
        if (this.challengeOver || !bullet.active || !gate.active || gate.__resolved) return;
        bullet.destroy();

        // Literal mobile-ad arithmetic: shooting a +1 makes it +2; shooting a -1
        // makes it -2. Positive walls are worth feeding. Bad walls get worse.
        gate.__value += gate.__positive ? 1 : -1;
        gate.__value = Phaser.Math.Clamp(gate.__value, -15, 15);
        this.refreshGateVisual(gate);

        this.tweens.add({
            targets: [gate, gate.__valueText],
            alpha: 0.42,
            duration: 45,
            yoyo: true
        });

        const color = gate.__positive ? "#8dffae" : "#ff9ba2";
        if (Math.abs(gate.__value) % 4 === 0) {
            this.floatChallengeText(gate.x, gate.y - 58, this.formatGateValue(gate.__value), color);
        }
    }

    crossGate(player, gate) {
        if (this.challengeOver || !gate.active || gate.__resolved) return;
        const pair = this.gatePairs.get(gate.__pairId);
        if (!pair || pair.resolved) return;
        gate.__resolved = true;
        this.resolveGatePair(gate.__pairId, gate);
    }

    applyGateEffect(gate) {
        const value = gate.__value;
        const positive = value > 0;

        if (gate.__effect === "VOLLEY") {
            this.volley = Phaser.Math.Clamp(this.volley + value, 1, 12);
        } else if (gate.__effect === "RATE") {
            this.rateTier = Phaser.Math.Clamp(this.rateTier + value, -6, 18);
        } else if (gate.__effect === "SPEED") {
            this.speedTier = Phaser.Math.Clamp(this.speedTier + value, -6, 18);
        }

        try {
            this.sound.play(positive ? "powerUp" : "powerDown", { volume: 0.18 });
        } catch (_) {}

        this.cameras.main.shake(positive ? 70 : 120, positive ? 0.0025 : 0.005);
        this.floatChallengeText(
            this.challengePlayer.x,
            this.challengePlayer.y - 120,
            `${gate.__effect} ${this.formatGateValue(value)}`,
            positive ? "#8dffae" : "#ff9ba2"
        );
        this.updateChallengeHUD();
    }

    createChallengeHUD() {
        const top = this.add.graphics().setDepth(10000);
        top.fillStyle(0x0a0f19, 0.96);
        top.fillRect(0, 0, GAME_WIDTH, 136);
        top.lineStyle(3, 0xffffff, 0.08);
        top.lineBetween(0, 135, GAME_WIDTH, 135);

        this.add.text(28, 17, "THE CLAIMRUN", {
            fontFamily: "Arial",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#fff0a2"
        }).setDepth(10001);

        this.add.text(28, 55, `${this.lotId.toUpperCase()}  //  RUN ${this.difficulty}`, {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#8ca0b5"
        }).setDepth(10001);

        this.enemyHud = this.add.text(690, 18, "", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#ffffff",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.fireHud = this.add.text(690, 48, "", {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#72ff9d",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.integrityHud = this.add.text(690, 82, "", {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffb2b8",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.wallHud = this.add.text(28, 87, "", {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#aebdcc"
        }).setDepth(10001);

        this.add.text(GAME_WIDTH / 2, 1236,
            "AUTO-FIRE • SHOOT WALLS TO CHANGE THEIR NUMBER • CROSS ONE TO APPLY IT",
            {
                fontFamily: "Arial",
                fontSize: "12px",
                fontStyle: "bold",
                color: "#aebdcc"
            }
        ).setOrigin(0.5).setDepth(10001);

        this.updateChallengeHUD();
    }

    createChallengeInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.claimKeys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        const setTarget = pointer => {
            if (this.challengeOver) return;
            this.playerTargetX = Phaser.Math.Clamp(pointer.x, 105, GAME_WIDTH - 105);
        };

        this.input.on("pointerdown", setTarget);
        this.input.on("pointermove", pointer => {
            if (pointer.isDown) setTarget(pointer);
        });
    }

    currentShotInterval() {
        return Phaser.Math.Clamp(400 * Math.pow(0.91, this.rateTier), 78, 650);
    }

    currentBulletSpeed() {
        return Phaser.Math.Clamp(690 + this.speedTier * 55, 330, 1450);
    }

    shoot(time) {
        const interval = this.currentShotInterval();
        if (time < this.nextShotAt) return;
        this.nextShotAt = time + interval;

        const projectileCount = this.volley;
        const spacing = projectileCount <= 1 ? 0 : Math.max(9, Math.min(18, 162 / (projectileCount - 1)));

        for (let i = 0; i < projectileCount; i++) {
            const offset = (i - (projectileCount - 1) / 2) * spacing;
            const bullet = this.bullets.create(this.challengePlayer.x + offset, 1025, "arrow")
                .setScale(1.25)
                .setAngle(-90)
                .setTint(0xffe36f)
                .setDepth(900);

            bullet.body.setAllowGravity(false);
            bullet.setVelocityY(-this.currentBulletSpeed());
        }

        try { this.sound.play("shot", { volume: 0.065, rate: 1.35 }); } catch (_) {}
    }

    hitEnemy(bullet, enemy) {
        if (this.challengeOver || !bullet.active || !enemy.active || enemy.__resolved) return;
        bullet.destroy();
        enemy.__hp--;

        try { this.sound.play("enemyHit", { volume: 0.08, rate: Phaser.Math.FloatBetween(1.0, 1.35) }); } catch (_) {}

        enemy.setTintFill(0xffffff);
        this.time.delayedCall(55, () => {
            if (enemy.active) {
                enemy.clearTint();
                if (enemy.__elite) enemy.setTint(0xffd870);
            }
        });

        if (enemy.__hp <= 0) {
            enemy.__resolved = true;
            this.defeatedEnemies++;
            this.burst(enemy.x, enemy.y, enemy.__elite ? 0xffd870 : 0xdde4ef);
            enemy.destroy();
            this.updateChallengeHUD();
        }
    }

    breachEnemy(enemy) {
        if (!enemy.active || enemy.__resolved) return;
        enemy.__resolved = true;
        this.integrity--;
        this.burst(enemy.x, 1010, 0xff5964);
        enemy.destroy();
        this.cameras.main.shake(120, 0.006);
        this.updateChallengeHUD();

        if (this.integrity <= 0) this.finishChallenge(false);
    }

    updateChallengeHUD() {
        if (!this.enemyHud) return;
        this.enemyHud.setText(`HORDE  ${this.defeatedEnemies} / ${this.totalEnemies}`);
        this.fireHud.setText(`×${this.volley}  RATE ${this.rateTier >= 0 ? "+" : ""}${this.rateTier}  SPD ${this.speedTier >= 0 ? "+" : ""}${this.speedTier}`);
        this.integrityHud.setText(`FENCE  ${"■".repeat(Math.max(0, this.integrity))}${"□".repeat(Math.max(0, this.integrityMax - this.integrity))}`);
        if (this.wallHud) this.wallHud.setText(`WALLS  ${this.resolvedGatePairs} / ${this.totalGatePairs}`);
    }

    burst(x, y, color) {
        for (let i = 0; i < 7; i++) {
            const p = this.add.rectangle(x, y, Phaser.Math.Between(5, 11), Phaser.Math.Between(5, 11), color, 0.92)
                .setDepth(3000)
                .setAngle(Phaser.Math.Between(0, 180));
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = Phaser.Math.Between(25, 65);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                angle: p.angle + Phaser.Math.Between(80, 220),
                duration: 320,
                onComplete: () => p.destroy()
            });
        }
    }

    floatChallengeText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
            fontFamily: "Arial",
            fontSize: "22px",
            fontStyle: "bold",
            color,
            stroke: "#101522",
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(5000);

        this.tweens.add({
            targets: t,
            y: y - 45,
            alpha: 0,
            duration: 650,
            onComplete: () => t.destroy()
        });
    }

    finishChallenge(won) {
        if (this.challengeOver) return;
        this.challengeOver = true;
        if (this.enemySpawnEvent) this.enemySpawnEvent.remove(false);
        if (this.gateSpawnEvent) this.gateSpawnEvent.remove(false);
        this.physics.pause();

        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x070b12, 0.78)
            .setDepth(20000)
            .setInteractive();

        if (won) {
            if (!this.saveData.unlockedLots.includes(this.lotId)) {
                this.saveData.unlockedLots.push(this.lotId);
                this.saveData.valor = (this.saveData.valor || 0) + 1;
            }
            this.saveData.openedClaimruns = (this.saveData.openedClaimruns || []).filter(id => id !== this.lotId);
            persistSave(this.saveData);
            this.registry.set("saveData", this.saveData);
            try { this.sound.play("confirm", { volume: 0.32, rate: 1.05 }); } catch (_) {}

            this.add.text(GAME_WIDTH / 2, 470, "CLAIM WON", {
                fontFamily: "Arial",
                fontSize: "58px",
                fontStyle: "bold",
                color: "#fff0a2",
                stroke: "#101522",
                strokeThickness: 9
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 555, `${this.lotId} IS YOURS`, {
                fontFamily: "Arial",
                fontSize: "24px",
                fontStyle: "bold",
                color: "#d8ffc0"
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 598, `RUN ${this.difficulty} CLEARED`, {
                fontFamily: "Arial",
                fontSize: "15px",
                fontStyle: "bold",
                color: "#9baaba"
            }).setOrigin(0.5).setDepth(20001);

            this.add.image(GAME_WIDTH / 2 - 42, 660, "uiValor")
                .setScale(0.72)
                .setDepth(20001);
            this.add.text(GAME_WIDTH / 2 + 2, 660, "+1", {
                fontFamily: "Arial",
                fontSize: "36px",
                fontStyle: "bold",
                color: "#87e8ff"
            }).setOrigin(0, 0.5).setDepth(20001);

            this.time.delayedCall(1450, () => {
                this.cameras.main.fadeOut(260, 255, 219, 88);
                this.time.delayedCall(285, () => this.scene.start("GameScene"));
            });
        } else {
            this.add.text(GAME_WIDTH / 2, 450, "CLAIM FAILED", {
                fontFamily: "Arial",
                fontSize: "52px",
                fontStyle: "bold",
                color: "#ff9ba2",
                stroke: "#101522",
                strokeThickness: 9
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 530, `Run ${this.difficulty} ate Pip. Entry is still paid.`, {
                fontFamily: "Arial",
                fontSize: "20px",
                color: "#d7dde6"
            }).setOrigin(0.5).setDepth(20001);

            const retry = this.add.text(GAME_WIDTH / 2, 650, "TRY AGAIN", {
                fontFamily: "Arial",
                fontSize: "28px",
                fontStyle: "bold",
                color: "#16150f",
                backgroundColor: "#ffdf68",
                padding: { x: 24, y: 14 }
            }).setOrigin(0.5).setDepth(20002).setInteractive({ useHandCursor: true });

            const retreat = this.add.text(GAME_WIDTH / 2, 730, "BACK TO NULLMEADOW", {
                fontFamily: "Arial",
                fontSize: "18px",
                fontStyle: "bold",
                color: "#c8d0dc"
            }).setOrigin(0.5).setDepth(20002).setInteractive({ useHandCursor: true });

            retry.on("pointerdown", () => this.scene.restart({ lotId: this.lotId }));
            retreat.on("pointerdown", () => this.scene.start("GameScene"));
        }
    }

    update(time) {
        if (this.challengeOver) return;

        const left = this.claimKeys.left.isDown || this.cursors.left.isDown;
        const right = this.claimKeys.right.isDown || this.cursors.right.isDown;

        if (left || right) {
            const direction = (right ? 1 : 0) - (left ? 1 : 0);
            this.challengePlayer.x = Phaser.Math.Clamp(this.challengePlayer.x + direction * 7.5, 105, GAME_WIDTH - 105);
            this.playerTargetX = this.challengePlayer.x;
        } else {
            this.challengePlayer.x = Phaser.Math.Linear(this.challengePlayer.x, this.playerTargetX, 0.22);
        }

        this.challengePlayer.body.updateFromGameObject();
        this.shoot(time);

        for (const bullet of [...this.bullets.getChildren()]) {
            if (bullet.active && bullet.y < 120) bullet.destroy();
        }

        for (const enemy of [...this.enemies.getChildren()]) {
            if (enemy.active && enemy.y > 1000) this.breachEnemy(enemy);
        }

        for (const gate of [...this.gates.getChildren()]) {
            if (!gate.active) continue;
            this.syncGateVisual(gate);
            if (gate.y > 1170) this.resolveGatePair(gate.__pairId, null);
        }

        const hordeFinished = this.spawnedEnemies >= this.totalEnemies && this.enemies.countActive(true) === 0;
        const wallsFinished = this.spawnedGatePairs >= this.totalGatePairs && this.resolvedGatePairs >= this.totalGatePairs;
        if (hordeFinished && wallsFinished && this.integrity > 0) this.finishChallenge(true);
    }
}

const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#748d59",
    pixelArt: true,
    antialias: false,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    },
    input: {
        activePointers: 3
    },
    scene: [GameScene, ClaimRunScene]
};

new Phaser.Game(config);