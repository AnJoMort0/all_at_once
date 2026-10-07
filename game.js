// ============================================================================
// NULLMEADOW — v0.1
// A deliberately simple clicker/world foundation for future vibe-coded chaos.
// ============================================================================

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;
const WORLD_SIZE = 2300;

const ASSETS = {
    crankhouse: "assets/images/environment/buildings/tiny_swords/Blue Buildings/House1.png",
    pipIdle: "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Idle.png",
    pipRun: "assets/images/spritesheets/characters/tiny_swords/Yellow Units/Pawn/Pawn_Run.png",
    glimmer: "assets/images/environment/resources/tiny_swords/Gold/Gold Resource/Gold_Resource.png",
    crankClick: "assets/audio/sfx/other/finger_click.wav",
    glimmerCollect: "assets/audio/sfx/items/gem_collect.wav"
};

class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("crankhouse", ASSETS.crankhouse);
        this.load.image("glimmer", ASSETS.glimmer);

        this.load.spritesheet("pipIdle", ASSETS.pipIdle, {
            frameWidth: 192,
            frameHeight: 192
        });

        this.load.spritesheet("pipRun", ASSETS.pipRun, {
            frameWidth: 192,
            frameHeight: 192
        });

        this.load.audio("crankClick", ASSETS.crankClick);
        this.load.audio("glimmerCollect", ASSETS.glimmerCollect);
    }

    create() {
        this.worldCenter = new Phaser.Math.Vector2(WORLD_SIZE / 2, WORLD_SIZE / 2);
        this.glimmerOwned = 0;
        this.glimmerLoose = [];
        this.moveTarget = null;

        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
        this.cameras.main.setBackgroundColor("#748d59");

        this.createGround();
        this.createGhostlots();
        this.createCrankhouse();
        this.createPip();
        this.createAnimations();
        this.createInput();
        this.createHUD();

        this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
        this.cameras.main.setDeadzone(120, 220);
        this.cameras.main.fadeIn(350, 19, 27, 34);
    }

    createGround() {
        const g = this.add.graphics().setDepth(-1000);

        // Large checkerboard-ish grass field: intentionally procedural so the
        // world still has texture even before we choose a proper tileset.
        const tile = 128;
        for (let y = 0; y < WORLD_SIZE; y += tile) {
            for (let x = 0; x < WORLD_SIZE; x += tile) {
                const odd = ((x / tile) + (y / tile)) % 2;
                g.fillStyle(odd ? 0x78915a : 0x718955, 1);
                g.fillRect(x, y, tile, tile);
            }
        }

        // Hairline world grid. This will be useful later for buildings/roads.
        g.lineStyle(2, 0x344934, 0.10);
        for (let p = 0; p <= WORLD_SIZE; p += tile) {
            g.lineBetween(p, 0, p, WORLD_SIZE);
            g.lineBetween(0, p, WORLD_SIZE, p);
        }

        // Central worn patch underneath the starter settlement.
        g.fillStyle(0xb8aa76, 0.18);
        g.fillCircle(this.worldCenter.x, this.worldCenter.y, 330);
        g.lineStyle(8, 0xd5c28c, 0.10);
        g.strokeCircle(this.worldCenter.x, this.worldCenter.y, 330);

        // Tiny deterministic weeds/pebbles for some visual noise.
        const rng = this.makeRng(0x4e554c4c);
        for (let i = 0; i < 260; i++) {
            const x = 30 + rng() * (WORLD_SIZE - 60);
            const y = 30 + rng() * (WORLD_SIZE - 60);
            const r = 2 + rng() * 5;
            g.fillStyle(rng() > 0.45 ? 0x4e6e43 : 0xc0b179, 0.34);
            g.fillCircle(x, y, r);
        }
    }

    createGhostlots() {
        this.ghostlots = [];
        const rng = this.makeRng(0x47484f53);
        const placed = [];

        // "Random", but seeded so the same lots stay in the same places across
        // reloads. That gives future buildings stable homes.
        for (let i = 0; i < 11; i++) {
            let candidate = null;

            for (let attempt = 0; attempt < 120; attempt++) {
                const angle = rng() * Math.PI * 2;
                const radius = 430 + rng() * 560;
                const size = 170 + Math.floor(rng() * 90);
                const x = Phaser.Math.Clamp(this.worldCenter.x + Math.cos(angle) * radius, 180, WORLD_SIZE - 180);
                const y = Phaser.Math.Clamp(this.worldCenter.y + Math.sin(angle) * radius, 180, WORLD_SIZE - 180);

                const rect = new Phaser.Geom.Rectangle(x - size / 2, y - size / 2, size, size);
                const padded = new Phaser.Geom.Rectangle(
                    rect.x - 90,
                    rect.y - 90,
                    rect.width + 180,
                    rect.height + 180
                );
                const tooClose = placed.some(other =>
                    Phaser.Geom.Intersects.RectangleToRectangle(padded, other)
                );

                if (!tooClose) {
                    candidate = { x, y, size, rect };
                    break;
                }
            }

            if (!candidate) continue;
            placed.push(candidate.rect);

            const id = `Ghostlot ${String(i + 1).padStart(2, "0")}`;
            const lot = this.drawGhostlot(candidate.x, candidate.y, candidate.size, id);
            this.ghostlots.push({ id, ...candidate, graphics: lot });
        }
    }

    drawGhostlot(x, y, size, label) {
        const g = this.add.graphics().setDepth(-100);
        const half = size / 2;

        g.fillStyle(0x18222a, 0.10);
        g.fillRoundedRect(x - half, y - half, size, size, 18);
        g.lineStyle(7, 0xe9e2bd, 0.30);
        g.strokeRoundedRect(x - half, y - half, size, size, 18);

        // Corner marks make the outline read as a build site rather than a box.
        g.lineStyle(5, 0xffffff, 0.38);
        const c = 28;
        g.lineBetween(x - half, y - half + c, x - half, y - half);
        g.lineBetween(x - half, y - half, x - half + c, y - half);
        g.lineBetween(x + half - c, y - half, x + half, y - half);
        g.lineBetween(x + half, y - half, x + half, y - half + c);
        g.lineBetween(x - half, y + half - c, x - half, y + half);
        g.lineBetween(x - half, y + half, x - half + c, y + half);
        g.lineBetween(x + half - c, y + half, x + half, y + half);
        g.lineBetween(x + half, y + half, x + half, y + half - c);

        // Draw a tiny lock without relying on emoji/font support.
        const lockY = y - 4;
        g.lineStyle(7, 0xf2d477, 0.65);
        g.strokeCircle(x, lockY - 17, 17);
        g.fillStyle(0x6b613b, 0.70);
        g.fillRoundedRect(x - 27, lockY - 10, 54, 46, 8);
        g.fillStyle(0xf2d477, 0.75);
        g.fillCircle(x, lockY + 8, 5);
        g.fillRect(x - 3, lockY + 8, 6, 13);

        this.add.text(x, y + half + 20, label.toUpperCase(), {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#e8e1c3",
            stroke: "#203021",
            strokeThickness: 5
        }).setOrigin(0.5, 0).setDepth(-90).setAlpha(0.65);

        return g;
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

        this.crankhouse.on("pointerdown", () => {
            this.generateGlimmer();
        });
    }

    createPip() {
        this.player = this.physics.add.sprite(
            this.worldCenter.x,
            this.worldCenter.y + 340,
            "pipIdle",
            0
        );

        this.player.setScale(0.48);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(this.player.y + 10);
        this.player.body.setCircle(54, 42, 66);
        this.player.body.setMaxSpeed(320);
        this.player.body.setDrag(1450, 1450);

        this.playerName = this.add.text(this.player.x, this.player.y - 74, "PIP", {
            fontFamily: "Arial",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#20251f",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(this.player.depth + 20);

        this.targetMarker = this.add.graphics().setDepth(9000).setVisible(false);
    }

    createAnimations() {
        this.anims.create({
            key: "pip-idle",
            frames: this.anims.generateFrameNumbers("pipIdle", { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: "pip-run",
            frames: this.anims.generateFrameNumbers("pipRun", { start: 0, end: 5 }),
            frameRate: 12,
            repeat: -1
        });

        this.player.play("pip-idle");
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
        const hud = this.add.container(0, 0).setDepth(100000).setScrollFactor(0);

        const panel = this.add.graphics();
        panel.fillStyle(0x111923, 0.88);
        panel.fillRoundedRect(18, 18, 684, 112, 24);
        panel.lineStyle(3, 0xffffff, 0.10);
        panel.strokeRoundedRect(18, 18, 684, 112, 24);
        hud.add(panel);

        const title = this.add.text(42, 37, "NULLMEADOW", {
            fontFamily: "Arial",
            fontSize: "25px",
            fontStyle: "bold",
            color: "#dbe9bc"
        });
        hud.add(title);

        this.glimmerHud = this.add.text(42, 75, "GLIMMER  0", {
            fontFamily: "Arial",
            fontSize: "31px",
            fontStyle: "bold",
            color: "#ffd75f"
        });
        hud.add(this.glimmerHud);

        const looseLabel = this.add.text(676, 52, "ON GROUND", {
            fontFamily: "Arial",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#9eac9a"
        }).setOrigin(1, 0.5);
        hud.add(looseLabel);

        this.looseHud = this.add.text(676, 86, "0", {
            fontFamily: "Arial",
            fontSize: "30px",
            fontStyle: "bold",
            color: "#ffffff"
        }).setOrigin(1, 0.5);
        hud.add(this.looseHud);

        const helpBg = this.add.graphics().setDepth(99999).setScrollFactor(0);
        helpBg.fillStyle(0x10161d, 0.82);
        helpBg.fillRoundedRect(28, GAME_HEIGHT - 86, GAME_WIDTH - 56, 58, 18);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 57,
            "MOVE: WASD / ARROWS / TAP GROUND     •     CRANK: CLICK BUILDING",
            {
                fontFamily: "Arial",
                fontSize: "14px",
                fontStyle: "bold",
                color: "#e7eadf",
                align: "center"
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(100000).setAlpha(0.84);
    }

    generateGlimmer() {
        try { this.sound.play("crankClick", { volume: 0.28 }); } catch (_) {}

        // Squash the building so every click feels physical.
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
            .setScale(0.34)
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
            scaleX: 0.30,
            scaleY: 0.30,
            duration: 360,
            ease: "Back.Out"
        });

        this.tweens.add({
            targets: resource,
            y: targetY - 9,
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
            delay: 360
        });

        this.floatText(
            this.worldCenter.x + Phaser.Math.Between(-35, 35),
            this.worldCenter.y - 120,
            "+1 GLIMMER",
            "#ffe26d"
        );
    }

    collectGlimmer(resource) {
        if (!resource.active || resource.__collected) return;
        resource.__collected = true;

        try { this.sound.play("glimmerCollect", { volume: 0.22 }); } catch (_) {}

        const index = this.glimmerLoose.indexOf(resource);
        if (index !== -1) this.glimmerLoose.splice(index, 1);

        this.glimmerOwned += 1;
        this.updateHUD();
        this.floatText(this.player.x, this.player.y - 85, "+1", "#fff0a5");

        this.tweens.killTweensOf(resource);
        this.tweens.add({
            targets: resource,
            x: this.player.x,
            y: this.player.y - 30,
            scaleX: 0.05,
            scaleY: 0.05,
            alpha: 0,
            duration: 140,
            ease: "Quad.In",
            onComplete: () => resource.destroy()
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
        this.looseHud.setText(String(this.glimmerLoose.length));
    }

    update() {
        const body = this.player.body;
        const keyboardX = (this.keys.right.isDown || this.cursors.right.isDown ? 1 : 0)
                        - (this.keys.left.isDown || this.cursors.left.isDown ? 1 : 0);
        const keyboardY = (this.keys.down.isDown || this.cursors.down.isDown ? 1 : 0)
                        - (this.keys.up.isDown || this.cursors.up.isDown ? 1 : 0);

        let vx = 0;
        let vy = 0;
        const speed = 300;

        if (keyboardX !== 0 || keyboardY !== 0) {
            this.moveTarget = null;
            this.targetMarker.setVisible(false);
            const dir = new Phaser.Math.Vector2(keyboardX, keyboardY).normalize();
            vx = dir.x * speed;
            vy = dir.y * speed;
        } else if (this.moveTarget) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.moveTarget.x,
                this.moveTarget.y
            );

            if (distance < 20) {
                this.moveTarget = null;
            } else {
                const dir = new Phaser.Math.Vector2(
                    this.moveTarget.x - this.player.x,
                    this.moveTarget.y - this.player.y
                ).normalize();
                vx = dir.x * speed;
                vy = dir.y * speed;
            }
        }

        body.setVelocity(vx, vy);

        const moving = Math.abs(vx) + Math.abs(vy) > 5;
        if (moving) {
            if (this.player.anims.currentAnim?.key !== "pip-run") this.player.play("pip-run");
            if (Math.abs(vx) > 10) this.player.setFlipX(vx < 0);
        } else {
            if (this.player.anims.currentAnim?.key !== "pip-idle") this.player.play("pip-idle");
        }

        this.player.setDepth(this.player.y + 10);
        this.playerName.setPosition(this.player.x, this.player.y - 74);
        this.playerName.setDepth(this.player.depth + 20);

        // Pip is the only thing that can bank loose Glimmer.
        for (const resource of [...this.glimmerLoose]) {
            if (!resource.active || resource.__collected) continue;
            resource.setDepth(resource.y + 4);

            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, resource.x, resource.y) < 62) {
                this.collectGlimmer(resource);
            }
        }
    }

    makeRng(seed) {
        // Mulberry32. Small, deterministic, dependency-free.
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
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
    scene: [GameScene]
};

new Phaser.Game(config);
