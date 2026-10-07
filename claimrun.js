class ClaimRunScene extends Phaser.Scene {

    constructor() {

        super(
            "ClaimRunScene"
        );

    }

    preload() {

        if (!this.textures.exists("claimArrow")) {
            this.load.image(
                "claimArrow",
                ASSETS.claimArrow
            );
        }

        for (const [key, path, frameWidth, frameHeight] of [
            ["skeletonMove", ASSETS.skeletonMove, 32, 32],
            ["claimArcherIdle", ASSETS.claimArcherIdle, 192, 192],
            ["claimArcherShoot", ASSETS.claimArcherShoot, 192, 192]
        ]) {
            if (!this.textures.exists(key)) {
                this.load.spritesheet(
                    key,
                    path,
                    {
                        frameWidth,
                        frameHeight
                    }
                );
            }
        }

        for (const [key, path] of [
            ["uiRoundRed", ASSETS.uiRoundRed],
            ["uiTown", ASSETS.uiTown]
        ]) {
            if (!this.textures.exists(key)) {
                this.load.image(key, path);
            }
        }

        for (const [key, path] of [
            ["arrowShot", ASSETS.arrowShot],
            ["fenceHit", ASSETS.fenceHit],
            ["enemyHit", ASSETS.enemyHit],
            ["powerUp", ASSETS.powerUp],
            ["powerDown", ASSETS.powerDown],
            ["claimrunTheme", ASSETS.claimrunTheme]
        ]) {
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, path);
            }
        }

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

        const openedRunIndex =
            this.saveData
                .openedClaimruns
                .indexOf(this.lotId);

        this.difficulty =
            Math.max(
                1,
                openedRunIndex >= 0
                    ? openedRunIndex + 1
                    : this.saveData
                        .openedClaimruns
                        .length + 1
            );

        AudioDirector.setPreferences(
            this.saveData
        );
        AudioDirector.setSceneMusic(
            this,
            "claimrunTheme",
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

        this.wardenSigils =
            Phaser.Math.Clamp(
                Math.floor(Number(this.saveData.runWards) || 0),
                0,
                3
            );
        this.saveData.runWards = 0;
        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        this.totalEnemies =
            8 +
            (this.difficulty - 1) * 4 +
            Math.max(
                0,
                this.difficulty - 3
            ) * 2;


        this.totalGatePairs =
            Math.min(
                12,
                1 +
                Math.floor(
                    (this.difficulty - 1) * 0.62
                )
            );


        this.enemySpawnDelay =
            Math.max(
                400,

                1220 -
                (
                    this.difficulty -
                    1
                )
                *
                72
            );


        this.enemyBaseSpeed =
            55 +
            (
                this.difficulty -
                1
            )
            *
            6;


        this.enemyBaseHp =
            this.difficulty < 5
                ? 1
                : 2 +
                  Math.floor(
                      (this.difficulty - 5) / 4
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


        this.integrityMax =
            this.difficulty < 3
                ? 7 + this.wardenSigils
                : 5 + this.wardenSigils;

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
        this.createArenaScenery();

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


    createArenaScenery() {

        const rng = () => Phaser.Math.RND.frac();

        for (const side of [22, GAME_WIDTH - 22]) {
            for (let y = 245; y <= 1035; y += 158) {
                const tree =
                    this.add.sprite(
                        side + Phaser.Math.Between(-5, 5),
                        y,
                        rng() < 0.38
                            ? "fieldTreesAutumn"
                            : "fieldTrees",
                        Math.floor(rng() * 8)
                    )
                    .setOrigin(0.5, 0.95)
                    .setScale(0.18 + rng() * 0.05)
                    .setAlpha(0.52 + rng() * 0.12)
                    .setDepth(-920);

                if (rng() < 0.5) {
                    tree.setFlipX(true);
                }

                if (Math.floor((y - 245) / 158) % 2 === 0) {
                    this.add.image(
                        side + (side < GAME_WIDTH / 2 ? 22 : -22),
                        y + 55,
                        `rock${1 + Math.floor(rng() * 4)}`
                    )
                    .setScale(0.30 + rng() * 0.12)
                    .setAlpha(0.64)
                    .setDepth(-910);
                }
            }
        }

        const glows =
            this.add.graphics()
                .setDepth(-905);

        for (let i = 0; i < 24; i++) {
            const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
            const y = Phaser.Math.Between(220, 940);

            glows.fillStyle(
                i % 3 === 0 ? 0xf1c36f : 0x83abc7,
                0.08
            );
            glows.fillCircle(x, y, Phaser.Math.Between(2, 5));
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
                    "16px",

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
                        "15px",

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
                        "23px",

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
                        "15px",

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
                        "15px",

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

            this.difficulty < 4
                ? "DRAG TO AIM • AUTO-FIRE • HOLD THE FENCE"
                : this.difficulty < 6
                    ? "RIFT WALKERS DRIFT • PUMP GREEN GATES"
                    : "BOSS INBOUND • TARGET THE GIANT • PICK A GATE",

            {
                fontFamily:
                    FONT_TECH,

                fontSize:
                    "14px",

                fontStyle:
                    "bold",

                color:
                    "#aebdcc"
            }
        )
        .setOrigin(0.5)
        .setDepth(10001);

        this.pauseButton =
            this.add.image(
                660,
                1232,
                "uiRoundBlue"
            )
            .setScale(0.48)
            .setDepth(10002)
            .setInteractive({
                useHandCursor: true
            });

        this.pauseButtonText =
            this.add.text(
                660,
                1232,
                "Ⅱ",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "19px",
                    color: "#ffffff"
                }
            )
            .setOrigin(0.5)
            .setDepth(10003);

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

                if (this.challengeOver || this.challengePaused) {
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
            pointer => {

                if (this.challengePaused) {

                    const action =
                        this.pauseActionZones
                            ?.find(zone =>
                                Math.abs(pointer.x - zone.x) <=
                                    zone.width / 2 &&
                                Math.abs(pointer.y - zone.y) <=
                                    zone.height / 2
                            );

                    action?.callback();
                    return;

                }

                if (
                    Phaser.Math.Distance.Between(
                        pointer.x,
                        pointer.y,
                        660,
                        1232
                    ) < 34
                ) {
                    this.togglePause();
                    return;
                }

                setTarget(pointer);

            }
        );


        this.input.on(
            "pointermove",

            pointer => {

                if (pointer.isDown && !this.challengePaused) {

                    setTarget(
                        pointer
                    );

                }

            }
        );

        this.input.keyboard.on(
            "keydown",
            event => {
                if (
                    event.code === "Escape" ||
                    event.code === "KeyP"
                ) {
                    this.togglePause();
                }
            }
        );

    }


    togglePause() {

        if (this.challengeOver) {
            return;
        }

        if (this.challengePaused) {

            this.challengePaused = false;
            this.time.paused = false;
            this.physics.resume();

            if (this.pauseCard) {
                this.pauseCard.destroy(true);
                this.pauseCard = null;
            }

            return;
        }

        this.challengePaused = true;
        this.physics.pause();
        this.time.paused = true;

        const panel =
            this.add.container(0, 0)
                .setDepth(20000);

        const shade =
            this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x050911,
                0.78
            );

        const background =
            this.add.graphics();

        background.fillStyle(0x111d2b, 0.99);
        background.fillRoundedRect(90, 430, 540, 420, 28);
        background.lineStyle(3, THEME.gold, 0.60);
        background.strokeRoundedRect(90, 430, 540, 420, 28);

        panel.add([
            shade,
            background,
            this.add.text(
                GAME_WIDTH / 2,
                492,
                "TAKE A BREATHER",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "38px",
                    color: "#fff0a2"
                }
            ).setOrigin(0.5),
            this.add.text(
                GAME_WIDTH / 2,
                548,
                "The skeletons can wait.",
                {
                    fontFamily: FONT_BODY,
                    fontSize: "18px",
                    fontStyle: "bold",
                    color: "#bdc9d5"
                }
            ).setOrigin(0.5)
        ]);

        const addPauseButton = (y, label, callback) => {

            const button =
                this.add.graphics();

            button.fillStyle(0x1d3650, 1);
            button.fillRoundedRect(
                190,
                y - 34,
                340,
                68,
                18
            );
            button.lineStyle(2, THEME.cyan, 0.58);
            button.strokeRoundedRect(
                190,
                y - 34,
                340,
                68,
                18
            );

            const text =
                this.add.text(
                    GAME_WIDTH / 2,
                    y,
                    label,
                    {
                        fontFamily: FONT_DISPLAY,
                        fontSize: label.length > 12
                            ? "16px"
                            : "20px",
                        color: "#ffffff"
                    }
                )
                .setOrigin(0.5);

            panel.add([button, text]);

            this.pauseActionZones.push({
                x: GAME_WIDTH / 2,
                y,
                width: 340,
                height: 88,
                callback
            });

        };

        this.pauseActionZones = [];

        addPauseButton(
            650,
            "RESUME",
            () => this.togglePause()
        );

        addPauseButton(
            760,
            "RETREAT TO MEADOW",
            () => {
                this.challengePaused = false;
                this.time.paused = false;
                this.physics.resume();
                this.scene.start("GameScene");
            }
        );

        this.pauseCard = panel;

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
            this.difficulty >= 4 &&
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
            this.difficulty >= 6 &&
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
            this.difficulty >= 9 &&
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

        const boss =
            this.difficulty >= 6 &&
            this.spawnedEnemies === this.totalEnemies;


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
            this.difficulty < 4
                ? 0
                : Math.min(
                    0.34,
                    0.025 +
                    (this.difficulty - 4) * 0.035 +
                    progress * 0.08
                );


        const elite =
            boss ||
            Math.random() < eliteChance;


        const hp =
            boss
                ? 5 + Math.floor((this.difficulty - 6) / 2)
                : this.enemyBaseHp + (elite ? 1 : 0);


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
                boss
                    ? 3.65
                    : elite
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

        enemy.__boss =
            boss;

        enemy.__drifter =
            this.difficulty >= 4 &&
            !boss &&
            this.spawnedEnemies % 4 === 0;

        if (boss) {

            enemy.__bossLabel =
                this.add.text(
                    x,
                    96,
                    "MEADOW TITAN",
                    {
                        fontFamily: FONT_TECH,
                        fontSize: "13px",
                        fontStyle: "bold",
                        color: "#ff8a98",
                        stroke: "#111722",
                        strokeThickness: 4
                    }
                )
                .setOrigin(0.5)
                .setDepth(705);

            enemy.__bossHealthBg =
                this.add.rectangle(
                    x - 52,
                    112,
                    104,
                    8,
                    0x29151d,
                    0.95
                )
                .setOrigin(0, 0.5)
                .setDepth(706);

            enemy.__bossHealth =
                this.add.rectangle(
                    x - 52,
                    112,
                    104,
                    5,
                    0xff6879,
                    1
                )
                .setOrigin(0, 0.5)
                .setDepth(707);

        }

        if (enemy.__drifter) {
            enemy.setCollideWorldBounds(true);
            enemy.setBounceX(1);
            enemy.setVelocityX(
                Phaser.Math.Between(55, 92) *
                (Math.random() < 0.5 ? -1 : 1)
            );
            enemy.setTint(0x9eb5ff);
        }

        if (boss) {
            enemy.setTint(0xff697a);
        }


        if (elite) {

            if (!boss && !enemy.__drifter) {
                enemy.setTint(0xffd870);
            }

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

        AudioDirector.playEffect(
            positive ? "gate" : "hit"
        );

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

        if (enemy.__bossHealth?.active) {
            enemy.__bossHealth.setScaleX(
                Math.max(
                    0,
                    enemy.__hp / enemy.__maxHp
                )
            );
        }


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

        AudioDirector.playEffect("hit");


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

            enemy.__bossLabel?.destroy();
            enemy.__bossHealthBg?.destroy();
            enemy.__bossHealth?.destroy();

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

        enemy.__bossLabel?.destroy();
        enemy.__bossHealthBg?.destroy();
        enemy.__bossHealth?.destroy();


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

        AudioDirector.playEffect("breach");


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

            AudioDirector.playEffect("win");

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
            this.challengeOver ||
            this.challengePaused
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

            if (
                enemy.active &&
                enemy.__bossLabel?.active
            ) {

                enemy.__bossLabel.setPosition(
                    enemy.x,
                    enemy.y - 60
                );

                enemy.__bossHealthBg.setPosition(
                    enemy.x - 52,
                    enemy.y - 42
                );

                enemy.__bossHealth.setPosition(
                    enemy.x - 52,
                    enemy.y - 42
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
