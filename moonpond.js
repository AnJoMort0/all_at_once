/*
===============================================================================
MOONPOND — QUIET SIDE RUN
===============================================================================

A small non-combat counterweight to Claimrun and Riftfall.

- Moonpond manifests intermittently in Nullmeadow.
- Each climate manifestation offers three casts total.
- The player waits for a ripple, hooks it, then balances lure tension.
- Catches reward EXISTING currencies: Glimmer, Riftglass, or a rare Dawnseal.
- Wet weather and darker hours improve the unusual-catch table.
- No extra wallet currency is introduced just because this is a new minigame.
===============================================================================
*/

class MoonpondScene extends Phaser.Scene {

    constructor() {
        super("MoonpondScene");
    }


    init(data) {

        this.entryData = {
            x:
                Number.isFinite(data?.x)
                    ? data.x
                    : WORLD_SIZE / 2,
            y:
                Number.isFinite(data?.y)
                    ? data.y
                    : WORLD_SIZE / 2 + 160,
            pondX:
                Number.isFinite(data?.pondX)
                    ? data.pondX
                    : WORLD_SIZE / 2,
            pondY:
                Number.isFinite(data?.pondY)
                    ? data.pondY
                    : WORLD_SIZE / 2,
            cycleKey:
                typeof data?.cycleKey === "string"
                    ? data.cycleKey
                    : "",
            phase:
                typeof data?.phase === "string"
                    ? data.phase
                    : "DAY",
            weather:
                typeof data?.weather === "string"
                    ? data.weather
                    : "CLEAR"
        };

    }


    preload() {

        const loadImage =
            (key, path) => {
                if (!this.textures.exists(key)) {
                    this.load.image(key, path);
                }
            };

        const loadSheet =
            (
                key,
                path,
                frameWidth,
                frameHeight
            ) => {
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
            };

        for (const [key, path] of [
            ["moonWaterTile", ASSETS.moonWaterTile],
            ["moonpondIcon", ASSETS.moonpondIcon],
            ["uiRoundBlue", ASSETS.uiRoundBlue],
            ["uiRoundRed", ASSETS.uiRoundRed],
            ["uiTown", ASSETS.uiTown],
            ["glimmer", ASSETS.glimmer],
            ["riftGlassIcon", ASSETS.riftGlassIcon],
            ["dawnSealIcon", ASSETS.dawnSealIcon]
        ]) {
            loadImage(key, path);
        }

        loadSheet(
            "moonWaterRocks",
            ASSETS.moonWaterRocks,
            64,
            64
        );

        loadSheet(
            "moonWaterSplash",
            ASSETS.moonWaterSplash,
            192,
            192
        );

        loadSheet(
            "moonPipIdle",
            ASSETS.pipIdle,
            192,
            192
        );

        for (const [key, path] of [
            ["moonpondWater", ASSETS.moonpondWater],
            ["moonpondSplash", ASSETS.moonpondSplashSfx]
        ]) {
            if (!this.cache.audio.exists(key)) {
                this.load.audio(key, path);
            }
        }

    }


    create() {

        this.saveData =
            this.registry.get("saveData") ||
            loadSave();

        ensureMetaState(
            this.saveData
        );

        if (
            this.entryData.cycleKey &&
            this.saveData.moonpondCycleKey !==
                this.entryData.cycleKey
        ) {
            this.saveData.moonpondCycleKey =
                this.entryData.cycleKey;
            this.saveData.moonpondCastsUsed =
                0;
        }

        this.saveData.moonpondCastsUsed =
            Phaser.Math.Clamp(
                Math.floor(
                    Number(
                        this.saveData.moonpondCastsUsed
                    ) || 0
                ),
                0,
                3
            );

        persistSave(
            this.saveData
        );

        this.registry.set(
            "saveData",
            this.saveData
        );

        this.state =
            "READY";

        this.reelHeld =
            false;

        this.leaving =
            false;

        this.biteTimer =
            null;

        this.targetShiftEvent =
            null;

        this.createMoonpondAnimations();
        this.createPondWorld();
        this.createMoonpondHUD();
        this.createMoonpondInput();

        AudioDirector.setPreferences(
            this.saveData
        );

        AudioDirector.setSceneMusic(
            this,
            "meadowTheme",
            "moonpondWater"
        );

        this.cameras.main.fadeIn(
            220,
            10,
            24,
            34
        );

        this.refreshMoonpondHUD();

    }


