/*
===============================================================================
RIFTFALL — NULLMEADOW SURVIVAL GAME
===============================================================================

A separate scene/file on purpose, but NOT a separate world. Claimrun stays a lane/gate
game; Riftfall is an invasion state laid over Nullmeadow itself. The Crankhouse, claimed
Ghostlots, constructed buildings and the Nightglass Reliquary remain visible while the
meadow is under attack. A future counter-invasion can take Pip into the enemy world.

Core loop
- Survive a finite chain of escalating hordes. Clear every horde to hold the meadow.
- Pip uses a close-range Warrior loadout and attacks automatically.
- Enemy count, composition, batch size and horde count scale with Night difficulty.
- Kills physically drop Riftglass. Collected Riftglass is banked immediately.
- Surviving the full invasion awards Dawnseals.
- Recruitment buildings in Nullmeadow add autonomous Archers, Lancers and Monks.
- Pipyard / Warroom / Brassroot research feed permanent bonuses into this scene.
===============================================================================
*/

class InvasionScene extends Phaser.Scene {

    constructor() {
        super("InvasionScene");
    }


    init(data) {
        this.entryData = {
            x: Number.isFinite(data?.x) ? data.x : WORLD_SIZE / 2,
            y: Number.isFinite(data?.y) ? data.y : WORLD_SIZE / 2 + 260,
            riftX: Number.isFinite(data?.riftX) ? data.riftX : WORLD_SIZE / 2 + 430,
            riftY: Number.isFinite(data?.riftY) ? data.riftY : WORLD_SIZE / 2 - 220
        };
    }


