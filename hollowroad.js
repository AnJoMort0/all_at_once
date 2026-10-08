/*
===============================================================================
HOLLOWROAD — COUNTER-INVASION DUNGEON CRAWLER
===============================================================================

This is deliberately NOT Riftfall. Riftfall is the enemy entering Nullmeadow;
Hollowroad is Pip walking through the Backward Door and pushing into their side.

Loop
- One screen = one room. Clear it, take the gate, keep going.
- Every second room offers a run-only treasure choice.
- Enemies physically drop Riftglass and it banks immediately when collected.
- The final room contains an Orc Gatekeeper boss.
- A successful run grants Dawnseals, a Riftglass completion purse and, while any
  remain unowned, one persistent cross-game relic.
- Retreating or dying keeps collected Riftglass but forfeits clear rewards.
===============================================================================
*/

class HollowroadScene extends Phaser.Scene {

    constructor() {
        super("HollowroadScene");
    }


    init(data) {
        this.entryData = {
            x: Number.isFinite(data?.x) ? data.x : WORLD_SIZE / 2,
            y: Number.isFinite(data?.y) ? data.y : WORLD_SIZE / 2,
            meadowDay: Math.max(0, Math.floor(Number(data?.meadowDay) || 0)),
            meadowClock: Number.isFinite(data?.meadowClock) ? data.meadowClock : 0.4,
            weather: typeof data?.weather === "string" ? data.weather : "CLEAR"
        };
    }


    preload() {
        const loadImage = (key, path) => {
            if (!this.textures.exists(key)) this.load.image(key, path);
        };
        const loadSheet = (key, path, frameWidth, frameHeight) => {
            if (!this.textures.exists(key)) {
                this.load.spritesheet(key, path, { frameWidth, frameHeight });
            }
        };

        loadSheet("hollowTiles", ASSETS.dungeonTiles, 16, 16);
        loadImage("hollowChest", ASSETS.dungeonChest);
        loadImage("hollowGlass", ASSETS.riftGlassIcon);
        loadImage("hollowSeal", ASSETS.dawnSealIcon);
        loadImage("hollowSwordIcon", ASSETS.uiSword);
        loadImage("hollowInfoIcon", ASSETS.uiInfo);
        loadImage("hollowValorIcon", ASSETS.uiValor);
        loadImage("hollowBuildIcon", ASSETS.uiBuild);
        loadImage("hollowTownIcon", ASSETS.uiTown);
        loadImage("hollowRoundBlue", ASSETS.uiRoundBlue);
        loadImage("hollowRoundRed", ASSETS.uiRoundRed);
        loadImage("hollowTinyBlue", ASSETS.uiTinyRoundBlue);
        loadImage("hollowTinyRed", ASSETS.uiTinyRoundRed);

        loadSheet("hollowWarriorIdle", ASSETS.invasionWarriorIdle, 192, 192);
        loadSheet("hollowWarriorRun", ASSETS.invasionWarriorRun, 192, 192);
        loadSheet("hollowWarriorAttack", ASSETS.invasionWarriorAttack, 192, 192);
        loadSheet("hollowSkeleton1", ASSETS.skeletonMove, 32, 32);
        loadSheet("hollowSkeleton2", ASSETS.invasionSkeleton2, 32, 32);
        loadSheet("hollowVampire", ASSETS.invasionVampire, 32, 32);
        loadSheet("hollowOrcWalk", ASSETS.hollowOrcWalk, 100, 100);
        loadSheet("hollowOrcAttack", ASSETS.hollowOrcAttack, 100, 100);

        for (const [key, path] of [
            ["hollowDoorSound", ASSETS.dungeonDoorSfx],
            ["hollowSlashSound", ASSETS.swordSliceSfx],
            ["hollowHeartSound", ASSETS.heartCollectSfx],
            ["hollowPickupSound", ASSETS.glimmerCollect],
            ["hollowHitSound", ASSETS.enemyHit],
            ["hollowPowerSound", ASSETS.powerUp],
            ["hollowTheme", ASSETS.invasionTheme]
        ]) {
            if (!this.cache.audio.exists(key)) this.load.audio(key, path);
        }
    }