    createMoonpondAnimations() {

        if (
            !this.anims.exists(
                "moonpond-splash"
            )
        ) {

            this.anims.create({
                key:
                    "moonpond-splash",
                frames:
                    this.anims.generateFrameNumbers(
                        "moonWaterSplash",
                        {
                            start: 0,
                            end: 8
                        }
                    ),
                frameRate:
                    16,
                repeat:
                    0
            });

        }

        if (
            !this.anims.exists(
                "moonpond-pip-idle"
            )
        ) {

            this.anims.create({
                key:
                    "moonpond-pip-idle",
                frames:
                    this.anims.generateFrameNumbers(
                        "moonPipIdle",
                        {
                            start: 0,
                            end: 7
                        }
                    ),
                frameRate:
                    8,
                repeat:
                    -1
            });

        }

    }


    createPondWorld() {

        this.cameras.main.setBackgroundColor(
            "#183948"
        );

        this.water =
            this.add.tileSprite(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                "moonWaterTile"
            )
            .setTint(
                0x6faec0
            );

        const shade =
            this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x102535,
                0.16
            );

        const phaseTint =
            this.entryData.phase === "NIGHT"
                ? 0x17204f
                : this.entryData.phase === "DUSK"
                    ? 0x49314c
                    : this.entryData.phase === "DAWN"
                        ? 0x6a5542
                        : 0x315f66;

        shade.setFillStyle(
            phaseTint,
            this.entryData.phase === "DAY"
                ? 0.12
                : 0.24
        );

        const shoreline =
            this.add.graphics();

        shoreline.fillStyle(
            0x304f3a,
            1
        );

        shoreline.fillRect(
            0,
            GAME_HEIGHT - 245,
            GAME_WIDTH,
            245
        );

        shoreline.fillStyle(
            0x6d7a4d,
            0.88
        );

        shoreline.fillRect(
            0,
            GAME_HEIGHT - 250,
            GAME_WIDTH,
            42
        );

        const rockFrames = [
            1,
            3,
            5,
            7,
            9,
            11,
            13,
            15
        ];

        for (
            let i = 0;
            i < 12;
            i++
        ) {

            const x =
                34 +
                i * 60;

            this.add.sprite(
                x,
                GAME_HEIGHT - 240 +
                    (i % 2) * 14,
                "moonWaterRocks",
                rockFrames[
                    i % rockFrames.length
                ]
            )
            .setScale(0.84)
            .setDepth(20);

        }

        this.pondSigil =
            this.add.image(
                GAME_WIDTH / 2,
                395,
                "moonpondIcon"
            )
            .setScale(1.35)
            .setDepth(25)
            .setAlpha(0.88);

        this.tweens.add({
            targets:
                this.pondSigil,
            y:
                380,
            scaleX:
                1.48,
            scaleY:
                1.48,
            alpha:
                0.68,
            duration:
                1200,
            yoyo:
                true,
            repeat:
                -1,
            ease:
                "Sine.InOut"
        });

        this.pip =
            this.add.sprite(
                GAME_WIDTH / 2,
                GAME_HEIGHT - 150,
                "moonPipIdle",
                0
            )
            .setScale(0.64)
            .setAngle(-90)
            .setDepth(40)
            .play(
                "moonpond-pip-idle"
            );