    preload() {

        const loadImage = (key, path) => {
            if (!this.textures.exists(key)) {
                this.load.image(key, path);
            }
        };

        const loadSheet = (key, path, frameWidth, frameHeight) => {
            if (!this.textures.exists(key)) {
                this.load.spritesheet(
                    key,
                    path,
                    { frameWidth, frameHeight }
                );
            }
        };

        loadImage("claimArrow", ASSETS.claimArrow);
        loadImage("riftGlassIcon", ASSETS.riftGlassIcon);
        loadImage("dawnSealIcon", ASSETS.dawnSealIcon);
        loadImage("uiRoundBlue", ASSETS.uiRoundBlue);
        loadImage("uiRoundRed", ASSETS.uiRoundRed);
        loadImage("uiTinyRoundBlue", ASSETS.uiTinyRoundBlue);
        loadImage("uiTown", ASSETS.uiTown);
        loadImage("uiSword", ASSETS.uiSword);
        loadImage("uiBuild", ASSETS.uiBuild);
        loadImage("uiLotLocked", ASSETS.uiLotLocked);
        loadImage("crankhouse", ASSETS.crankhouse);
        loadImage("riftReliquary", ASSETS.riftReliquary);

        for (const definition of Object.values(BUILDING_DEFS)) {
            loadImage(definition.texture, ASSETS[definition.texture]);
        }

        for (const key of ["rock1", "rock2", "rock3", "rock4"]) {
            loadImage(key, ASSETS[key]);
        }

        loadSheet("fieldTrees", ASSETS.treeStrip, 192, 192);
        loadSheet("fieldTreesAutumn", ASSETS.autumnTreeStrip, 192, 192);

        loadSheet("riftWarriorIdle", ASSETS.invasionWarriorIdle, 192, 192);
        loadSheet("riftWarriorRun", ASSETS.invasionWarriorRun, 192, 192);
        loadSheet("riftWarriorAttack", ASSETS.invasionWarriorAttack, 192, 192);

        loadSheet("riftArcherIdle", ASSETS.invasionArcherIdle, 192, 192);
        loadSheet("riftArcherShoot", ASSETS.invasionArcherShoot, 192, 192);

        loadSheet("riftLancerIdle", ASSETS.invasionLancerIdle, 320, 320);
        loadSheet("riftLancerAttack", ASSETS.invasionLancerAttack, 320, 320);

        loadSheet("riftMonkIdle", ASSETS.invasionMonkIdle, 192, 192);
        loadSheet("riftMonkHeal", ASSETS.invasionMonkHeal, 192, 192);

        loadSheet("riftSkeleton1", ASSETS.skeletonMove, 32, 32);
        loadSheet("riftSkeleton2", ASSETS.invasionSkeleton2, 32, 32);
        loadSheet("riftVampire", ASSETS.invasionVampire, 32, 32);

        for (const [key, path] of [
            ["riftArrow", ASSETS.arrowShot],
            ["riftEnemyHit", ASSETS.enemyHit],
            ["riftPickup", ASSETS.glimmerCollect],
            ["riftPower", ASSETS.powerUp],
            ["invasionTheme", ASSETS.invasionTheme],
            ["meadowWind", ASSETS.meadowWind]
        ]) {
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, path);
            }
        }

    }


    create() {

        this.physics.resume();

        this.saveData =
            this.registry.get("saveData") ||
            loadSave();

        ensureMetaState(this.saveData);

        this.saveData.invasionRuns++;
        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        this.difficulty =
            Math.max(
                1,
                (this.saveData.invasionWins || 0) + 1
            );

        /*
        ============================================================
        HORDE-BASED RIFTFALL
        ============================================================

        Riftfall no longer asks the player to wait out a fixed 90-second clock.
        A run is a finite set of increasingly dense hordes. Early Nights are
        deliberately short; later Nights grow by adding both enemies AND extra
        hordes, so upgrades/recruits create room for a longer escalation curve.
        */
        this.totalHordes =
            Phaser.Math.Clamp(
                5 + Math.floor((this.difficulty - 1) / 2),
                5,
                9
            );

        this.currentHorde = 1;
        this.hordeSpawned = 0;
        this.hordeTarget = this.getHordeTarget(this.currentHorde);
        this.hordeIntermissionUntil = 0;

        this.startedAt = this.time.now;
        this.runEnded = false;
        this.runKills = 0;
        this.runGlass = 0;
        this.lastFrenzyTier = 0;
        this.nextSpawnAt = this.time.now + 650;
        this.bossSpawned = false;
        this.lastBountySecond = -1;

        this.worldSize = WORLD_SIZE;
        this.worldCenter = new Phaser.Math.Vector2(
            this.worldSize / 2,
            this.worldSize / 2
        );

        const hasPipyard =
            hasBuildingInSave(
                this.saveData,
                "pipyard"
            );

        this.maxHp =
            5 +
            (hasPipyard ? 1 : 0) +
            (this.saveData.tech?.ironPulse || 0);

        this.hp = this.maxHp;

        this.moveSpeed =
            235 *
            (hasPipyard ? 1.15 : 1) *
            (
                1 +
                (this.saveData.tech?.longstep || 0) *
                0.04
            );

        this.baseAttackCooldown =
            720 *
            Math.pow(
                0.92,
                this.saveData.tech?.riftTempo || 0
            );

        // Deliberately tactile: drops must actually be approached.
        // Gravemagnet improves convenience without vacuuming half the screen.
        this.pickupRadius =
            30 +
            (this.saveData.tech?.gravemagnet || 0) *
            12;

        this.recruitDamageMultiplier =
            hasBuildingInSave(
                this.saveData,
                "warroom"
            )
                ? 1.35
                : 1;

        this.bountyData =
            hasBuildingInSave(
                this.saveData,
                "bountyBell"
            )
                ? ensureRotatingBounty(this.saveData)
                : null;

        AudioDirector.setPreferences(this.saveData);
        AudioDirector.setSceneMusic(
            this,
            "invasionTheme",
            "meadowWind"
        );

        this.input.once(
            "pointerdown",
            () => AudioDirector.unlock(this.saveData)
        );

        this.input.keyboard.once(
            "keydown",
            () => AudioDirector.unlock(this.saveData)
        );

        this.physics.world.setBounds(
            0,
            0,
            this.worldSize,
            this.worldSize
        );

        this.cameras.main.setBounds(
            0,
            0,
            this.worldSize,
            this.worldSize
        );

        this.cameras.main.setBackgroundColor("#26332d");

        this.createAnimations();
        this.createArena();
        this.createGroups();
        this.createPlayer();
        this.createRecruits();
        this.createHUD();
        this.createInput();
        this.announceHorde();

        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.hitPlayer,
            null,
            this
        );

        this.physics.add.overlap(
            this.recruitArrows,
            this.enemies,
            this.hitEnemyWithArrow,
            null,
            this
        );

        this.cameras.main.startFollow(
            this.player,
            true,
            0.10,
            0.10
        );

        this.cameras.main.setZoom(1.0);

        this.cameras.main.fadeIn(
            280,
            12,
            7,
            20
        );

        /*
            Do not resume Arcade Physics from SHUTDOWN.

            Phaser tears the scene physics world down as part of shutdown,
            so a late resume here can dereference a null world while
            returning to Nullmeadow. Retry/return resume explicitly before
            starting the next scene instead.
        */

    }


    createAnimations() {

        const ensure = (key, texture, start, end, frameRate, repeat = -1) => {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(
                        texture,
                        { start, end }
                    ),
                    frameRate,
                    repeat
                });
            }
        };

        ensure("rift-warrior-idle", "riftWarriorIdle", 0, 7, 8, -1);
        ensure("rift-warrior-run", "riftWarriorRun", 0, 5, 12, -1);
        ensure("rift-warrior-attack", "riftWarriorAttack", 0, 3, 18, 0);

        ensure("rift-archer-idle", "riftArcherIdle", 0, 5, 8, -1);
        ensure("rift-archer-shoot", "riftArcherShoot", 0, 7, 22, 0);

        ensure("rift-lancer-idle", "riftLancerIdle", 0, 11, 8, -1);
        ensure("rift-lancer-attack", "riftLancerAttack", 0, 2, 14, 0);

        ensure("rift-monk-idle", "riftMonkIdle", 0, 5, 8, -1);
        ensure("rift-monk-heal", "riftMonkHeal", 0, 10, 16, 0);

        ensure("rift-skeleton1", "riftSkeleton1", 0, 9, 10, -1);
        ensure("rift-skeleton2", "riftSkeleton2", 0, 9, 10, -1);
        ensure("rift-vampire", "riftVampire", 0, 7, 12, -1);

    }


    createArena() {

        const ground =
            this.add.graphics()
                .setDepth(-1000);

        // Same meadow palette as Nullmeadow, with a night-violet invasion wash.
        ground.fillStyle(0x718b54, 1);
        ground.fillRect(0, 0, this.worldSize, this.worldSize);

        const rng = this.makeMeadowRng(0x4e554c4c);
        const stainPalette = [
            0x526f49,
            0x84965e,
            0x65507b,
            0x617b4d
        ];

        for (let i = 0; i < 190; i++) {
            ground.fillStyle(
                stainPalette[Math.floor(rng() * stainPalette.length)],
                0.07 + rng() * 0.09
            );
            ground.fillEllipse(
                rng() * this.worldSize,
                rng() * this.worldSize,
                90 + rng() * 250,
                50 + rng() * 160
            );
        }

        this.invasionLots = this.buildInvasionGhostlots();

        // Meadow scenery stays sparse enough that the survival game remains readable.
        const sceneryRng = this.makeMeadowRng(0x46524545);
        let placed = 0;
        let attempts = 0;

        while (placed < 105 && attempts < 1200) {
            attempts++;

            const x = 85 + sceneryRng() * (this.worldSize - 170);
            const y = 105 + sceneryRng() * (this.worldSize - 190);

            if (
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.worldCenter.x,
                    this.worldCenter.y
                ) < 250
            ) {
                continue;
            }

            if (
                Phaser.Math.Distance.Between(
                    x,
                    y,
                    this.entryData.riftX,
                    this.entryData.riftY
                ) < 180
            ) {
                continue;
            }

            if (
                this.invasionLots.some(lot =>
                    Phaser.Math.Distance.Between(x, y, lot.x, lot.y) <
                    lot.size * 0.62 + 70
                )
            ) {
                continue;
            }

            if (placed % 4 === 0) {
                this.add.image(
                    x,
                    y,
                    `rock${1 + Math.floor(sceneryRng() * 4)}`
                )
                .setScale(0.36 + sceneryRng() * 0.20)
                .setAlpha(0.78)
                .setDepth(y - 5);
            } else {
                this.add.sprite(
                    x,
                    y,
                    sceneryRng() < 0.26
                        ? "fieldTreesAutumn"
                        : "fieldTrees",
                    Math.floor(sceneryRng() * 8)
                )
                .setOrigin(0.5, 0.88)
                .setScale(0.28 + sceneryRng() * 0.12)
                .setAlpha(0.80)
                .setDepth(y - 12);
            }

            placed++;
        }

        // The Crankhouse is still here. This is Nullmeadow under attack.
        this.add.image(
            this.worldCenter.x,
            this.worldCenter.y,
            "crankhouse"
        )
        .setScale(1.08)
        .setDepth(this.worldCenter.y + 2);

        this.add.text(
            this.worldCenter.x,
            this.worldCenter.y - 142,
            "THE CRANKHOUSE",
            {
                fontFamily: FONT_DISPLAY,
                fontSize: "20px",
                color: "#fff1aa",
                stroke: "#1b211c",
                strokeThickness: 5
            }
        )
        .setOrigin(0.5)
        .setDepth(this.worldCenter.y + 5);

        // The Reliquary becomes the visible wound the invasion is spilling from.
        this.add.circle(
            this.entryData.riftX,
            this.entryData.riftY + 12,
            92,
            0x6e3eb5,
            0.17
        )
        .setDepth(this.entryData.riftY - 8);

        this.add.image(
            this.entryData.riftX,
            this.entryData.riftY,
            "riftReliquary"
        )
        .setScale(0.74)
        .setTint(0xc8a7ff)
        .setDepth(this.entryData.riftY + 4);

        this.add.text(
            this.entryData.riftX,
            this.entryData.riftY - 132,
            "RIFT BREACH",
            {
                fontFamily: FONT_TECH,
                fontSize: "14px",
                fontStyle: "bold",
                color: "#e4d2ff",
                stroke: "#16101f",
                strokeThickness: 4
            }
        )
        .setOrigin(0.5)
        .setDepth(this.entryData.riftY + 6);

        // Dark atmospheric wash without replacing the meadow itself.
        this.invasionWash =
            this.add.rectangle(
                this.worldSize / 2,
                this.worldSize / 2,
                this.worldSize,
                this.worldSize,
                0x211832,
                0.13
            )
            .setDepth(15000);

        // It should tint scenery but never obscure actors or HUD.
        this.invasionWash.setBlendMode(Phaser.BlendModes.MULTIPLY);

    }


    makeMeadowRng(seed) {

        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };

    }


    buildInvasionGhostlots() {

        const rng = this.makeMeadowRng(0x47484f53);
        const placed = [];
        const lots = [];

        for (let i = 0; i < 11; i++) {
            let candidate = null;

            for (let attempt = 0; attempt < 400; attempt++) {
                const angle = rng() * Math.PI * 2;
                const radius = 315 + rng() * 355;
                const size = 150 + Math.floor(rng() * 65);

                const x = Phaser.Math.Clamp(
                    this.worldCenter.x + Math.cos(angle) * radius,
                    160,
                    this.worldSize - 160
                );

                const y = Phaser.Math.Clamp(
                    this.worldCenter.y + Math.sin(angle) * radius,
                    160,
                    this.worldSize - 160
                );

                const rect = new Phaser.Geom.Rectangle(
                    x - size / 2,
                    y - size / 2,
                    size,
                    size
                );

                const padded = new Phaser.Geom.Rectangle(
                    rect.x - 42,
                    rect.y - 42,
                    rect.width + 84,
                    rect.height + 84
                );

                if (
                    placed.some(other =>
                        Phaser.Geom.Intersects.RectangleToRectangle(
                            padded,
                            other
                        )
                    )
                ) {
                    continue;
                }

                candidate = { x, y, size, padded };
                break;
            }

            if (!candidate) continue;
            placed.push(candidate.padded);

            const id = `Ghostlot ${String(i + 1).padStart(2, "0")}`;
            const unlocked = this.saveData.unlockedLots.includes(id);
            const buildingKey = this.saveData.buildings?.[id] || null;
            const lot = { id, unlocked, buildingKey, ...candidate };
            lots.push(lot);

            const plot = this.add.graphics().setDepth(candidate.y - 32);
            plot.fillStyle(
                unlocked ? 0x8db66b : 0x303729,
                unlocked ? 0.10 : 0.08
            );
            plot.fillRoundedRect(
                candidate.x - candidate.size / 2,
                candidate.y - candidate.size / 2,
                candidate.size,
                candidate.size,
                18
            );
            plot.lineStyle(
                unlocked ? 3 : 2,
                unlocked ? 0xc9e89a : 0xbcb58e,
                unlocked ? 0.32 : 0.16
            );
            plot.strokeRoundedRect(
                candidate.x - candidate.size / 2,
                candidate.y - candidate.size / 2,
                candidate.size,
                candidate.size,
                18
            );

            if (unlocked && buildingKey && BUILDING_DEFS[buildingKey]) {
                const def = BUILDING_DEFS[buildingKey];
                this.add.image(
                    candidate.x,
                    candidate.y + 4,
                    def.texture
                )
                .setScale(def.scale)
                .setDepth(candidate.y + 4);
            } else {
                const badgeTexture = unlocked ? "uiBuild" : "uiLotLocked";
                this.add.image(
                    candidate.x,
                    candidate.y,
                    badgeTexture
                )
                .setScale(unlocked ? 0.52 : 0.46)
                .setAlpha(unlocked ? 0.62 : 0.40)
                .setDepth(candidate.y + 2);
            }
        }

        return lots;

    }


    createGroups() {

        this.enemies =
            this.physics.add.group({
                allowGravity: false
            });

        this.recruitArrows =
            this.physics.add.group({
                allowGravity: false
            });

        this.riftDrops =
            this.add.group();

    }


    createPlayer() {

        this.player =
            this.physics.add.sprite(
                Phaser.Math.Clamp(this.entryData.x, 70, this.worldSize - 70),
                Phaser.Math.Clamp(this.entryData.y, 70, this.worldSize - 70),
                "riftWarriorIdle",
                0
            )
            .setScale(0.44)
            .setDepth(this.worldSize / 2 + 20)
            .setCollideWorldBounds(true);

        this.player.body
            .setCircle(
                38,
                58,
                58
            )
            .setAllowGravity(false);

        this.player.play("rift-warrior-idle");

        this.player.on(
            "animationcomplete-rift-warrior-attack",
            () => {
                if (this.player?.active && !this.runEnded) {
                    this.player.play("rift-warrior-idle", true);
                }
            }
        );

        this.nextAttackAt = 0;
        this.playerInvulnerableUntil = 0;

    }


    createRecruits() {

        this.recruits = [];

        const definitions = [
            {
                type: "archer",
                count: buildingCountInSave(this.saveData, "bowyerLodge"),
                texture: "riftArcherIdle",
                animation: "rift-archer-idle",
                scale: 0.34
            },
            {
                type: "lancer",
                count: buildingCountInSave(this.saveData, "pikehouse"),
                texture: "riftLancerIdle",
                animation: "rift-lancer-idle",
                scale: 0.25
            },
            {
                type: "monk",
                count: buildingCountInSave(this.saveData, "lanternCloister"),
                texture: "riftMonkIdle",
                animation: "rift-monk-idle",
                scale: 0.34
            }
        ];

        let serial = 0;

        for (const definition of definitions) {
            const count = Math.min(8, definition.count);

            for (let i = 0; i < count; i++) {

                const angle =
                    serial * 2.399963229728653;

                const radius =
                    82 +
                    (serial % 3) * 26;

                const sprite =
                    this.add.sprite(
                        this.player.x + Math.cos(angle) * radius,
                        this.player.y + Math.sin(angle) * radius,
                        definition.texture,
                        0
                    )
                    .setScale(definition.scale)
                    .setDepth(this.player.y + 5)
                    .play(definition.animation);

                sprite.on(
                    "animationcomplete",
                    () => {
                        if (!sprite.active || this.runEnded) {
                            return;
                        }

                        if (definition.type === "archer") {
                            sprite.play("rift-archer-idle", true);
                        } else if (definition.type === "lancer") {
                            sprite.play("rift-lancer-idle", true);
                        } else {
                            sprite.play("rift-monk-idle", true);
                        }
                    }
                );

                this.recruits.push({
                    type: definition.type,
                    sprite,
                    angle,
                    radius,
                    nextActionAt:
                        this.time.now +
                        550 +
                        serial * 90
                });

                serial++;
            }
        }

    }


    createHUD() {

        const hud =
            this.add.container(0, 0)
                .setDepth(20000)
                .setScrollFactor(0);

        const top = this.add.graphics();
        top.fillStyle(0x090d16, 0.95);
        top.fillRoundedRect(16, 14, 688, 116, 22);
        top.lineStyle(3, 0x9b79e8, 0.45);
        top.strokeRoundedRect(16, 14, 688, 116, 22);

        this.timeText =
            this.add.text(
                32,
                26,
                "RIFTFALL  •  HORDE 1",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "28px",
                    color: "#eadcff"
                }
            );

        this.hpText =
            this.add.text(
                34,
                67,
                "",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#ff9ba7"
                }
            );

        this.killText =
            this.add.text(
                280,
                67,
                "",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "16px",
                    fontStyle: "bold",
                    color: "#dbe5ef"
                }
            );

        const glassPlate =
            this.add.image(
                563,
                71,
                "uiTinyRoundBlue"
            )
            .setScale(0.68);

        const glassIcon =
            this.add.image(
                563,
                71,
                "riftGlassIcon"
            )
            .setScale(0.43);

        this.glassText =
            this.add.text(
                597,
                72,
                "0",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "24px",
                    color: "#e1ceff"
                }
            )
            .setOrigin(0, 0.5);

        this.progressBack =
            this.add.rectangle(
                34,
                105,
                650,
                8,
                0x1b2330,
                1
            )
            .setOrigin(0, 0.5);

        this.progressFill =
            this.add.rectangle(
                34,
                105,
                650,
                5,
                0xb489ff,
                1
            )
            .setOrigin(0, 0.5);

        this.messageText =
            this.add.text(
                GAME_WIDTH / 2,
                GAME_HEIGHT - 42,
                "MOVE • AUTO-SLASH • BREAK EVERY HORDE • COLLECT RIFTGLASS",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "13px",
                    fontStyle: "bold",
                    color: "#c8d1df",
                    stroke: "#0a0e16",
                    strokeThickness: 4
                }
            )
            .setOrigin(0.5);

        hud.add([
            top,
            this.timeText,
            this.hpText,
            this.killText,
            glassPlate,
            glassIcon,
            this.glassText,
            this.progressBack,
            this.progressFill,
            this.messageText
        ]);

        this.hudRoot = hud;
        this.updateHUD();

    }


    createInput() {

        this.cursors =
            this.input.keyboard.createCursorKeys();

        this.keys =
            this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });

        this.pointerTarget = null;

        const updateTarget = pointer => {
            if (this.runEnded || pointer.y < 136) {
                return;
            }

            const world =
                pointer.positionToCamera(
                    this.cameras.main
                );

            this.pointerTarget =
                new Phaser.Math.Vector2(
                    Phaser.Math.Clamp(world.x, 48, this.worldSize - 48),
                    Phaser.Math.Clamp(world.y, 48, this.worldSize - 48)
                );
        };

        this.input.on("pointerdown", updateTarget);
        this.input.on(
            "pointermove",
            pointer => {
                if (pointer.isDown) {
                    updateTarget(pointer);
                }
            }
        );

        this.input.on(
            "pointerup",
            () => {
                this.pointerTarget = null;
            }
        );

    }


    getHordeTarget(hordeNumber) {

        const horde =
            Phaser.Math.Clamp(
                hordeNumber,
                1,
                this.totalHordes || 5
            );

        const difficultyBonus =
            Math.floor(
                Math.min(
                    12,
                    Math.max(0, this.difficulty - 1) * 1.55
                )
            );

        const escalation =
            (horde - 1) * 3 +
            Math.floor(
                (horde - 1) *
                Math.max(0, this.difficulty - 2) *
                0.34
            );

        return Phaser.Math.Clamp(
            4 + difficultyBonus + escalation,
            4,
            34
        );

    }


    getHordeProgress() {

        const withinHorde =
            this.hordeTarget > 0
                ? this.hordeSpawned / this.hordeTarget
                : 0;

        return Phaser.Math.Clamp(
            (
                (this.currentHorde - 1) +
                withinHorde
            ) /
            this.totalHordes,
            0,
            1
        );

    }


    announceHorde() {

        let suffix = "";

        if (this.currentHorde === 2) {
            suffix = " • BONEGUARDS JOIN THE PUSH";
        } else if (this.currentHorde === 3) {
            suffix = " • THE NIGHT STARTS BITING BACK";
        } else if (this.currentHorde === this.totalHordes) {
            suffix = " • FINAL HORDE";
        }

        this.showRunMessage(
            `HORDE ${this.currentHorde}/${this.totalHordes}${suffix}`,
            this.currentHorde === this.totalHordes
                ? "#ffb1c1"
                : "#e7d6ff"
        );

    }


    updateHordeState(time) {

        if (this.runEnded) {
            return;
        }

        const hordeFullySpawned =
            this.hordeSpawned >=
            this.hordeTarget;

        const activeEnemies =
            this.enemies.countActive(true);

        if (
            !hordeFullySpawned ||
            activeEnemies > 0
        ) {
            return;
        }

        if (
            this.currentHorde >=
            this.totalHordes
        ) {
            this.finishRun(true);
            return;
        }

        if (!this.hordeIntermissionUntil) {
            this.hordeIntermissionUntil =
                time +
                Phaser.Math.Clamp(
                    1550 -
                    (this.difficulty - 1) * 45,
                    850,
                    1550
                );

            this.showRunMessage(
                `HORDE ${this.currentHorde} BROKEN • CATCH YOUR BREATH`,
                "#aef7bd"
            );

            return;
        }

        if (time < this.hordeIntermissionUntil) {
            return;
        }

        this.currentHorde++;
        this.hordeSpawned = 0;
        this.hordeTarget =
            this.getHordeTarget(
                this.currentHorde
            );
        this.hordeIntermissionUntil = 0;
        this.nextSpawnAt = time + 260;

        this.announceHorde();
        this.updateHUD();

    }


    spawnWave(time) {

        if (
            this.runEnded ||
            this.hordeIntermissionUntil ||
            this.hordeSpawned >= this.hordeTarget
        ) {
            return;
        }

        const overallProgress =
            this.getHordeProgress();

        const hordeProgress =
            Phaser.Math.Clamp(
                this.hordeSpawned /
                Math.max(1, this.hordeTarget),
                0,
                1
            );

        const hordePressure =
            this.totalHordes <= 1
                ? 0
                : (this.currentHorde - 1) /
                  (this.totalHordes - 1);

        let batch =
            1 +
            Math.floor(hordePressure * 2.15);

        // First horde is intentionally readable: singles at first, then pairs.
        if (this.currentHorde === 1) {
            batch =
                hordeProgress > 0.55 &&
                this.difficulty >= 3
                    ? 2
                    : 1;
        } else if (
            this.difficulty >= 5 &&
            Math.random() < 0.20 + hordePressure * 0.22
        ) {
            batch++;
        }

        batch = Phaser.Math.Clamp(
            batch,
            1,
            Math.min(
                5,
                this.hordeTarget - this.hordeSpawned
            )
        );

        const difficultyPressure =
            1 +
            Math.min(
                0.55,
                (this.difficulty - 1) * 0.05
            );

        const baseInterval =
            Phaser.Math.Linear(
                this.currentHorde === 1
                    ? 820
                    : 690,
                280,
                hordePressure
            );

        this.nextSpawnAt =
            time +
            baseInterval /
            difficultyPressure;

        for (let i = 0; i < batch; i++) {

            const isFinalEnemy =
                this.currentHorde ===
                    this.totalHordes &&
                !this.bossSpawned &&
                this.hordeSpawned ===
                    this.hordeTarget - 1;

            if (isFinalEnemy) {
                this.bossSpawned = true;
                this.spawnEnemy(overallProgress, true);
                this.showRunMessage(
                    "NIGHT BARON • LAST THING BETWEEN YOU AND DAWN",
                    "#ff9bab"
                );
            } else {
                this.spawnEnemy(overallProgress);
            }

            this.hordeSpawned++;

            if (
                this.hordeSpawned >=
                this.hordeTarget
            ) {
                break;
            }
        }

        this.updateHUD();

    }


    spawnEnemy(progress, boss = false) {

        const spawn =
            this.findSpawnPoint();

        let kind = "skeleton1";

        const hordeStage =
            this.totalHordes <= 1
                ? 1
                : (this.currentHorde - 1) /
                  (this.totalHordes - 1);

        if (boss) {
            kind = "vampire";
        } else if (
            this.currentHorde >= 3 &&
            Math.random() <
                0.08 +
                hordeStage * 0.30 +
                Math.min(0.12, (this.difficulty - 1) * 0.012)
        ) {
            kind = "vampire";
        } else if (
            this.currentHorde >= 2 &&
            Math.random() <
                0.24 +
                hordeStage * 0.30
        ) {
            kind = "skeleton2";
        }

        const texture =
            kind === "vampire"
                ? "riftVampire"
                : kind === "skeleton2"
                    ? "riftSkeleton2"
                    : "riftSkeleton1";

        const animation =
            kind === "vampire"
                ? "rift-vampire"
                : kind === "skeleton2"
                    ? "rift-skeleton2"
                    : "rift-skeleton1";

        const enemy =
            this.enemies.create(
                spawn.x,
                spawn.y,
                texture,
                0
            )
            .setScale(
                boss
                    ? 4.1
                    : kind === "vampire"
                        ? 2.25
                        : kind === "skeleton2"
                            ? 2.15
                            : 2.0
            )
            .setDepth(spawn.y + 4);

        enemy.play(animation);
        enemy.body.setAllowGravity(false);

        /*
            Keep contact collision close to the painted creature. The source
            frames contain transparent padding, so using most of the 32x32 frame
            makes enemies hurt Pip before their art appears to touch him.
        */
        if (boss) {
            enemy.body
                .setSize(10, 13)
                .setOffset(11, 10);
            enemy.__combatRadius = 23;
        } else if (kind === "vampire") {
            enemy.body
                .setSize(9, 13)
                .setOffset(11.5, 9.5);
            enemy.__combatRadius = 12;
        } else {
            enemy.body
                .setSize(8, 12)
                .setOffset(12, 10);
            enemy.__combatRadius = 10;
        }

        const earlySlow =
            progress < 0.16
                ? 0.72
                : 1;

        const difficultySpeed =
            1 +
            Math.min(
                0.32,
                (this.difficulty - 1) * 0.035
            );

        const baseSpeed =
            kind === "vampire"
                ? 112
                : kind === "skeleton2"
                    ? 78
                    : 88;

        enemy.__speed =
            (baseSpeed + progress * 62) *
            earlySlow *
            difficultySpeed *
            (boss ? 0.78 : 1);

        enemy.__hp =
            boss
                ? 32 + this.difficulty * 6
                : kind === "vampire"
                    ? 3 + Math.floor((this.difficulty - 1) / 3)
                    : kind === "skeleton2"
                        ? 2 + Math.floor((this.difficulty - 1) / 4)
                        : 1 + Math.floor((this.difficulty - 1) / 6);

        enemy.__maxHp = enemy.__hp;
        enemy.__damage = boss ? 2 : 1;
        enemy.__boss = boss;
        enemy.__kind = kind;
        enemy.__resolved = false;

        if (boss) {
            enemy.setTint(0xff657b);
            enemy.__label =
                this.add.text(
                    spawn.x,
                    spawn.y - 78,
                    "NIGHT BARON",
                    {
                        fontFamily: FONT_TECH,
                        fontSize: "13px",
                        fontStyle: "bold",
                        color: "#ff9bab",
                        stroke: "#0d1018",
                        strokeThickness: 4
                    }
                )
                .setOrigin(0.5)
                .setDepth(enemy.depth + 4);
        } else if (kind === "skeleton2") {
            enemy.setTint(0xd7c78b);
        } else if (kind === "vampire") {
            enemy.setTint(0xc899ff);
        }

    }


    findSpawnPoint() {

        const minRadius = 420;
        const maxRadius = 560;

        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Phaser.Math.Between(minRadius, maxRadius);
            const x = this.player.x + Math.cos(angle) * radius;
            const y = this.player.y + Math.sin(angle) * radius;

            if (
                x > 45 &&
                x < this.worldSize - 45 &&
                y > 45 &&
                y < this.worldSize - 45
            ) {
                return { x, y };
            }
        }

        return {
            x: Phaser.Math.Clamp(
                this.player.x + Phaser.Math.Between(-500, 500),
                50,
                this.worldSize - 50
            ),
            y: Phaser.Math.Clamp(
                this.player.y + (Math.random() < 0.5 ? -480 : 480),
                50,
                this.worldSize - 50
            )
        };

    }


    currentAttackCooldown() {

        const frenzyTier =
            Math.min(
                6,
                Math.floor(this.runKills / 18)
            );

        return Math.max(
            250,
            this.baseAttackCooldown *
            Math.pow(0.93, frenzyTier)
        );

    }


    autoAttack(time) {

        if (time < this.nextAttackAt || this.runEnded) {
            return;
        }

        const frenzyTier =
            Math.min(
                6,
                Math.floor(this.runKills / 18)
            );

        /*
            Reach is measured to the EDGE of an enemy's visible combat body,
            not blindly to its sprite centre. That prevents the awkward state
            where an enemy can overlap/hurt Pip while still being considered
            out of sword range.
        */
        const weaponReach =
            82 +
            frenzyTier * 4;

        const acquisitionRange =
            weaponReach + 30;

        const candidates =
            this.enemies
                .getChildren()
                .filter(enemy =>
                    enemy.active &&
                    !enemy.__resolved &&
                    Phaser.Math.Distance.Between(
                        this.player.x,
                        this.player.y,
                        enemy.x,
                        enemy.y
                    ) <= acquisitionRange
                )
                .sort((a, b) =>
                    Phaser.Math.Distance.Squared(
                        this.player.x,
                        this.player.y,
                        a.x,
                        a.y
                    ) -
                    Phaser.Math.Distance.Squared(
                        this.player.x,
                        this.player.y,
                        b.x,
                        b.y
                    )
                );

        const attackable =
            candidates.filter(enemy => {
                const distance =
                    Phaser.Math.Distance.Between(
                        this.player.x,
                        this.player.y,
                        enemy.x,
                        enemy.y
                    );

                return distance <=
                    weaponReach +
                    (enemy.__combatRadius || 10);
            });

        if (!attackable.length) {
            return;
        }

        const first = attackable[0];

        this.nextAttackAt =
            time +
            this.currentAttackCooldown();

        this.player.setFlipX(
            first.x < this.player.x
        );
        this.player.play(
            "rift-warrior-attack",
            true
        );

        const targets =
            1 +
            Math.floor(frenzyTier / 3);

        const damage =
            1 +
            Math.floor(frenzyTier / 3);

        const facingAngle =
            Phaser.Math.Angle.Between(
                this.player.x,
                this.player.y,
                first.x,
                first.y
            );

        const struck =
            attackable
                .filter(enemy => {
                    const enemyAngle =
                        Phaser.Math.Angle.Between(
                            this.player.x,
                            this.player.y,
                            enemy.x,
                            enemy.y
                        );

                    return Math.abs(
                        Phaser.Math.Angle.Wrap(
                            enemyAngle -
                            facingAngle
                        )
                    ) <=
                    Phaser.Math.DegToRad(62);
                })
                .slice(0, targets);

        for (const enemy of struck) {
            this.damageEnemy(enemy, damage);
        }

        AudioDirector.playEffect("hit");

    }


    damageEnemy(enemy, amount) {

        if (
            !enemy?.active ||
            enemy.__resolved ||
            this.runEnded
        ) {
            return;
        }

        enemy.__hp -= amount;

        enemy.setTintFill(0xffffff);
        this.time.delayedCall(
            55,
            () => {
                if (!enemy.active) {
                    return;
                }

                if (enemy.__boss) {
                    enemy.setTint(0xff657b);
                } else if (enemy.__kind === "vampire") {
                    enemy.setTint(0xc899ff);
                } else if (enemy.__kind === "skeleton2") {
                    enemy.setTint(0xd7c78b);
                } else {
                    enemy.clearTint();
                }
            }
        );

        if (enemy.__hp <= 0) {
            this.killEnemy(enemy);
        }

    }


    killEnemy(enemy) {

        if (!enemy?.active || enemy.__resolved) {
            return;
        }

        enemy.__resolved = true;
        this.runKills++;
        this.saveData.invasionKills++;

        const drops =
            enemy.__boss
                ? 9
                : enemy.__kind === "vampire"
                    ? 2
                    : 1;

        for (let i = 0; i < drops; i++) {
            this.spawnRiftglass(
                enemy.x + Phaser.Math.Between(-18, 18),
                enemy.y + Phaser.Math.Between(-18, 18)
            );
        }

        if (
            this.bountyData &&
            this.bountyData.definition.type === "kill" &&
            !this.bountyData.state.claimed
        ) {
            this.bountyData.state.progress =
                Math.min(
                    this.bountyData.definition.target,
                    Number(this.bountyData.state.progress || 0) + 1
                );
        }

        if (enemy.__label?.active) {
            enemy.__label.destroy();
        }

        const burst =
            this.add.image(
                enemy.x,
                enemy.y,
                "riftGlassIcon"
            )
            .setScale(enemy.__boss ? 0.75 : 0.42)
            .setAlpha(0.80)
            .setDepth(enemy.depth + 5);

        this.tweens.add({
            targets: burst,
            scaleX: 0.10,
            scaleY: 0.10,
            alpha: 0,
            duration: 180,
            onComplete: () => burst.destroy()
        });

        enemy.destroy();

        const frenzyTier =
            Math.min(
                6,
                Math.floor(this.runKills / 18)
            );

        if (frenzyTier > this.lastFrenzyTier) {
            this.lastFrenzyTier = frenzyTier;
            this.showRunMessage(
                `PIP FRENZY ${frenzyTier} • FASTER / WIDER SLASH`,
                "#ffe48d"
            );
        }

        if (this.runKills % 8 === 0) {
            persistSave(this.saveData);
        }

    }


    spawnRiftglass(x, y) {

        const drop =
            this.add.image(
                x,
                y,
                "riftGlassIcon"
            )
            .setScale(0.33)
            .setDepth(y + 3);

        drop.__value = 1;
        this.riftDrops.add(drop);

    }


    collectDrop(drop) {

        if (!drop?.active) {
            return;
        }

        const value = drop.__value || 1;
        this.runGlass += value;
        this.saveData.riftglass += value;

        try {
            this.sound.play(
                "riftPickup",
                {
                    volume: 0.10,
                    rate: Phaser.Math.FloatBetween(1.05, 1.28)
                }
            );
        } catch (_) {}

        drop.destroy();
        this.updateHUD();

        if (this.runGlass % 5 === 0) {
            persistSave(this.saveData);
        }

    }


    hitEnemyWithArrow(arrow, enemy) {

        if (
            this.runEnded ||
            !arrow.active ||
            !enemy.active ||
            enemy.__resolved
        ) {
            return;
        }

        const damage = arrow.__damage || 1;
        arrow.destroy();
        this.damageEnemy(enemy, damage);

    }


    hitPlayer(player, enemy) {

        if (
            this.runEnded ||
            !enemy.active ||
            enemy.__resolved ||
            this.time.now < this.playerInvulnerableUntil
        ) {
            return;
        }

        this.playerInvulnerableUntil =
            this.time.now + 760;

        this.hp -= enemy.__damage || 1;
        this.hp = Math.max(0, this.hp);

        this.cameras.main.shake(120, 0.006);
        AudioDirector.playEffect("breach");

        this.player.setTintFill(0xffc1c7);
        this.time.delayedCall(
            110,
            () => {
                if (this.player?.active) {
                    this.player.clearTint();
                }
            }
        );

        const dir =
            new Phaser.Math.Vector2(
                this.player.x - enemy.x,
                this.player.y - enemy.y
            )
            .normalize();

        this.player.x = Phaser.Math.Clamp(
            this.player.x + dir.x * 30,
            40,
            this.worldSize - 40
        );

        this.player.y = Phaser.Math.Clamp(
            this.player.y + dir.y * 30,
            40,
            this.worldSize - 40
        );

        this.player.body.updateFromGameObject();
        this.updateHUD();

        if (this.hp <= 0) {
            this.finishRun(false);
        }

    }


    updateRecruits(time) {

        if (!this.recruits.length) {
            return;
        }

        const activeEnemies =
            this.enemies
                .getChildren()
                .filter(enemy =>
                    enemy.active &&
                    !enemy.__resolved
                );

        for (let index = 0; index < this.recruits.length; index++) {

            const recruit = this.recruits[index];
            const sprite = recruit.sprite;

            if (!sprite?.active) {
                continue;
            }

            const spin =
                this.time.now * 0.00016;

            const targetX =
                this.player.x +
                Math.cos(recruit.angle + spin) *
                recruit.radius;

            const targetY =
                this.player.y +
                Math.sin(recruit.angle + spin) *
                recruit.radius * 0.72;

            sprite.x = Phaser.Math.Linear(sprite.x, targetX, 0.12);
            sprite.y = Phaser.Math.Linear(sprite.y, targetY, 0.12);
            sprite.setDepth(sprite.y + 8);

            if (time < recruit.nextActionAt) {
                continue;
            }

            if (recruit.type === "monk") {

                recruit.nextActionAt =
                    time + 11800;

                if (this.hp < this.maxHp) {
                    this.hp++;
                    sprite.play("rift-monk-heal", true);
                    AudioDirector.playEffect("upgrade");
                    this.showRunMessage("LANTERN MONK • +1 HP", "#b9ffd2");
                    this.updateHUD();
                }

                continue;
            }

            let nearest = null;
            let nearestDistance = Infinity;

            for (const enemy of activeEnemies) {
                const distance =
                    Phaser.Math.Distance.Between(
                        sprite.x,
                        sprite.y,
                        enemy.x,
                        enemy.y
                    );

                if (distance < nearestDistance) {
                    nearest = enemy;
                    nearestDistance = distance;
                }
            }

            if (!nearest) {
                recruit.nextActionAt = time + 350;
                continue;
            }

            if (recruit.type === "archer") {

                recruit.nextActionAt =
                    time + Phaser.Math.Between(980, 1220);

                if (nearestDistance <= 520) {
                    sprite.setFlipX(nearest.x < sprite.x);
                    sprite.play("rift-archer-shoot", true);

                    const angle =
                        Phaser.Math.Angle.Between(
                            sprite.x,
                            sprite.y,
                            nearest.x,
                            nearest.y
                        );

                    const arrow =
                        this.recruitArrows.create(
                            sprite.x,
                            sprite.y - 8,
                            "claimArrow"
                        )
                        .setScale(0.42)
                        .setRotation(angle)
                        .setDepth(sprite.depth + 2);

                    arrow.body.setAllowGravity(false);
                    arrow.setVelocity(
                        Math.cos(angle) * 540,
                        Math.sin(angle) * 540
                    );
                    arrow.__damage =
                        Math.max(
                            1,
                            1 *
                            this.recruitDamageMultiplier
                        );

                    try {
                        this.sound.play("riftArrow", { volume: 0.035 });
                    } catch (_) {}
                }

            } else if (recruit.type === "lancer") {

                recruit.nextActionAt =
                    time + Phaser.Math.Between(760, 940);

                if (nearestDistance <= 126) {
                    sprite.setFlipX(nearest.x < sprite.x);
                    sprite.play("rift-lancer-attack", true);
                    this.damageEnemy(
                        nearest,
                        Math.max(
                            2,
                            2 *
                            this.recruitDamageMultiplier
                        )
                    );
                }

            }

        }

    }


    updatePlayerMovement() {

        const keyboardX =
            (this.keys.right.isDown || this.cursors.right.isDown ? 1 : 0) -
            (this.keys.left.isDown || this.cursors.left.isDown ? 1 : 0);

        const keyboardY =
            (this.keys.down.isDown || this.cursors.down.isDown ? 1 : 0) -
            (this.keys.up.isDown || this.cursors.up.isDown ? 1 : 0);

        let vx = 0;
        let vy = 0;

        if (keyboardX || keyboardY) {
            this.pointerTarget = null;
            const dir =
                new Phaser.Math.Vector2(
                    keyboardX,
                    keyboardY
                )
                .normalize();

            vx = dir.x * this.moveSpeed;
            vy = dir.y * this.moveSpeed;
        } else if (this.pointerTarget) {

            const distance =
                Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    this.pointerTarget.x,
                    this.pointerTarget.y
                );

            if (distance > 18) {
                const dir =
                    new Phaser.Math.Vector2(
                        this.pointerTarget.x - this.player.x,
                        this.pointerTarget.y - this.player.y
                    )
                    .normalize();

                vx = dir.x * this.moveSpeed;
                vy = dir.y * this.moveSpeed;
            }
        }

        this.player.body.setVelocity(vx, vy);

        const moving =
            Math.abs(vx) + Math.abs(vy) > 5;

        if (
            moving &&
            this.player.anims.currentAnim?.key !== "rift-warrior-attack"
        ) {
            this.player.play("rift-warrior-run", true);
        } else if (
            !moving &&
            this.player.anims.currentAnim?.key !== "rift-warrior-attack" &&
            this.player.anims.currentAnim?.key !== "rift-warrior-idle"
        ) {
            this.player.play("rift-warrior-idle", true);
        }

        if (Math.abs(vx) > 8) {
            this.player.setFlipX(vx < 0);
        }

        this.player.setDepth(this.player.y + 18);

    }


    updateEnemies() {

        for (const enemy of [...this.enemies.getChildren()]) {

            if (!enemy.active || enemy.__resolved) {
                continue;
            }

            const angle =
                Phaser.Math.Angle.Between(
                    enemy.x,
                    enemy.y,
                    this.player.x,
                    this.player.y
                );

            enemy.setVelocity(
                Math.cos(angle) * enemy.__speed,
                Math.sin(angle) * enemy.__speed
            );

            enemy.setFlipX(this.player.x < enemy.x);
            enemy.setDepth(enemy.y + 4);

            if (enemy.__label?.active) {
                enemy.__label.setPosition(
                    enemy.x,
                    enemy.y - 82
                );
            }
        }

    }


    updateDrops() {

        for (const drop of [...this.riftDrops.getChildren()]) {

            if (!drop.active) {
                continue;
            }

            const distance =
                Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    drop.x,
                    drop.y
                );

            if (distance <= this.pickupRadius * 1.55) {
                drop.x = Phaser.Math.Linear(
                    drop.x,
                    this.player.x,
                    0.085
                );
                drop.y = Phaser.Math.Linear(
                    drop.y,
                    this.player.y,
                    0.11
                );
                drop.setDepth(drop.y + 3);
            }

            if (distance <= this.pickupRadius) {
                this.collectDrop(drop);
            }
        }

    }


    updateBounty(elapsed) {

        if (
            !this.bountyData ||
            this.bountyData.state.claimed
        ) {
            return;
        }

        if (this.bountyData.definition.type === "survive") {
            const second = Math.floor(elapsed);

            if (second !== this.lastBountySecond) {
                this.lastBountySecond = second;
                this.bountyData.state.progress =
                    Math.min(
                        this.bountyData.definition.target,
                        Math.max(
                            Number(this.bountyData.state.progress || 0),
                            second
                        )
                    );
            }
        }

    }


    updateHUD() {

        if (!this.timeText) {
            return;
        }

        const elapsed =
            Math.max(
                0,
                Math.floor(
                    (this.time.now - this.startedAt) /
                    1000
                )
            );

        const minutes =
            Math.floor(elapsed / 60);

        const seconds =
            String(elapsed % 60)
                .padStart(2, "0");

        this.timeText.setText(
            `RIFTFALL  •  HORDE ${this.currentHorde}/${this.totalHordes}  •  ${minutes}:${seconds}`
        );

        this.hpText.setText(
            `HP ${this.hp}/${this.maxHp}`
        );

        this.killText.setText(
            `KILLS ${this.runKills}  •  ${Math.min(this.hordeSpawned, this.hordeTarget)}/${this.hordeTarget} DEPLOYED`
        );

        this.glassText.setText(
            compactAmount(this.runGlass)
        );

        const completedBefore =
            this.currentHorde - 1;

        const withinHorde =
            this.hordeTarget > 0
                ? Phaser.Math.Clamp(
                    this.hordeSpawned /
                    this.hordeTarget,
                    0,
                    1
                )
                : 0;

        this.progressFill.setScale(
            Phaser.Math.Clamp(
                (completedBefore + withinHorde) /
                this.totalHordes,
                0,
                1
            ),
            1
        );

    }


    showRunMessage(text, color = "#ffffff") {

        if (this.runToast?.active) {
            this.runToast.destroy();
        }

        const toast =
            this.add.text(
                GAME_WIDTH / 2,
                158,
                text,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "18px",
                    color,
                    backgroundColor: "#111621",
                    padding: {
                        x: 14,
                        y: 8
                    }
                }
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(21000);

        this.runToast = toast;

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: 148,
            delay: 1200,
            duration: 350,
            onComplete: () => toast.destroy()
        });

    }


    createResultButton(x, y, label, iconTexture, dangerous, callback) {

        const button =
            this.add.image(
                x,
                y,
                dangerous
                    ? "uiRoundRed"
                    : "uiRoundBlue"
            )
            .setScale(0.80)
            .setScrollFactor(0)
            .setDepth(30002)
            .setInteractive({
                useHandCursor: true
            });

        const icon =
            this.add.image(
                x,
                y - 11,
                iconTexture
            )
            .setScale(0.42)
            .setScrollFactor(0)
            .setDepth(30003);

        const text =
            this.add.text(
                x,
                y + 42,
                label,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: label.length > 10 ? "13px" : "16px",
                    color: "#ffffff",
                    stroke: "#0b1018",
                    strokeThickness: 4
                }
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(30003);

        button.on("pointerdown", callback);

        return [button, icon, text];

    }


    finishRun(won) {

        if (this.runEnded) {
            return;
        }

        this.runEnded = true;
        this.player.body.setVelocity(0, 0);

        for (const enemy of this.enemies.getChildren()) {
            if (enemy.active) {
                enemy.body?.setVelocity(0, 0);
            }
        }

        const elapsed =
            Math.max(
                0,
                (this.time.now - this.startedAt) / 1000
            );

        if (
            this.bountyData &&
            !this.bountyData.state.claimed
        ) {
            if (this.bountyData.definition.type === "survive") {
                this.bountyData.state.progress =
                    Math.min(
                        this.bountyData.definition.target,
                        Math.max(
                            Number(this.bountyData.state.progress || 0),
                            Math.floor(elapsed)
                        )
                    );
            } else if (
                won &&
                this.bountyData.definition.type === "win"
            ) {
                this.bountyData.state.progress =
                    this.bountyData.definition.target;
            }
        }

        let sealReward = 0;

        if (won) {
            this.saveData.invasionWins++;
            sealReward =
                1 +
                Math.floor(
                    (this.difficulty - 1) /
                    4
                );
            this.saveData.dawnseals += sealReward;
            AudioDirector.playEffect("win");
        } else {
            AudioDirector.playEffect("breach");
        }

        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        this.physics.pause();

        this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x070a11,
            0.84
        )
        .setScrollFactor(0)
        .setDepth(30000);

        this.add.text(
            GAME_WIDTH / 2,
            390,
            won
                ? "DAWN HELD"
                : "PIP FELL",
            {
                fontFamily: FONT_DISPLAY,
                fontSize: "56px",
                color: won
                    ? "#fff0a2"
                    : "#ff9bab",
                stroke: "#10141c",
                strokeThickness: 8
            }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30001);

        this.add.text(
            GAME_WIDTH / 2,
            468,
            won
                ? `NIGHT ${this.difficulty} • ${this.totalHordes} HORDES HELD`
                : `${Math.floor(elapsed)}s • ${this.runKills} KILLS`,
            {
                fontFamily: FONT_TECH,
                fontSize: "18px",
                fontStyle: "bold",
                color: "#d7dfeb"
            }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(30001);

        const glassIcon =
            this.add.image(
                GAME_WIDTH / 2 - 82,
                552,
                "riftGlassIcon"
            )
            .setScale(0.58)
            .setScrollFactor(0)
            .setDepth(30002);

        this.add.text(
            glassIcon.x + 38,
            552,
            `+${this.runGlass} RIFTGLASS`,
            {
                fontFamily: FONT_DISPLAY,
                fontSize: "24px",
                color: "#dfcaff"
            }
        )
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(30002);

        if (won) {
            const sealIcon =
                this.add.image(
                    GAME_WIDTH / 2 - 82,
                    610,
                    "dawnSealIcon"
                )
                .setScale(0.58)
                .setScrollFactor(0)
                .setDepth(30002);

            this.add.text(
                sealIcon.x + 38,
                610,
                `+${sealReward} DAWNSEAL${sealReward === 1 ? "" : "S"}`,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "24px",
                    color: "#fff09a"
                }
            )
            .setOrigin(0, 0.5)
            .setScrollFactor(0)
            .setDepth(30002);
        }

        this.createResultButton(
            280,
            735,
            "AGAIN",
            "uiSword",
            false,
            () => {
                if (this.physics?.world) {
                    this.physics.resume();
                }
                this.scene.restart(this.entryData);
            }
        );

        this.createResultButton(
            440,
            735,
            "RETURN TO MEADOW",
            "uiTown",
            true,
            () => {
                this.returnToMeadow();
            }
        );

    }


    returnToMeadow() {

        if (this.returningToMeadow) {
            return;
        }

        this.returningToMeadow = true;
        if (this.physics?.world) {
            this.physics.resume();
        }
        this.input.enabled = false;

        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        if (AudioDirector.releaseScene) {
            AudioDirector.releaseScene(this);
        } else {
            try { this.sound.stopAll(); } catch (_) {}
        }

        const returnX = Phaser.Math.Clamp(
            this.player?.x ?? this.entryData.x,
            70,
            WORLD_SIZE - 70
        );
        const returnY = Phaser.Math.Clamp(
            this.player?.y ?? this.entryData.y,
            70,
            WORLD_SIZE - 70
        );

        this.cameras.main.fadeOut(160, 12, 18, 22);

        this.time.delayedCall(
            175,
            () => {
                this.scene.start(
                    "GameScene",
                    {
                        returnFromInvasion: true,
                        x: returnX,
                        y: returnY
                    }
                );
            }
        );

    }


    update(time) {

        if (this.runEnded) {
            return;
        }

        const elapsed =
            (time - this.startedAt) /
            1000;

        this.updatePlayerMovement();
        this.updateEnemies();
        this.updateDrops();
        this.updateRecruits(time);
        this.updateBounty(elapsed);
        this.autoAttack(time);

        this.updateHordeState(time);

        if (this.runEnded) {
            return;
        }

        if (
            !this.hordeIntermissionUntil &&
            this.hordeSpawned < this.hordeTarget &&
            time >= this.nextSpawnAt
        ) {
            this.spawnWave(time);
        }

        for (const arrow of [...this.recruitArrows.getChildren()]) {
            if (
                arrow.active &&
                (
                    arrow.x < -50 ||
                    arrow.y < -50 ||
                    arrow.x > this.worldSize + 50 ||
                    arrow.y > this.worldSize + 50
                )
            ) {
                arrow.destroy();
            }
        }

        this.updateHUD();

    }

}