    create() {
        if (this.physics?.world) this.physics.resume();

        this.saveData =
            this.registry.get("saveData") ||
            loadSave();
        ensureMetaState(this.saveData);

        this.saveData.hollowRuns =
            (this.saveData.hollowRuns || 0) + 1;
        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        this.depthTier = this.saveData.hollowWins || 0;
        this.totalRooms = Phaser.Math.Clamp(
            7 + Math.floor(this.depthTier / 2),
            7,
            12
        );
        this.roomNumber = 0;
        this.roomReady = false;
        this.roomCleared = false;
        this.runEnded = false;
        this.choiceOpen = false;
        this.nextAttackAt = 0;
        this.invulnerableUntil = 0;
        this.moveTarget = null;
        this.runGlass = 0;
        this.runKills = 0;

        const roadsteel = this.saveData.tech?.roadsteel || 0;

        this.runStats = {
            damage: 1 + Math.floor(roadsteel / 2),
            reach: 86 + roadsteel * 6,
            cooldown: 520,
            speed: 245 + roadsteel * 5,
            cleave: 1,
            maxHpBonus: 0,
            dropBonus: 0
        };

        if ((this.saveData.relics || []).includes("ashfang")) {
            this.runStats.damage += 1;
        }
        if ((this.saveData.relics || []).includes("glass-compass")) {
            this.runStats.speed += 20;
        }

        this.maxHp =
            6 +
            (this.saveData.tech?.ironPulse || 0) +
            ((this.saveData.relics || []).includes("lantern-heart") ? 1 : 0);
        this.hp = this.maxHp;

        this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.cameras.main.setBackgroundColor("#160d19");

        this.createAnimations();
        this.createRoomShell();
        this.createGroups();
        this.createPlayer();
        this.createHud();
        this.createInput();

        this.physics.add.overlap(
            this.player,
            this.enemies,
            this.touchEnemy,
            null,
            this
        );
        this.physics.add.overlap(
            this.player,
            this.drops,
            this.collectDrop,
            null,
            this
        );

        AudioDirector.setPreferences(this.saveData);
        AudioDirector.setSceneMusic(this, "hollowTheme", null);
        this.input.once("pointerdown", () => AudioDirector.unlock(this.saveData));
        this.input.keyboard.once("keydown", () => AudioDirector.unlock(this.saveData));

        this.enterNextRoom();
        this.cameras.main.fadeIn(240, 15, 7, 20);
    }