        this.idleSplashEvent =
            this.time.addEvent({
                delay:
                    2300,
                loop:
                    true,
                callback:
                    () => {
                        if (
                            this.state === "BITE" ||
                            this.state === "REEL"
                        ) {
                            return;
                        }

                        this.spawnSplash(
                            Phaser.Math.Between(
                                110,
                                GAME_WIDTH - 110
                            ),
                            Phaser.Math.Between(
                                330,
                                820
                            ),
                            0.42
                        );
                    }
            });

    }


    createMoonpondHUD() {

        const top =
            this.add.graphics()
                .setDepth(1000);

        top.fillStyle(
            0x09141c,
            0.93
        );

        top.fillRoundedRect(
            18,
            18,
            GAME_WIDTH - 36,
            126,
            24
        );

        top.lineStyle(
            2,
            0x86e2ef,
            0.42
        );

        top.strokeRoundedRect(
            18,
            18,
            GAME_WIDTH - 36,
            126,
            24
        );

        this.add.text(
            38,
            30,
            "THE MOONPOND",
            {
                fontFamily:
                    FONT_DISPLAY,
                fontSize:
                    "31px",
                color:
                    "#dbfbff"
            }
        )
        .setDepth(1001);

        this.climateText =
            this.add.text(
                40,
                73,
                `${this.entryData.phase} • ${this.entryData.weather}`,
                {
                    fontFamily:
                        FONT_TECH,
                    fontSize:
                        "13px",
                    fontStyle:
                        "bold",
                    color:
                        "#9db8c3"
                }
            )
            .setDepth(1001);

        this.castsText =
            this.add.text(
                40,
                104,
                "",
                {
                    fontFamily:
                        FONT_TECH,
                    fontSize:
                        "14px",
                    fontStyle:
                        "bold",
                    color:
                        "#fff0a2"
                }
            )
            .setDepth(1001);

        this.walletText =
            this.add.text(
                GAME_WIDTH - 42,
                39,
                "",
                {
                    fontFamily:
                        FONT_TECH,
                    fontSize:
                        "13px",
                    fontStyle:
                        "bold",
                    color:
                        "#dce7ee",
                    align:
                        "right"
                }
            )
            .setOrigin(
                1,
                0
            )
            .setDepth(1001);

        this.instructionText =
            this.add.text(
                GAME_WIDTH / 2,
                195,
                "",
                {
                    fontFamily:
                        FONT_DISPLAY,
                    fontSize:
                        "24px",
                    color:
                        "#ffffff",
                    align:
                        "center",
                    wordWrap: {
                        width:
                            610
                    },
                    stroke:
                        "#0a121a",
                    strokeThickness:
                        6
                }
            )
            .setOrigin(0.5)
            .setDepth(1001);

        this.subInstructionText =
            this.add.text(
                GAME_WIDTH / 2,
                245,
                "",
                {
                    fontFamily:
                        FONT_BODY,
                    fontSize:
                        "16px",
                    fontStyle:
                        "bold",
                    color:
                        "#b5c7d1",
                    align:
                        "center",
                    wordWrap: {
                        width:
                            590
                    }
                }
            )
            .setOrigin(0.5)
            .setDepth(1001);

        this.castButton =
            this.add.image(
                GAME_WIDTH / 2,
                1065,
                "uiRoundBlue"
            )
            .setScale(0.92)
            .setDepth(1010)
            .setInteractive({
                useHandCursor: true
            });

        this.castButton.__blocksWorldInput =
            true;

        this.castIcon =
            this.add.image(
                GAME_WIDTH / 2 - 42,
                1065,
                "moonpondIcon"
            )
            .setScale(0.50)
            .setDepth(1011);

        this.castLabel =
            this.add.text(
                GAME_WIDTH / 2 + 23,
                1065,
                "CAST",
                {
                    fontFamily:
                        FONT_DISPLAY,
                    fontSize:
                        "19px",
                    color:
                        "#ffffff"
                }
            )
            .setOrigin(0.5)
            .setDepth(1011);

        this.leaveButton =
            this.add.image(
                GAME_WIDTH - 58,
                82,
                "uiRoundRed"
            )
            .setScale(0.61)
            .setDepth(1010)
            .setInteractive({
                useHandCursor: true
            });

        this.leaveButton.__blocksWorldInput =
            true;

        this.leaveIcon =
            this.add.image(
                GAME_WIDTH - 58,
                82,
                "uiTown"
            )
            .setScale(0.40)
            .setDepth(1011);

        const bar =
            this.add.graphics()
                .setDepth(1002)
                .setVisible(false);

        bar.fillStyle(
            0x071119,
            0.90
        );

        bar.fillRoundedRect(
            105,
            850,
            510,
            76,
            18
        );

        bar.lineStyle(
            3,
            0x8fdbe8,
            0.46
        );

        bar.strokeRoundedRect(
            105,
            850,
            510,
            76,
            18
        );

        this.tensionPanel =
            bar;

        this.targetZone =
            this.add.rectangle(
                GAME_WIDTH / 2,
                888,
                96,
                48,
                0x61e58b,
                0.36
            )
            .setDepth(1003)
            .setVisible(false);

        this.tensionMarker =
            this.add.image(
                GAME_WIDTH / 2,
                888,
                "moonpondIcon"
            )
            .setScale(0.34)
            .setDepth(1004)
            .setVisible(false);

        this.progressBg =
            this.add.rectangle(
                GAME_WIDTH / 2,
                952,
                500,
                18,
                0x071119,
                0.92
            )
            .setDepth(1002)
            .setVisible(false);

        this.progressFill =
            this.add.rectangle(
                GAME_WIDTH / 2 - 250,
                952,
                0,
                12,
                0x86e2ef,
                1
            )
            .setOrigin(
                0,
                0.5
            )
            .setDepth(1003)
            .setVisible(false);

        this.resultRoot =
            this.add.container(
                GAME_WIDTH / 2,
                640
            )
            .setDepth(1020)
            .setVisible(false);

        const resultBg =
            this.add.graphics();

        resultBg.fillStyle(
            0x0a1720,
            0.96
        );

        resultBg.fillRoundedRect(
            -250,
            -115,
            500,
            230,
            26
        );

        resultBg.lineStyle(
            3,
            0x86e2ef,
            0.58
        );

        resultBg.strokeRoundedRect(
            -250,
            -115,
            500,
            230,
            26
        );

        this.resultIcon =
            this.add.image(
                -145,
                0,
                "moonpondIcon"
            )
            .setScale(0.82);

        this.resultTitle =
            this.add.text(
                -70,
                -52,
                "",
                {
                    fontFamily:
                        FONT_DISPLAY,
                    fontSize:
                        "25px",
                    color:
                        "#ffffff"
                }
            );

        this.resultReward =
            this.add.text(
                -70,
                -5,
                "",
                {
                    fontFamily:
                        FONT_TECH,
                    fontSize:
                        "17px",
                    fontStyle:
                        "bold",
                    color:
                        "#fff0a2"
                }
            );

        this.resultFlavor =
            this.add.text(
                -70,
                38,
                "",
                {
                    fontFamily:
                        FONT_BODY,
                    fontSize:
                        "14px",
                    fontStyle:
                        "bold",
                    color:
                        "#aebfcc",
                    wordWrap: {
                        width:
                            270
                    }
                }
            );

        this.resultRoot.add([
            resultBg,
            this.resultIcon,
            this.resultTitle,
            this.resultReward,
            this.resultFlavor
        ]);

        this.castButton.on(
            "pointerdown",
            (
                pointer,
                localX,
                localY,
                event
            ) => {
                event?.stopPropagation?.();

                if (
                    this.state === "READY" ||
                    this.state === "RESULT"
                ) {
                    this.castLine();
                }
            }
        );

        this.leaveButton.on(
            "pointerdown",
            (
                pointer,
                localX,
                localY,
                event
            ) => {
                event?.stopPropagation?.();
                this.returnToMeadow();
            }
        );

    }


    createMoonpondInput() {

        this.spaceKey =
            this.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.SPACE
            );

        this.input.on(
            "pointerdown",
            () => {

                if (
                    this.state === "BITE"
                ) {
                    this.hookRipple();
                    return;
                }

                if (
                    this.state === "REEL"
                ) {
                    this.reelHeld =
                        true;
                }

            }
        );

        this.input.on(
            "pointerup",
            () => {
                this.reelHeld =
                    false;
            }
        );

        this.input.keyboard.on(
            "keydown-SPACE",
            () => {
                if (
                    this.state === "BITE"
                ) {
                    this.hookRipple();
                }
            }
        );

        this.input.keyboard.on(
            "keydown-ESC",
            () =>
                this.returnToMeadow()
        );

    }


    castsLeft() {

        return Math.max(
            0,
            3 -
            (this.saveData.moonpondCastsUsed || 0)
        );

    }


    refreshMoonpondHUD() {

        if (!this.castsText) {
            return;
        }

        const casts =
            this.castsLeft();

        this.castsText.setText(
            `CASTS LEFT • ${casts}/3`
        );

        this.walletText.setText(
            `GLIMMER ${compactAmount(this.saveData.glimmer || 0)}\n` +
            `RIFTGLASS ${compactAmount(this.saveData.riftglass || 0)}  •  ` +
            `DAWN ${compactAmount(this.saveData.dawnseals || 0)}`
        );

        if (
            casts <= 0 &&
            (
                this.state === "READY" ||
                this.state === "RESULT"
            )
        ) {
            this.castButton
                .setVisible(false)
                .disableInteractive();

            this.castIcon
                .setVisible(false);

            this.castLabel
                .setVisible(false);

            this.instructionText.setText(
                "THE POND HAS GONE QUIET"
            );

            this.subInstructionText.setText(
                "Return to Nullmeadow. It may manifest again under another sky."
            );

            return;
        }

        if (
            this.state === "READY" ||
            this.state === "RESULT"
        ) {
            this.castButton
                .setVisible(true)
                .setInteractive({
                    useHandCursor: true
                });

            this.castIcon
                .setVisible(true);

            this.castLabel
                .setVisible(true)
                .setText(
                    this.state === "RESULT"
                        ? "CAST AGAIN"
                        : "CAST"
                );
        }

        if (
            this.state === "READY"
        ) {
            this.instructionText.setText(
                "THREE CASTS BEFORE THE WATER FORGETS YOU"
            );

            const bonusText =
                this.entryData.weather === "MIST"
                    ? "Mist fattens the strange-catch odds."
                    : this.entryData.weather === "DRIZZLE"
                        ? "Rain is good for Riftglass catches."
                        : (
                            this.entryData.phase === "NIGHT" ||
                            this.entryData.phase === "DUSK"
                        )
                            ? "Dark water occasionally gives back a Dawnseal."
                            : "Watch the ripple. Hook it, then balance the pull.";

            this.subInstructionText.setText(
                bonusText
            );
        }

    }


    castLine() {

        if (
            this.castsLeft() <= 0 ||
            !(
                this.state === "READY" ||
                this.state === "RESULT"
            )
        ) {
            return;
        }

        this.state =
            "WAIT";

        this.resultRoot
            .setVisible(false);

        this.castButton
            .setVisible(false)
            .disableInteractive();

        this.castIcon
            .setVisible(false);

        this.castLabel
            .setVisible(false);

        this.saveData.moonpondCastsUsed =
            Phaser.Math.Clamp(
                (this.saveData.moonpondCastsUsed || 0) + 1,
                0,
                3
            );

        persistSave(
            this.saveData
        );

        this.instructionText.setText(
            "WAIT FOR THE RIPPLE…"
        );

        this.subInstructionText.setText(
            "Do not strike early."
        );

        this.refreshMoonpondHUD();

        this.time.delayedCall(
            Phaser.Math.Between(
                1000,
                2600
            ),
            () => {

                if (
                    this.state !== "WAIT"
                ) {
                    return;
                }

                this.state =
                    "BITE";

                const splashX =
                    Phaser.Math.Between(
                        145,
                        GAME_WIDTH - 145
                    );

                const splashY =
                    Phaser.Math.Between(
                        395,
                        720
                    );

                this.activeRipple = {
                    x: splashX,
                    y: splashY
                };

                this.spawnSplash(
                    splashX,
                    splashY,
                    0.86
                );

                this.instructionText.setText(
                    "HOOK IT!"
                );

                this.subInstructionText.setText(
                    "Tap anywhere or press SPACE."
                );

                AudioDirector.playEffect(
                    "pickup"
                );

                try {
                    this.sound.play(
                        "moonpondSplash",
                        {
                            volume: 0.20
                        }
                    );
                } catch (_) {}

                this.biteTimer =
                    this.time.delayedCall(
                        1150,
                        () => {
                            if (
                                this.state === "BITE"
                            ) {
                                this.failCatch(
                                    "THE RIPPLE CLOSED"
                                );
                            }
                        }
                    );

            }
        );

    }


    hookRipple() {

        if (
            this.state !== "BITE"
        ) {
            return;
        }

        if (
            this.biteTimer
        ) {
            this.biteTimer.remove(false);
            this.biteTimer = null;
        }

        this.state =
            "REEL";

        this.reelHeld =
            false;

        this.tension =
            50;

        this.catchProgress =
            0;

        this.targetPosition =
            50;

        this.targetDestination =
            Phaser.Math.Between(
                25,
                75
            );

        this.showTensionUI(
            true
        );

        this.instructionText.setText(
            "BALANCE THE CURRENT"
        );

        this.subInstructionText.setText(
            "Hold to pull right • release to drift left • stay inside the green water."
        );

        this.targetShiftEvent =
            this.time.addEvent({
                delay:
                    620,
                loop:
                    true,
                callback:
                    () => {
                        if (
                            this.state === "REEL"
                        ) {
                            this.targetDestination =
                                Phaser.Math.Between(
                                    16,
                                    84
                                );
                        }
                    }
            });

    }


    showTensionUI(visible) {

        for (const object of [
            this.tensionPanel,
            this.targetZone,
            this.tensionMarker,
            this.progressBg,
            this.progressFill
        ]) {
            object?.setVisible(
                visible
            );
        }

    }


    failCatch(reason) {

        if (
            this.state === "RESULT"
        ) {
            return;
        }

        this.state =
            "RESULT";

        this.reelHeld =
            false;

        if (
            this.targetShiftEvent
        ) {
            this.targetShiftEvent.remove(false);
            this.targetShiftEvent = null;
        }

        this.showTensionUI(
            false
        );

        AudioDirector.playEffect(
            "hit"
        );

        this.resultRoot
            .setVisible(true);

        this.resultIcon
            .setTexture(
                "moonpondIcon"
            )
            .clearTint();

        this.resultTitle.setText(
            reason
        );

        this.resultReward.setText(
            "NO CATCH"
        );

        this.resultFlavor.setText(
            "The Moonpond keeps whatever you almost had."
        );

        this.instructionText.setText(
            "THE WATER WON THAT ONE"
        );

        this.subInstructionText.setText(
            this.castsLeft() > 0
                ? "You still have another cast."
                : "That was the last cast of this manifestation."
        );

        this.refreshMoonpondHUD();

    }


    successCatch() {

        if (
            this.state !== "REEL"
        ) {
            return;
        }

        this.state =
            "RESULT";

        this.reelHeld =
            false;

        if (
            this.targetShiftEvent
        ) {
            this.targetShiftEvent.remove(false);
            this.targetShiftEvent = null;
        }

        this.showTensionUI(
            false
        );

        const catchResult =
            this.rollCatch();

        this.saveData.pondCatches =
            (this.saveData.pondCatches || 0) + 1;

        if (
            catchResult.rare
        ) {
            this.saveData.pondRareCatches =
                (this.saveData.pondRareCatches || 0) + 1;
        }

        for (
            const [currency, amount]
            of Object.entries(
                catchResult.reward
            )
        ) {
            this.saveData[currency] =
                Math.max(
                    0,
                    Number(this.saveData[currency]) || 0
                ) + amount;
        }

        persistSave(
            this.saveData
        );

        this.registry.set(
            "saveData",
            this.saveData
        );

        this.resultRoot
            .setVisible(true);

        this.resultIcon
            .setTexture(
                catchResult.icon
            )
            .clearTint();

        this.resultTitle.setText(
            catchResult.name
        );

        this.resultReward.setText(
            catchResult.rewardText
        );

        this.resultFlavor.setText(
            catchResult.flavor
        );

        this.instructionText.setText(
            catchResult.rare
                ? "THE POND GAVE UP SOMETHING IMPOSSIBLE"
                : "LANDED"
        );

        this.subInstructionText.setText(
            this.castsLeft() > 0
                ? "Banked immediately. Cast again if you want."
                : "Banked immediately. The pond is quiet now."
        );

        AudioDirector.playEffect(
            catchResult.rare
                ? "win"
                : "pickup"
        );

        this.spawnSplash(
            GAME_WIDTH / 2,
            620,
            1.15
        );

        this.refreshMoonpondHUD();

    }


    rollCatch() {

        const dark =
            this.entryData.phase === "NIGHT" ||
            this.entryData.phase === "DUSK";

        const wet =
            this.entryData.weather === "MIST" ||
            this.entryData.weather === "DRIZZLE";

        const dawnChance =
            0.035 +
            (dark ? 0.035 : 0) +
            (this.entryData.weather === "MIST" ? 0.02 : 0);

        const glassChance =
            0.27 +
            (wet ? 0.12 : 0);

        const roll =
            Math.random();

        if (
            roll <
            dawnChance
        ) {

            return {
                name:
                    "DAWNKOI",
                icon:
                    "dawnSealIcon",
                rare:
                    true,
                reward: {
                    dawnseals: 1
                },
                rewardText:
                    "+1 DAWNSEAL",
                flavor:
                    "It should not be swimming here. It should probably not be swimming anywhere."
            };

        }

        if (
            roll <
            dawnChance +
            glassChance
        ) {

            const amount =
                Phaser.Math.Between(
                    4,
                    8
                ) +
                (dark ? 1 : 0);

            return {
                name:
                    "NIGHTGLASS EEL",
                icon:
                    "riftGlassIcon",
                rare:
                    false,
                reward: {
                    riftglass: amount
                },
                rewardText:
                    `+${amount} RIFTGLASS`,
                flavor:
                    "A shard-shaped thing with the bad manners to wriggle."
            };

        }

        const amount =
            Phaser.Math.Between(
                22,
                45
            ) +
            (
                this.entryData.phase === "DAWN"
                    ? 8
                    : 0
            );

        return {
            name:
                "CLOCKFIN",
            icon:
                "glimmer",
            rare:
                false,
            reward: {
                glimmer: amount
            },
            rewardText:
                `+${amount} GLIMMER`,
            flavor:
                "Its scales tick softly when nobody is listening."
        };

    }


    spawnSplash(
        x,
        y,
        scale = 0.7
    ) {

        const splash =
            this.add.sprite(
                x,
                y,
                "moonWaterSplash",
                0
            )
            .setScale(scale)
            .setDepth(35)
            .play(
                "moonpond-splash"
            );

        splash.once(
            "animationcomplete-moonpond-splash",
            () =>
                splash.destroy()
        );

    }


    returnToMeadow() {

        if (
            this.leaving
        ) {
            return;
        }

        this.leaving =
            true;

        persistSave(
            this.saveData
        );

        this.registry.set(
            "saveData",
            this.saveData
        );

        if (
            AudioDirector.releaseScene
        ) {
            AudioDirector.releaseScene(
                this
            );
        }

        this.cameras.main.fadeOut(
            180,
            10,
            18,
            28
        );

        this.time.delayedCall(
            190,
            () => {
                this.scene.start(
                    "GameScene",
                    {
                        returnFromMoonpond:
                            true,
                        x:
                            this.entryData.x,
                        y:
                            this.entryData.y
                    }
                );
            }
        );

    }


    update(time, delta) {

        if (this.water) {
            this.water.tilePositionX +=
                delta * 0.008;
            this.water.tilePositionY +=
                delta * 0.003;
        }

        if (
            this.state !== "REEL"
        ) {
            return;
        }

        const held =
            this.reelHeld ||
            this.spaceKey?.isDown;

        const dt =
            Math.min(
                delta || 16.667,
                50
            ) /
            1000;

        this.tension +=
            (held ? 38 : -31) *
            dt;

        this.tension =
            Phaser.Math.Clamp(
                this.tension,
                0,
                100
            );

        this.targetPosition =
            Phaser.Math.Linear(
                this.targetPosition,
                this.targetDestination,
                0.055
            );

        const left =
            135;

        const width =
            450;

        const markerX =
            left +
            this.tension /
            100 *
            width;

        const targetX =
            left +
            this.targetPosition /
            100 *
            width;

        this.tensionMarker.x =
            markerX;

        this.targetZone.x =
            targetX;

        const inside =
            Math.abs(
                markerX -
                targetX
            )
            <
            this.targetZone.width *
            0.46;

        if (inside) {
            this.catchProgress +=
                31 *
                dt;

            this.targetZone.setFillStyle(
                0x61e58b,
                0.44
            );
        } else {
            this.catchProgress -=
                13 *
                dt;

            this.targetZone.setFillStyle(
                0xf2a85a,
                0.34
            );
        }

        this.catchProgress =
            Phaser.Math.Clamp(
                this.catchProgress,
                0,
                100
            );

        this.progressFill.width =
            this.catchProgress /
            100 *
            500;

        if (
            this.catchProgress >=
            100
        ) {
            this.successCatch();
            return;
        }

        if (
            this.tension <= 0 ||
            this.tension >= 100
        ) {
            this.failCatch(
                "LINE WENT DEAD"
            );
        }

    }

}
