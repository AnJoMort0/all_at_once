// ============================================================================
// NULLMEADOW — v0.2
// Overworld clicker + first Ghostlot Claimrun challenge.
// ============================================================================

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const WORLD_SIZE = 2100;
const SAVE_KEY = "nullmeadow-save-v2";

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
        unlockedLots: []
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

        const call = this.add.text(lot.x, lot.y - lot.size / 2 - 70, "FIRST CLAIM", {
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
        if (!this.activeGhostlot) return;

        const lot = this.activeGhostlot;
        const container = this.add.container(lot.x, lot.y - lot.size / 2 - 116)
            .setDepth(50000)
            .setVisible(false);

        const bubble = this.add.graphics();
        bubble.fillStyle(0x111923, 0.96);
        bubble.fillRoundedRect(-142, -58, 284, 116, 28);
        bubble.lineStyle(4, 0xffdf68, 0.92);
        bubble.strokeRoundedRect(-142, -58, 284, 116, 28);
        bubble.fillStyle(0x111923, 0.96);
        bubble.fillTriangle(-16, 58, 16, 58, 0, 79);

        const label = this.add.text(-118, -33, "CLAIM THIS LOT", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#fff3b0"
        });

        const sub = this.add.text(-118, -4, "Fight for the deed", {
            fontFamily: "Arial",
            fontSize: "15px",
            color: "#c8d0cc"
        });

        const button = this.add.circle(84, 0, 39, 0xffd34f, 1)
            .setStrokeStyle(5, 0xffffff, 0.72)
            .setInteractive({ useHandCursor: true });

        const triangle = this.add.triangle(90, 0, -10, -15, -10, 15, 16, 0, 0x2b281b, 1);
        container.add([bubble, label, sub, button, triangle]);

        button.on("pointerdown", (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            this.beginClaimrun();
        });

        this.ghostlotPrompt = container;
        this.challengeButton = button;
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
            if (currentlyOver && (
                currentlyOver.includes(this.crankhouse)
                || currentlyOver.includes(this.challengeButton)
            )) return;
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
        const hud = this.add.container(0, 0).setDepth(100000).setScrollFactor(0);
        const panel = this.add.graphics();
        panel.fillStyle(0x111923, 0.90);
        panel.fillRoundedRect(18, 18, 684, 112, 24);
        panel.lineStyle(3, 0xffffff, 0.10);
        panel.strokeRoundedRect(18, 18, 684, 112, 24);
        hud.add(panel);

        hud.add(this.add.text(42, 34, "NULLMEADOW", {
            fontFamily: "Arial",
            fontSize: "23px",
            fontStyle: "bold",
            color: "#dbe9bc"
        }));

        this.glimmerHud = this.add.text(42, 73, `GLIMMER  ${this.glimmerOwned}`, {
            fontFamily: "Arial",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#ffd75f"
        });
        hud.add(this.glimmerHud);

        this.valorHud = this.add.text(342, 73, `VALOR  ${this.saveData.valor || 0}`, {
            fontFamily: "Arial",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#87e8ff"
        }).setOrigin(0.5, 0);
        hud.add(this.valorHud);

        hud.add(this.add.text(676, 48, "ON GROUND", {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#9eac9a"
        }).setOrigin(1, 0.5));

        this.looseHud = this.add.text(676, 82, String(this.glimmerLoose.length), {
            fontFamily: "Arial",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(1, 0.5);
        hud.add(this.looseHud);

        const helpBg = this.add.graphics().setDepth(99999).setScrollFactor(0);
        helpBg.fillStyle(0x10161d, 0.82);
        helpBg.fillRoundedRect(28, GAME_HEIGHT - 86, GAME_WIDTH - 56, 58, 18);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 57,
            "MOVE: WASD / ARROWS / TAP     •     CRANK: CLICK BUILDING     •     FIND THE CALLING LOT",
            {
                fontFamily: "Arial",
                fontSize: "13px",
                fontStyle: "bold",
                color: "#e7eadf",
                align: "center"
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(100000).setAlpha(0.84);
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
        if (!this.activeGhostlot) return;
        this.moveTarget = null;
        try { this.sound.play("confirm", { volume: 0.30 }); } catch (_) {}
        this.cameras.main.fadeOut(260, 255, 219, 88);
        this.time.delayedCall(285, () => {
            this.scene.start("ClaimRunScene", { lotId: this.activeGhostlot.id });
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
        this.glimmerHud.setText(`GLIMMER  ${this.glimmerOwned}`);
        this.valorHud.setText(`VALOR  ${this.saveData.valor || 0}`);
        this.looseHud.setText(String(this.glimmerLoose.length));
    }

    updateGhostlotPrompt() {
        if (!this.activeGhostlot || !this.ghostlotPrompt) return;
        const lot = this.activeGhostlot;
        const inside = Phaser.Math.Distance.Between(this.player.x, this.player.y, lot.x, lot.y) < Math.max(112, lot.size * 0.72);
        this.ghostlotPrompt.setVisible(inside);
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

        this.totalEnemies = 22;
        this.spawnedEnemies = 0;
        this.defeatedEnemies = 0;
        this.integrity = 5;
        this.fireLevel = 1;
        this.challengeOver = false;
        this.nextShotAt = 0;
        this.playerTargetX = GAME_WIDTH / 2;

        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.cameras.main.setBackgroundColor("#101522");
        this.createArena();
        this.createChallengePlayer();
        this.createChallengeGroups();
        this.createGates();
        this.createChallengeHUD();
        this.createChallengeInput();

        this.enemySpawnEvent = this.time.addEvent({
            delay: 610,
            repeat: this.totalEnemies - 1,
            callback: () => this.spawnEnemy()
        });

        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.bullets, this.gates, this.hitGate, null, this);

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

        g.fillStyle(0xffd34f, 0.10);
        g.fillRect(80, 1010, GAME_WIDTH - 160, 130);
        g.lineStyle(4, 0xffd34f, 0.25);
        g.lineBetween(80, 1010, GAME_WIDTH - 80, 1010);
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
        this.gates = this.physics.add.group({ allowGravity: false, immovable: true });
    }

    createGates() {
        this.createGatePair(760, false, 1);
        this.createGatePair(590, true, 2);
        this.createGatePair(420, false, 3);
    }

    createGatePair(y, reversed, row) {
        const leftX = 210;
        const rightX = 510;
        const positiveX = reversed ? rightX : leftX;
        const negativeX = reversed ? leftX : rightX;

        this.createGate(positiveX, y, "positive", `gate-${row}-plus`);
        this.createGate(negativeX, y, "negative", `gate-${row}-minus`);
    }

    createGate(x, y, type, id) {
        const positive = type === "positive";
        const gate = this.add.rectangle(x, y, 230, 76, positive ? 0x4adf83 : 0xff5964, 0.20)
            .setStrokeStyle(5, positive ? 0x72ff9d : 0xff7d86, 0.88)
            .setDepth(400);

        this.physics.add.existing(gate);
        gate.body.setAllowGravity(false);
        gate.body.setImmovable(true);
        gate.body.moves = false;
        gate.__type = type;
        gate.__id = id;
        gate.__charge = 0;
        gate.__threshold = positive ? 4 : 3;

        gate.__text = this.add.text(x, y - 7, positive ? "+ FIRE" : "- FIRE", {
            fontFamily: "Arial",
            fontSize: "23px",
            fontStyle: "bold",
            color: positive ? "#b9ffd0" : "#ffd1d5",
            stroke: "#101522",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(401);

        gate.__meter = this.add.text(x, y + 22, `0 / ${gate.__threshold}`, {
            fontFamily: "Arial",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(0.5).setDepth(401).setAlpha(0.82);

        this.gates.add(gate);
    }

    createChallengeHUD() {
        const top = this.add.graphics().setDepth(10000);
        top.fillStyle(0x0a0f19, 0.96);
        top.fillRect(0, 0, GAME_WIDTH, 128);
        top.lineStyle(3, 0xffffff, 0.08);
        top.lineBetween(0, 127, GAME_WIDTH, 127);

        this.add.text(28, 22, "THE CLAIMRUN", {
            fontFamily: "Arial",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#fff0a2"
        }).setDepth(10001);

        this.add.text(28, 62, this.lotId.toUpperCase(), {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#8ca0b5"
        }).setDepth(10001);

        this.enemyHud = this.add.text(690, 24, "", {
            fontFamily: "Arial",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#ffffff",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.fireHud = this.add.text(690, 55, "", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#72ff9d",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.integrityHud = this.add.text(690, 85, "", {
            fontFamily: "Arial",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#ffb2b8",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.add.text(GAME_WIDTH / 2, 1238, "DRAG / MOVE LEFT & RIGHT  •  AUTO-FIRE  •  SHOOT GREEN, AVOID RED", {
            fontFamily: "Arial",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#aebdcc"
        }).setOrigin(0.5).setDepth(10001);

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

    shoot(time) {
        const interval = Math.max(105, 410 - this.fireLevel * 36);
        if (time < this.nextShotAt) return;
        this.nextShotAt = time + interval;

        const projectileCount = 1 + Math.floor((this.fireLevel - 1) / 2);
        const spacing = 18;

        for (let i = 0; i < projectileCount; i++) {
            const offset = (i - (projectileCount - 1) / 2) * spacing;
            const bullet = this.bullets.create(this.challengePlayer.x + offset, 1025, "arrow")
                .setScale(1.25)
                .setAngle(-90)
                .setTint(0xffe36f)
                .setDepth(900);

            bullet.body.setAllowGravity(false);
            bullet.setVelocityY(-690);
            bullet.__gateHits = new Set();
        }

        try { this.sound.play("shot", { volume: 0.07, rate: 1.35 }); } catch (_) {}
    }

    spawnEnemy() {
        if (this.challengeOver) return;
        this.spawnedEnemies++;

        const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const enemy = this.enemies.create(x, 160, "skeletonMove", 0)
            .setScale(2.20)
            .setDepth(700);

        enemy.play("skeleton-move");
        enemy.body.setAllowGravity(false);
        enemy.body.setSize(22, 26).setOffset(5, 4);
        enemy.setVelocityY(72 + Math.min(70, this.spawnedEnemies * 2.3) + Phaser.Math.Between(-8, 18));
        enemy.__hp = this.spawnedEnemies > 14 ? 2 : 1;
        enemy.__resolved = false;
    }

    hitEnemy(bullet, enemy) {
        if (this.challengeOver || !bullet.active || !enemy.active || enemy.__resolved) return;
        bullet.destroy();
        enemy.__hp--;

        try { this.sound.play("enemyHit", { volume: 0.08, rate: Phaser.Math.FloatBetween(1.0, 1.35) }); } catch (_) {}

        enemy.setTintFill(0xffffff);
        this.time.delayedCall(55, () => {
            if (enemy.active) enemy.clearTint();
        });

        if (enemy.__hp <= 0) {
            enemy.__resolved = true;
            this.defeatedEnemies++;
            this.burst(enemy.x, enemy.y, 0xdde4ef);
            enemy.destroy();
            this.updateChallengeHUD();
        }
    }

    hitGate(bullet, gate) {
        if (!bullet.active || !gate.active || this.challengeOver) return;
        if (bullet.__gateHits.has(gate.__id)) return;
        bullet.__gateHits.add(gate.__id);
        gate.__charge++;
        gate.__meter.setText(`${gate.__charge % gate.__threshold} / ${gate.__threshold}`);

        this.tweens.add({
            targets: gate,
            alpha: 0.48,
            duration: 50,
            yoyo: true
        });

        if (gate.__charge % gate.__threshold === 0) {
            if (gate.__type === "positive") {
                const old = this.fireLevel;
                this.fireLevel = Math.min(8, this.fireLevel + 1);
                if (this.fireLevel !== old) {
                    try { this.sound.play("powerUp", { volume: 0.15 }); } catch (_) {}
                    this.floatChallengeText(gate.x, gate.y - 58, `FIRE ${this.fireLevel}`, "#8dffae");
                }
            } else {
                const old = this.fireLevel;
                this.fireLevel = Math.max(1, this.fireLevel - 1);
                if (this.fireLevel !== old) {
                    try { this.sound.play("powerDown", { volume: 0.15 }); } catch (_) {}
                    this.floatChallengeText(gate.x, gate.y - 58, `FIRE ${this.fireLevel}`, "#ff9ba2");
                }
            }
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
        const resolved = this.defeatedEnemies + Math.max(0, 5 - this.integrity);
        this.enemyHud.setText(`WAVE  ${Math.min(this.spawnedEnemies, this.totalEnemies)} / ${this.totalEnemies}`);
        this.fireHud.setText(`FIRE LV.${this.fireLevel}`);
        this.integrityHud.setText(`FENCE  ${"■".repeat(Math.max(0, this.integrity))}${"□".repeat(Math.max(0, 5 - this.integrity))}`);
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
        this.physics.pause();

        const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x070b12, 0.78)
            .setDepth(20000)
            .setInteractive();

        if (won) {
            if (!this.saveData.unlockedLots.includes(this.lotId)) {
                this.saveData.unlockedLots.push(this.lotId);
                this.saveData.valor = (this.saveData.valor || 0) + 1;
            }
            persistSave(this.saveData);
            this.registry.set("saveData", this.saveData);
            try { this.sound.play("confirm", { volume: 0.32, rate: 1.05 }); } catch (_) {}

            this.add.text(GAME_WIDTH / 2, 490, "CLAIM WON", {
                fontFamily: "Arial",
                fontSize: "58px",
                fontStyle: "bold",
                color: "#fff0a2",
                stroke: "#101522",
                strokeThickness: 9
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 575, `${this.lotId} IS YOURS`, {
                fontFamily: "Arial",
                fontSize: "24px",
                fontStyle: "bold",
                color: "#d8ffc0"
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 638, "+1 VALOR", {
                fontFamily: "Arial",
                fontSize: "34px",
                fontStyle: "bold",
                color: "#87e8ff"
            }).setOrigin(0.5).setDepth(20001);

            this.time.delayedCall(1450, () => {
                this.cameras.main.fadeOut(260, 255, 219, 88);
                this.time.delayedCall(285, () => this.scene.start("GameScene"));
            });
        } else {
            this.add.text(GAME_WIDTH / 2, 470, "CLAIM FAILED", {
                fontFamily: "Arial",
                fontSize: "52px",
                fontStyle: "bold",
                color: "#ff9ba2",
                stroke: "#101522",
                strokeThickness: 9
            }).setOrigin(0.5).setDepth(20001);

            this.add.text(GAME_WIDTH / 2, 548, "The deed remains locked.", {
                fontFamily: "Arial",
                fontSize: "21px",
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

        for (const bullet of this.bullets.getChildren()) {
            if (bullet.active && bullet.y < 120) bullet.destroy();
        }

        for (const enemy of [...this.enemies.getChildren()]) {
            if (enemy.active && enemy.y > 1000) this.breachEnemy(enemy);
        }

        const waveFinished = this.spawnedEnemies >= this.totalEnemies && this.enemies.countActive(true) === 0;
        if (waveFinished && this.integrity > 0) this.finishChallenge(true);
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