    createAnimations() {
        const ensure = (key, texture, start, end, frameRate, repeat) => {
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(texture, { start, end }),
                    frameRate,
                    repeat
                });
            }
        };

        ensure("hollow-warrior-idle", "hollowWarriorIdle", 0, 7, 8, -1);
        ensure("hollow-warrior-run", "hollowWarriorRun", 0, 5, 12, -1);
        ensure("hollow-warrior-attack", "hollowWarriorAttack", 0, 3, 18, 0);
        ensure("hollow-skeleton-1", "hollowSkeleton1", 0, 5, 9, -1);
        ensure("hollow-skeleton-2", "hollowSkeleton2", 0, 5, 9, -1);
        ensure("hollow-vampire", "hollowVampire", 0, 5, 10, -1);
        ensure("hollow-orc-walk", "hollowOrcWalk", 0, 7, 10, -1);
        ensure("hollow-orc-attack", "hollowOrcAttack", 0, 5, 13, 0);
    }


    createRoomShell() {
        this.roomRoot = this.add.container(0, 0).setDepth(-100);

        const bg = this.add.graphics();
        bg.fillStyle(0x160e19, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        bg.fillStyle(0x261729, 1);
        bg.fillRoundedRect(42, 126, GAME_WIDTH - 84, 984, 28);
        bg.lineStyle(5, 0x6c455f, 0.72);
        bg.strokeRoundedRect(42, 126, GAME_WIDTH - 84, 984, 28);
        this.roomRoot.add(bg);

        // Imported dungeon tiles are used as floor ornament / wall language rather
        // than faking recognizable dungeon props with primitives.
        this.floorTiles = [];
        const floorFrames = [452, 453, 460, 461, 462, 463, 464, 465, 466, 467];
        for (let y = 180; y <= 1030; y += 64) {
            for (let x = 86; x <= 630; x += 64) {
                const frame = floorFrames[(x / 64 + y / 64) % floorFrames.length | 0];
                const tile = this.add.sprite(x, y, "hollowTiles", frame)
                    .setScale(4)
                    .setAlpha(0.22)
                    .setDepth(-80);
                this.floorTiles.push(tile);
                this.roomRoot.add(tile);
            }
        }

        const wallFrames = [386, 390, 398, 400, 408, 412, 430, 431];
        for (let x = 82; x <= 638; x += 48) {
            const top = this.add.sprite(x, 145, "hollowTiles", wallFrames[(x / 48) % wallFrames.length | 0])
                .setScale(3).setDepth(-70);
            const bottom = this.add.sprite(x, 1090, "hollowTiles", wallFrames[((x / 48) + 3) % wallFrames.length | 0])
                .setScale(3).setFlipY(true).setDepth(-70);
            this.roomRoot.add([top, bottom]);
        }

        // Imported banners/torches from the same sheet.
        for (const [x, frame] of [[120, 420], [600, 421], [190, 428], [530, 429]]) {
            this.roomRoot.add(
                this.add.sprite(x, 176, "hollowTiles", frame)
                    .setScale(3.2)
                    .setDepth(-65)
            );
        }
    }


    createGroups() {
        this.enemies = this.physics.add.group({ allowGravity: false });
        this.drops = this.physics.add.group({ allowGravity: false });
    }


    createPlayer() {
        this.player = this.physics.add.sprite(
            GAME_WIDTH / 2,
            930,
            "hollowWarriorIdle",
            0
        )
        .setScale(0.48)
        .setDepth(500);

        this.player.body.setAllowGravity(false);
        this.player.setCollideWorldBounds(true);
        this.player.body.setCircle(34, 62, 62);
        this.player.play("hollow-warrior-idle");

        this.player.on(
            "animationcomplete-hollow-warrior-attack",
            () => {
                if (!this.runEnded && this.player?.active) {
                    this.player.play("hollow-warrior-idle", true);
                }
            }
        );
    }


    createHud() {
        this.hud = this.add.container(0, 0).setDepth(10000);

        const top = this.add.graphics();
        top.fillStyle(0x0b0910, 0.96);
        top.fillRoundedRect(16, 14, 688, 96, 22);
        top.lineStyle(2, 0xb66da8, 0.55);
        top.strokeRoundedRect(16, 14, 688, 96, 22);
        this.hud.add(top);

        this.hud.add(
            this.add.text(32, 25, "HOLLOWROAD", {
                fontFamily: FONT_DISPLAY,
                fontSize: "26px",
                color: "#f4dcff"
            })
        );

        this.roomHud = this.add.text(33, 62, "", {
            fontFamily: FONT_TECH,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#bd9fc5"
        });
        this.hud.add(this.roomHud);

        this.hpHud = this.add.text(686, 24, "", {
            fontFamily: FONT_TECH,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#ff9eaa",
            align: "right"
        }).setOrigin(1, 0);
        this.hud.add(this.hpHud);

        this.glassHud = this.add.text(686, 60, "", {
            fontFamily: FONT_TECH,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#d6a2ff",
            align: "right"
        }).setOrigin(1, 0);
        this.hud.add(this.glassHud);

        const retreat = this.add.image(58, 1215, "hollowRoundRed")
            .setScale(0.46)
            .setInteractive({ useHandCursor: true });
        const retreatIcon = this.add.image(58, 1215, "hollowTownIcon")
            .setScale(0.31);
        const retreatText = this.add.text(95, 1215, "RETREAT", {
            fontFamily: FONT_TECH,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#e9dce8"
        }).setOrigin(0, 0.5);
        this.hud.add([retreat, retreatIcon, retreatText]);
        retreat.on("pointerdown", () => this.finishRun(false, true));

        this.statusHud = this.add.text(
            GAME_WIDTH / 2,
            1165,
            "CLEAR THE ROOM",
            {
                fontFamily: FONT_TECH,
                fontSize: "14px",
                fontStyle: "bold",
                color: "#d7c9d7",
                stroke: "#120d13",
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        this.hud.add(this.statusHud);

        this.updateHud();
    }


    createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
            attack2: Phaser.Input.Keyboard.KeyCodes.E
        });

        this.input.on("pointerdown", pointer => {
            if (this.runEnded || this.choiceOpen) return;
            if (pointer.y > 1160) return;
            this.moveTarget = {
                x: Phaser.Math.Clamp(pointer.x, 78, GAME_WIDTH - 78),
                y: Phaser.Math.Clamp(pointer.y, 170, 1055)
            };
        });
    }


    updateHud() {
        if (!this.roomHud) return;
        this.roomHud.setText(
            `ROOM ${Math.max(1, this.roomNumber)}/${this.totalRooms} • KILLS ${this.runKills}`
        );
        this.hpHud.setText(`HP ${Math.max(0, this.hp)}/${this.maxHp}`);
        this.glassHud.setText(`RIFTGLASS +${this.runGlass}`);
    }


    enterNextRoom() {
        if (this.runEnded) return;

        this.roomNumber++;
        this.roomCleared = false;
        this.roomReady = false;
        this.choiceOpen = false;
        this.moveTarget = null;
        this.player.setVelocity(0, 0);
        this.player.setPosition(GAME_WIDTH / 2, 940);
        this.player.body.updateFromGameObject();

        for (const enemy of [...this.enemies.getChildren()]) {
            if (enemy.active) enemy.destroy();
        }
        for (const drop of [...this.drops.getChildren()]) {
            if (drop.active) drop.destroy();
        }

        this.refreshRoomDecor();

        const bossRoom = this.roomNumber >= this.totalRooms;
        const count = bossRoom
            ? 1
            : Phaser.Math.Clamp(
                2 + Math.floor(this.roomNumber * 0.78) + Math.floor(this.depthTier * 0.45),
                2,
                13
            );

        this.roomSpawnPending = count;

        this.statusHud.setText(
            bossRoom
                ? "GATEKEEPER ROOM"
                : `ROOM ${this.roomNumber} • ${count} HOSTILES`
        );

        if (bossRoom) {
            this.spawnEnemy({ boss: true });
            this.roomSpawnPending = 0;
            this.roomReady = true;
        } else {
            const roomToken = this.roomNumber;
            for (let i = 0; i < count; i++) {
                this.time.delayedCall(
                    150 + i * 95,
                    () => {
                        if (
                            this.runEnded ||
                            roomToken !== this.roomNumber
                        ) {
                            return;
                        }
                        this.spawnEnemy({ index: i });
                        this.roomSpawnPending = Math.max(0, this.roomSpawnPending - 1);
                        if (this.roomSpawnPending === 0) {
                            this.roomReady = true;
                        }
                    }
                );
            }
        }

        this.updateHud();
        this.cameras.main.flash(120, 44, 18, 50, false);
        try { this.sound.play("hollowDoorSound", { volume: 0.16 }); } catch (_) {}
    }


    refreshRoomDecor() {
        const tint =
            this.roomNumber % 3 === 0
                ? 0xb96f9e
                : this.roomNumber % 2 === 0
                    ? 0x8b7ac4
                    : 0xffffff;

        for (const tile of this.floorTiles) {
            tile.setTint(tint);
        }
    }


    spawnEnemy({ boss = false, index = 0 } = {}) {
        if (this.runEnded) return;

        const progress = this.roomNumber / this.totalRooms;
        const angle =
            Math.PI * 2 *
            ((index + 0.37) / Math.max(1, 3 + this.roomNumber));
        const radius = 215 + (index % 3) * 34;
        const x = Phaser.Math.Clamp(
            GAME_WIDTH / 2 + Math.cos(angle) * radius,
            92,
            GAME_WIDTH - 92
        );
        const y = Phaser.Math.Clamp(
            520 + Math.sin(angle) * 230,
            205,
            820
        );

        let texture = "hollowSkeleton1";
        let anim = "hollow-skeleton-1";
        let scale = 2.15;
        let hp = 2 + Math.floor(this.depthTier / 3) + Math.floor(progress * 2);
        let speed = 68 + this.depthTier * 3 + progress * 20;
        let damage = 1;
        let radiusBody = 11;

        const roll = Math.random();
        if (boss) {
            texture = "hollowOrcWalk";
            anim = "hollow-orc-walk";
            scale = 1.55;
            hp = 22 + this.depthTier * 5;
            speed = 62 + this.depthTier * 2;
            damage = 2;
            radiusBody = 25;
        } else if (this.roomNumber >= 5 && roll < 0.22 + progress * 0.15) {
            texture = "hollowVampire";
            anim = "hollow-vampire";
            scale = 2.25;
            hp += 2;
            speed += 32;
        } else if (this.roomNumber >= 3 && roll < 0.48) {
            texture = "hollowSkeleton2";
            anim = "hollow-skeleton-2";
            scale = 2.25;
            hp += 1;
            speed += 8;
        }

        const enemy = this.enemies.create(x, y, texture, 0)
            .setScale(scale)
            .setDepth(420);
        enemy.body.setAllowGravity(false);
        enemy.play(anim);
        enemy.__hp = hp;
        enemy.__maxHp = hp;
        enemy.__speed = speed;
        enemy.__damage = damage;
        enemy.__resolved = false;
        enemy.__boss = boss;
        enemy.__combatRadius = radiusBody;
        enemy.__nextTouchAt = 0;

        if (texture === "hollowOrcWalk") {
            enemy.body.setCircle(24, 26, 24);
        } else {
            enemy.body.setCircle(10, 6, 6);
        }

        if (boss) {
            enemy.setTint(0xd98c56);
            enemy.__label = this.add.text(
                enemy.x,
                enemy.y - 95,
                "ORC GATEKEEPER",
                {
                    fontFamily: FONT_TECH,
                    fontSize: "13px",
                    fontStyle: "bold",
                    color: "#ffc083",
                    stroke: "#170d12",
                    strokeThickness: 4
                }
            ).setOrigin(0.5).setDepth(900);
            enemy.__hpBack = this.add.rectangle(
                enemy.x - 58,
                enemy.y - 73,
                116,
                8,
                0x2b1116,
                0.95
            ).setOrigin(0, 0.5).setDepth(901);
            enemy.__hpBar = this.add.rectangle(
                enemy.x - 58,
                enemy.y - 73,
                116,
                5,
                0xe37958,
                1
            ).setOrigin(0, 0.5).setDepth(902);
        }
    }


    touchEnemy(player, enemy) {
        if (
            this.runEnded ||
            !enemy?.active ||
            enemy.__resolved ||
            this.time.now < this.invulnerableUntil
        ) {
            return;
        }

        this.invulnerableUntil = this.time.now + 720;
        this.hp -= enemy.__damage || 1;
        this.updateHud();
        this.cameras.main.shake(90, 0.006);
        this.player.setTintFill(0xffdfdf);
        this.time.delayedCall(90, () => {
            if (this.player?.active) this.player.clearTint();
        });
        try { this.sound.play("hollowHitSound", { volume: 0.14 }); } catch (_) {}

        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        player.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);

        if (this.hp <= 0) {
            this.finishRun(false, false);
        }
    }


    tryAttack(time, force = false) {
        if (
            this.runEnded ||
            this.choiceOpen ||
            time < this.nextAttackAt
        ) {
            return;
        }

        const living = this.enemies.getChildren()
            .filter(enemy => enemy.active && !enemy.__resolved);
        if (!living.length) return;

        living.sort((a, b) =>
            Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
            Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
        );

        const first = living[0];
        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            first.x,
            first.y
        );
        const actualReach =
            this.runStats.reach +
            (first.__combatRadius || 10);

        if (distance > actualReach && !force) return;
        if (distance > actualReach + 18) return;

        this.nextAttackAt = time + this.runStats.cooldown;
        this.player.setFlipX(first.x < this.player.x);
        this.player.play("hollow-warrior-attack", true);

        const facing = Phaser.Math.Angle.Between(
            this.player.x,
            this.player.y,
            first.x,
            first.y
        );

        const targets = living
            .filter(enemy => {
                const d = Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    enemy.x,
                    enemy.y
                );
                if (d > this.runStats.reach + (enemy.__combatRadius || 10)) return false;
                const a = Phaser.Math.Angle.Between(
                    this.player.x,
                    this.player.y,
                    enemy.x,
                    enemy.y
                );
                return Math.abs(Phaser.Math.Angle.Wrap(a - facing)) <= Phaser.Math.DegToRad(70);
            })
            .slice(0, this.runStats.cleave);

        for (const enemy of targets) {
            this.damageEnemy(enemy, this.runStats.damage);
        }

        try { this.sound.play("hollowSlashSound", { volume: 0.13 }); } catch (_) {}
    }


    damageEnemy(enemy, amount) {
        if (!enemy?.active || enemy.__resolved || this.runEnded) return;

        enemy.__hp -= amount;
        enemy.setTintFill(0xffffff);
        this.time.delayedCall(55, () => {
            if (enemy?.active) {
                enemy.clearTint();
                if (enemy.__boss) enemy.setTint(0xd98c56);
            }
        });

        if (enemy.__hpBar?.active) {
            enemy.__hpBar.setScale(
                Phaser.Math.Clamp(enemy.__hp / enemy.__maxHp, 0, 1),
                1
            );
        }

        if (enemy.__hp <= 0) {
            this.killEnemy(enemy);
        }
    }


    killEnemy(enemy) {
        if (!enemy?.active || enemy.__resolved) return;
        enemy.__resolved = true;
        this.runKills++;

        const wasBoss = enemy.__boss;
        const x = enemy.x;
        const y = enemy.y;

        enemy.__label?.destroy();
        enemy.__hpBack?.destroy();
        enemy.__hpBar?.destroy();
        enemy.destroy();

        this.makeDeathBurst(x, y, wasBoss ? 0xf0a35c : 0xd8d0df);

        const dropChance =
            Phaser.Math.Clamp(
                0.46 + this.runStats.dropBonus + (wasBoss ? 0.54 : 0),
                0,
                1
            );
        if (Math.random() < dropChance) {
            const count = wasBoss ? 5 : (Math.random() < 0.16 ? 2 : 1);
            for (let i = 0; i < count; i++) {
                const drop = this.drops.create(
                    x + Phaser.Math.Between(-24, 24),
                    y + Phaser.Math.Between(-20, 20),
                    "hollowGlass"
                )
                .setScale(0.36)
                .setDepth(700);
                drop.body.setCircle(18);
                drop.__value = 1;
                this.tweens.add({
                    targets: drop,
                    y: drop.y - 9,
                    duration: 430 + i * 25,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        }

        if (wasBoss) {
            this.saveData.hollowBossKills =
                (this.saveData.hollowBossKills || 0) + 1;
            persistSave(this.saveData);
        }

        this.updateHud();
    }


    collectDrop(player, drop) {
        if (!drop?.active || this.runEnded) return;
        const value = Math.max(1, drop.__value || 1);
        drop.destroy();
        this.runGlass += value;
        this.saveData.riftglass =
            (this.saveData.riftglass || 0) + value;
        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);
        try { this.sound.play("hollowPickupSound", { volume: 0.12 }); } catch (_) {}
        this.updateHud();
    }


    checkRoomClear() {
        if (
            this.runEnded ||
            !this.roomReady ||
            this.roomCleared ||
            this.enemies.countActive(true) > 0
        ) {
            return;
        }

        this.roomCleared = true;
        this.player.setVelocity(0, 0);
        this.moveTarget = null;

        if (this.roomNumber >= this.totalRooms) {
            this.time.delayedCall(500, () => this.finishRun(true, false));
            return;
        }

        const offerTreasure =
            this.roomNumber % 2 === 0 ||
            (this.roomNumber >= 4 && Math.random() < 0.28);

        if (offerTreasure) {
            this.time.delayedCall(260, () => this.openTreasureChoice());
        } else {
            this.spawnExitGate();
        }
    }


    spawnExitGate() {
        if (this.runEnded) return;
        this.choiceOpen = true;
        this.statusHud.setText("ROOM CLEAR • TAKE THE GATE");

        const gate = this.add.sprite(
            GAME_WIDTH / 2,
            250,
            "hollowTiles",
            477
        )
        .setScale(6)
        .setDepth(1200)
        .setInteractive({ useHandCursor: true });

        const text = this.add.text(
            GAME_WIDTH / 2,
            328,
            "NEXT ROOM",
            {
                fontFamily: FONT_TECH,
                fontSize: "13px",
                fontStyle: "bold",
                color: "#f0d7ff",
                stroke: "#140a18",
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(1201);

        this.tweens.add({
            targets: gate,
            scaleX: 6.5,
            scaleY: 6.5,
            alpha: 0.72,
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        gate.on("pointerdown", () => {
            if (!gate.active || this.runEnded) return;
            gate.destroy();
            text.destroy();
            this.choiceOpen = false;
            this.enterNextRoom();
        });
    }


    openTreasureChoice() {
        if (this.runEnded || this.choiceOpen) return;
        this.choiceOpen = true;
        this.statusHud.setText("TREASURE ROOM • CHOOSE ONE");

        const overlay = this.add.container(0, 0).setDepth(15000);
        const shade = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x09060d,
            0.76
        );
        overlay.add(shade);

        const chest = this.add.image(GAME_WIDTH / 2, 276, "hollowChest")
            .setScale(5.2)
            .setDepth(1);
        overlay.add(chest);

        overlay.add(
            this.add.text(
                GAME_WIDTH / 2,
                352,
                "THE ROAD OFFERS THREE LIES",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "25px",
                    color: "#f4dcff"
                }
            ).setOrigin(0.5)
        );

        const upgrades = [
            {
                id: "edge",
                title: "ASH EDGE",
                desc: "+1 sword damage",
                icon: "hollowSwordIcon",
                apply: () => { this.runStats.damage += 1; }
            },
            {
                id: "haste",
                title: "QUICKBLOOD",
                desc: "Attack 14% faster",
                icon: "hollowInfoIcon",
                apply: () => { this.runStats.cooldown = Math.max(220, this.runStats.cooldown * 0.86); }
            },
            {
                id: "reach",
                title: "LONG IRON",
                desc: "+18 attack reach",
                icon: "hollowBuildIcon",
                apply: () => { this.runStats.reach += 18; }
            },
            {
                id: "cleave",
                title: "TWO NAMES",
                desc: "+1 cleave target",
                icon: "hollowValorIcon",
                apply: () => { this.runStats.cleave = Math.min(5, this.runStats.cleave + 1); }
            },
            {
                id: "heart",
                title: "BORROWED HEART",
                desc: "+1 max HP and heal 2",
                icon: "hollowSeal",
                apply: () => {
                    this.maxHp += 1;
                    this.hp = Math.min(this.maxHp, this.hp + 2);
                    try { this.sound.play("hollowHeartSound", { volume: 0.18 }); } catch (_) {}
                }
            },
            {
                id: "scavenge",
                title: "GLASS NOSE",
                desc: "+16% Riftglass drop chance",
                icon: "hollowGlass",
                apply: () => { this.runStats.dropBonus += 0.16; }
            },
            {
                id: "boots",
                title: "WRONG-WAY BOOTS",
                desc: "+25 movement speed",
                icon: "hollowTownIcon",
                apply: () => { this.runStats.speed += 25; }
            }
        ];

        const seed =
            this.roomNumber * 997 +
            this.depthTier * 61 +
            this.saveData.hollowRuns * 17;
        const picks = [];
        let state = seed | 0;
        const rng = () => {
            state = Math.imul(state ^ (state >>> 15), 1 | state);
            state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
            return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
        };
        const pool = [...upgrades];
        while (picks.length < 3 && pool.length) {
            picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        }

        const choose = upgrade => {
            if (!overlay.active || this.runEnded) return;
            upgrade.apply();
            try { this.sound.play("hollowPowerSound", { volume: 0.16 }); } catch (_) {}
            overlay.destroy(true);
            this.choiceOpen = false;
            this.updateHud();
            this.spawnExitGate();
        };

        picks.forEach((upgrade, index) => {
            const y = 470 + index * 190;
            const plate = this.add.graphics();
            plate.fillStyle(0x23172a, 0.98);
            plate.fillRoundedRect(92, y - 66, 536, 132, 20);
            plate.lineStyle(2, 0x9a6f9d, 0.72);
            plate.strokeRoundedRect(92, y - 66, 536, 132, 20);
            overlay.add(plate);

            const iconBack = this.add.image(152, y, "hollowTinyBlue").setScale(1.15);
            const icon = this.add.image(152, y, upgrade.icon).setScale(0.48);
            const title = this.add.text(216, y - 29, upgrade.title, {
                fontFamily: FONT_DISPLAY,
                fontSize: "20px",
                color: "#f4dcff"
            });
            const desc = this.add.text(216, y + 13, upgrade.desc, {
                fontFamily: FONT_BODY,
                fontSize: "15px",
                fontStyle: "bold",
                color: "#cbb9ce"
            });
            const hit = this.add.zone(360, y, 536, 132)
                .setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => choose(upgrade));
            overlay.add([iconBack, icon, title, desc, hit]);
        });
    }


    awardRelic() {
        const relics = [
            {
                id: "ashfang",
                name: "ASHFANG",
                text: "+1 base Hollowroad damage and +1 Riftfall melee damage."
            },
            {
                id: "lantern-heart",
                name: "LANTERN HEART",
                text: "+1 HP in Hollowroad/Riftfall and +3 HP in Runehand."
            },
            {
                id: "glass-compass",
                name: "GLASS COMPASS",
                text: "+20 Hollowroad speed, +18 Nullmeadow/Riftfall speed and +8 Riftglass pickup radius."
            },
            {
                id: "red-thread",
                name: "RED THREAD",
                text: "Runehand starts with +1 Resolve on turn one."
            }
        ];

        const owned = new Set(this.saveData.relics || []);
        const available = relics.filter(relic => !owned.has(relic.id));
        if (!available.length) return null;

        const relic = available[(this.saveData.hollowWins || 0) % available.length];
        this.saveData.relics.push(relic.id);
        return relic;
    }


    finishRun(won, retreating = false) {
        if (this.runEnded) return;
        this.runEnded = true;
        this.choiceOpen = false;

        if (this.physics?.world) this.physics.pause();
        this.player?.setVelocity(0, 0);
        for (const enemy of this.enemies?.getChildren?.() || []) {
            if (enemy?.active) enemy.setVelocity(0, 0);
        }

        let sealReward = 0;
        let glassReward = 0;
        let relic = null;

        if (won) {
            this.saveData.hollowWins =
                (this.saveData.hollowWins || 0) + 1;
            sealReward = 1 + Math.floor((this.saveData.hollowWins - 1) / 3);
            glassReward = 30 + this.totalRooms * 5 + this.depthTier * 4;
            this.saveData.dawnseals += sealReward;
            this.saveData.riftglass += glassReward;
            relic = this.awardRelic();

            if (hasBuildingInSave(this.saveData, "bountyBell")) {
                const bounty = ensureRotatingBounty(this.saveData);
                if (
                    bounty.definition.type === "hollow" &&
                    !bounty.state.claimed
                ) {
                    bounty.state.progress = Math.min(
                        bounty.definition.target,
                        Number(bounty.state.progress || 0) + 1
                    );
                }
            }
        }

        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        const overlay = this.add.container(0, 0).setDepth(30000);
        const shade = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x08050b,
            0.88
        );
        overlay.add(shade);

        const headline =
            won
                ? "ROAD BROKEN"
                : retreating
                    ? "YOU TURNED BACK"
                    : "THE ROAD ATE PIP";
        const color = won ? "#ffd98c" : retreating ? "#c8b4ce" : "#ff8a9b";

        overlay.add(
            this.add.text(
                GAME_WIDTH / 2,
                340,
                headline,
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "39px",
                    color,
                    align: "center"
                }
            ).setOrigin(0.5)
        );

        let summary =
            `Rooms ${Math.min(this.roomNumber, this.totalRooms)}/${this.totalRooms}  •  Kills ${this.runKills}\n` +
            `Picked up +${this.runGlass} Riftglass`;
        if (won) {
            summary += `\nClear purse +${glassReward} Riftglass  •  +${sealReward} Dawnseal${sealReward === 1 ? "" : "s"}`;
        }
        if (relic) {
            summary += `\n\nNEW RELIC — ${relic.name}\n${relic.text}`;
        } else if (won && (this.saveData.relics || []).length >= 4) {
            summary += "\n\nAll known Hollowroad relics are already in the settlement.";
        }

        overlay.add(
            this.add.text(
                GAME_WIDTH / 2,
                455,
                summary,
                {
                    fontFamily: FONT_BODY,
                    fontSize: "18px",
                    fontStyle: "bold",
                    color: "#ddd0df",
                    align: "center",
                    wordWrap: { width: 570 }
                }
            ).setOrigin(0.5, 0)
        );

        const home = this.add.image(
            GAME_WIDTH / 2,
            805,
            "hollowRoundBlue"
        )
        .setScale(0.76)
        .setInteractive({ useHandCursor: true });
        const homeIcon = this.add.image(
            GAME_WIDTH / 2,
            804,
            "hollowTownIcon"
        ).setScale(0.40);
        const homeText = this.add.text(
            GAME_WIDTH / 2,
            875,
            "RETURN TO NULLMEADOW",
            {
                fontFamily: FONT_TECH,
                fontSize: "15px",
                fontStyle: "bold",
                color: "#f0e9f2"
            }
        ).setOrigin(0.5);
        overlay.add([home, homeIcon, homeText]);

        let leaving = false;
        home.on("pointerdown", () => {
            if (leaving) return;
            leaving = true;
            if (AudioDirector.releaseScene) {
                AudioDirector.releaseScene(this);
            } else {
                try { this.sound.stopAll(); } catch (_) {}
            }
            this.scene.start(
                "GameScene",
                {
                    returnFromHollowroad: true,
                    x: this.entryData.x,
                    y: this.entryData.y
                }
            );
        });
    }


    makeDeathBurst(x, y, color) {
        for (let i = 0; i < 6; i++) {
            const particle = this.add.image(x, y, "hollowGlass")
                .setScale(0.15)
                .setTint(color)
                .setAlpha(0.65)
                .setDepth(800);
            const angle = (Math.PI * 2 * i) / 6;
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * Phaser.Math.Between(24, 52),
                y: y + Math.sin(angle) * Phaser.Math.Between(24, 52),
                alpha: 0,
                scaleX: 0.04,
                scaleY: 0.04,
                duration: 260,
                onComplete: () => particle.destroy()
            });
        }
    }


    update(time, delta) {
        if (this.runEnded || !this.player?.active) return;

        const left = this.cursors.left.isDown || this.keys.left.isDown;
        const right = this.cursors.right.isDown || this.keys.right.isDown;
        const up = this.cursors.up.isDown || this.keys.up.isDown;
        const down = this.cursors.down.isDown || this.keys.down.isDown;

        let vx = 0;
        let vy = 0;

        if (!this.choiceOpen) {
            const keyboardX = (right ? 1 : 0) - (left ? 1 : 0);
            const keyboardY = (down ? 1 : 0) - (up ? 1 : 0);

            if (keyboardX || keyboardY) {
                this.moveTarget = null;
                const dir = new Phaser.Math.Vector2(keyboardX, keyboardY).normalize();
                vx = dir.x * this.runStats.speed;
                vy = dir.y * this.runStats.speed;
            } else if (this.moveTarget) {
                const d = Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    this.moveTarget.x,
                    this.moveTarget.y
                );
                if (d < 18) {
                    this.moveTarget = null;
                } else {
                    const dir = new Phaser.Math.Vector2(
                        this.moveTarget.x - this.player.x,
                        this.moveTarget.y - this.player.y
                    ).normalize();
                    vx = dir.x * this.runStats.speed;
                    vy = dir.y * this.runStats.speed;
                }
            }
        }

        this.player.setVelocity(vx, vy);
        this.player.x = Phaser.Math.Clamp(this.player.x, 78, GAME_WIDTH - 78);
        this.player.y = Phaser.Math.Clamp(this.player.y, 175, 1060);

        const moving = Math.abs(vx) + Math.abs(vy) > 5;
        if (
            moving &&
            this.player.anims.currentAnim?.key !== "hollow-warrior-attack"
        ) {
            this.player.play("hollow-warrior-run", true);
            if (Math.abs(vx) > 10) this.player.setFlipX(vx < 0);
        } else if (
            !moving &&
            this.player.anims.currentAnim?.key !== "hollow-warrior-attack" &&
            this.player.anims.currentAnim?.key !== "hollow-warrior-idle"
        ) {
            this.player.play("hollow-warrior-idle", true);
        }

        if (!this.choiceOpen) {
            const manualAttack =
                Phaser.Input.Keyboard.JustDown(this.keys.attack) ||
                Phaser.Input.Keyboard.JustDown(this.keys.attack2);
            this.tryAttack(time, manualAttack);
        }

        const dt = Math.min(delta || 16.667, 50) / 1000;
        for (const enemy of [...this.enemies.getChildren()]) {
            if (!enemy.active || enemy.__resolved) continue;

            const angle = Phaser.Math.Angle.Between(
                enemy.x,
                enemy.y,
                this.player.x,
                this.player.y
            );
            enemy.setVelocity(
                Math.cos(angle) * enemy.__speed,
                Math.sin(angle) * enemy.__speed
            );
            enemy.setFlipX(enemy.body.velocity.x < 0);
            enemy.setDepth(enemy.y + 60);

            if (enemy.__boss) {
                enemy.__label?.setPosition(enemy.x, enemy.y - 95);
                enemy.__hpBack?.setPosition(enemy.x - 58, enemy.y - 73);
                enemy.__hpBar?.setPosition(enemy.x - 58, enemy.y - 73);
            }

            // Prevent tunnelling at silly framerates.
            enemy.x = Phaser.Math.Clamp(enemy.x, 70, GAME_WIDTH - 70);
            enemy.y = Phaser.Math.Clamp(enemy.y, 160, 1080);
        }

        for (const drop of [...this.drops.getChildren()]) {
            if (!drop.active) continue;
            drop.setDepth(drop.y + 20);
        }

        this.checkRoomClear();
    }
}
