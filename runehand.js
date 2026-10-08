/*
===============================================================================
RUNEHAND — TURN-BASED CARD DUEL
===============================================================================

The Fatehouse exists so Nullmeadow can contain an actual turn-based/card game rather
than every side activity being real-time movement. Enemy intent is always visible.
Spend Resolve, build Block, then end the turn and let the House answer.

- First win per Nullmeadow day pays the premium Dawnseal reward.
- Further wins still pay Riftglass and advance the duel record/difficulty.
- Hollowroad's Red Thread relic starts turn one with +1 Resolve.
===============================================================================
*/

class RunehandScene extends Phaser.Scene {

    constructor() {
        super("RunehandScene");
    }


    init(data) {
        this.entryData = {
            x: Number.isFinite(data?.x) ? data.x : WORLD_SIZE / 2,
            y: Number.isFinite(data?.y) ? data.y : WORLD_SIZE / 2,
            meadowDay: Math.max(0, Math.floor(Number(data?.meadowDay) || 0))
        };
    }


    preload() {
        const loadImage = (key, path) => {
            if (!this.textures.exists(key)) this.load.image(key, path);
        };

        for (const [key, path] of [
            ["runeSword", ASSETS.uiSword],
            ["runeGuard", ASSETS.uiValor],
            ["runeMend", ASSETS.dawnSealIcon],
            ["runeHeavy", ASSETS.uiCrossed],
            ["runeFeint", ASSETS.uiInfo],
            ["runeFocus", ASSETS.riftGlassIcon],
            ["runeTown", ASSETS.uiTown],
            ["runeRoundBlue", ASSETS.uiRoundBlue],
            ["runeRoundRed", ASSETS.uiRoundRed],
            ["runeTinyBlue", ASSETS.uiTinyRoundBlue],
            ["runeTinyRed", ASSETS.uiTinyRoundRed],
            ["runeFatehouse", ASSETS.buildingFate],
            ["runeEnemy", ASSETS.hollowDoor]
        ]) {
            loadImage(key, path);
        }

        for (const [key, path] of [
            ["runeDrawSound", ASSETS.cardDrawSfx],
            ["runeRollSound", ASSETS.diceRollSfx],
            ["runeHitSound", ASSETS.enemyHit],
            ["runePowerSound", ASSETS.powerUp],
            ["runeTheme", ASSETS.meadowTheme]
        ]) {
            if (!this.cache.audio.exists(key)) this.load.audio(key, path);
        }
    }


    create() {
        this.saveData =
            this.registry.get("saveData") ||
            loadSave();
        ensureMetaState(this.saveData);

        this.difficulty = Phaser.Math.Clamp(
            1 +
            Math.floor((this.saveData.fateWins || 0) / 2) +
            Math.floor((this.saveData.hollowWins || 0) / 3),
            1,
            14
        );

        const coldRead = this.saveData.tech?.coldRead || 0;

        this.maxHp =
            28 +
            (this.saveData.tech?.ironPulse || 0) * 2 +
            coldRead * 2 +
            ((this.saveData.relics || []).includes("lantern-heart") ? 3 : 0);
        this.hp = this.maxHp;
        this.block = coldRead;
        this.enemyMaxHp = 25 + this.difficulty * 5;
        this.enemyHp = this.enemyMaxHp;
        this.enemyBlock = 0;
        this.resolveMax = 3;
        this.resolve = 3 + ((this.saveData.relics || []).includes("red-thread") ? 1 : 0);
        this.turn = 1;
        this.runEnded = false;
        this.enemyActing = false;
        this.nextResolvePenalty = 0;
        this.retaliate = 0;
        this.hand = [];
        this.cardObjects = [];

        this.cards = this.buildDeck();
        this.drawPile = [];
        this.discardPile = [];

        this.cameras.main.setBackgroundColor("#160f20");
        this.createTable();
        this.createHud();
        this.createEnemy();
        this.createButtons();

        AudioDirector.setPreferences(this.saveData);
        AudioDirector.setSceneMusic(this, "runeTheme", null);
        this.input.once("pointerdown", () => AudioDirector.unlock(this.saveData));

        this.shuffleDeck();
        this.prepareEnemyIntent();
        this.drawHand();
        this.cameras.main.fadeIn(220, 24, 12, 34);
    }


    buildDeck() {
        const cards = [
            {
                id: "slash",
                name: "SLASH",
                cost: 1,
                icon: "runeSword",
                text: "Deal 6 damage.",
                play: () => this.dealEnemyDamage(6)
            },
            {
                id: "slash2",
                name: "SLASH",
                cost: 1,
                icon: "runeSword",
                text: "Deal 6 damage.",
                play: () => this.dealEnemyDamage(6)
            },
            {
                id: "guard",
                name: "GUARD",
                cost: 1,
                icon: "runeGuard",
                text: "Gain 7 Block.",
                play: () => {
                    this.block += 7;
                    this.floatText(GAME_WIDTH / 2 - 150, 690, "+7 BLOCK", "#a9d9ff");
                }
            },
            {
                id: "mend",
                name: "MEND",
                cost: 1,
                icon: "runeMend",
                text: "Heal 5 HP.",
                play: () => {
                    const before = this.hp;
                    this.hp = Math.min(this.maxHp, this.hp + 5);
                    this.floatText(GAME_WIDTH / 2 - 150, 690, `+${this.hp - before} HP`, "#a9ffb8");
                }
            },
            {
                id: "heavy",
                name: "HAMMER ARGUMENT",
                cost: 2,
                icon: "runeHeavy",
                text: "Deal 13 damage.",
                play: () => this.dealEnemyDamage(13)
            },
            {
                id: "feint",
                name: "FEINT",
                cost: 1,
                icon: "runeFeint",
                text: "Deal 4. Gain 4 Block.",
                play: () => {
                    this.dealEnemyDamage(4);
                    this.block += 4;
                }
            },
            {
                id: "focus",
                name: "GLASS FOCUS",
                cost: 0,
                icon: "runeFocus",
                text: "Gain 1 Resolve. Exhaust.",
                exhaust: true,
                play: () => {
                    this.resolve += 1;
                    this.floatText(GAME_WIDTH / 2, 785, "+1 RESOLVE", "#dfb1ff");
                }
            },
            {
                id: "riposte",
                name: "RIPOSTE",
                cost: 1,
                icon: "runeSword",
                text: "Gain 4 Block. Return 4 damage on the next attack.",
                play: () => {
                    this.block += 4;
                    this.retaliate = Math.max(this.retaliate, 4);
                }
            }
        ];

        if ((this.saveData.fateWins || 0) >= 3) {
            cards.push({
                id: "dawncut",
                name: "DAWN CUT",
                cost: 2,
                icon: "runeMend",
                text: "Deal 10. Heal 3.",
                play: () => {
                    this.dealEnemyDamage(10);
                    this.hp = Math.min(this.maxHp, this.hp + 3);
                }
            });
        }

        if ((this.saveData.hollowWins || 0) >= 2) {
            cards.push({
                id: "wrongroad",
                name: "WRONG ROAD",
                cost: 1,
                icon: "runeFocus",
                text: "Deal 5. Gain 1 Resolve next turn.",
                play: () => {
                    this.dealEnemyDamage(5);
                    this.nextTurnResolveBonus = (this.nextTurnResolveBonus || 0) + 1;
                }
            });
        }

        return cards;
    }


    createTable() {
        const g = this.add.graphics().setDepth(-100);
        g.fillStyle(0x160f20, 1);
        g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x2d1b35, 1);
        g.fillRoundedRect(34, 128, 652, 1010, 30);
        g.lineStyle(4, 0x7e527d, 0.70);
        g.strokeRoundedRect(34, 128, 652, 1010, 30);

        for (let y = 210; y < 1080; y += 84) {
            g.lineStyle(2, 0xffffff, 0.025);
            g.lineBetween(65, y, 655, y);
        }

        this.add.image(GAME_WIDTH / 2, 248, "runeFatehouse")
            .setScale(0.28)
            .setAlpha(0.22)
            .setTint(0xe5bbff)
            .setDepth(-50);
    }


    createHud() {
        const top = this.add.graphics().setDepth(10000);
        top.fillStyle(0x0b0810, 0.97);
        top.fillRoundedRect(16, 14, 688, 96, 22);
        top.lineStyle(2, 0xca83c9, 0.50);
        top.strokeRoundedRect(16, 14, 688, 96, 22);

        this.add.text(32, 24, "RUNEHAND", {
            fontFamily: FONT_DISPLAY,
            fontSize: "28px",
            color: "#f8ddff"
        }).setDepth(10001);

        this.turnHud = this.add.text(33, 63, "", {
            fontFamily: FONT_TECH,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#bfa9c6"
        }).setDepth(10001);

        this.dailyHud = this.add.text(688, 24, "", {
            fontFamily: FONT_TECH,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#e2c1ff",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.resolveHud = this.add.text(688, 63, "", {
            fontFamily: FONT_TECH,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffe18b",
            align: "right"
        }).setOrigin(1, 0).setDepth(10001);

        this.playerHud = this.add.text(72, 745, "", {
            fontFamily: FONT_TECH,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#cde8ff"
        }).setDepth(5000);

        this.enemyHud = this.add.text(648, 456, "", {
            fontFamily: FONT_TECH,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffb3c4",
            align: "right"
        }).setOrigin(1, 0).setDepth(5000);

        this.intentHud = this.add.text(
            GAME_WIDTH / 2,
            503,
            "",
            {
                fontFamily: FONT_DISPLAY,
                fontSize: "21px",
                color: "#ffcf93",
                align: "center",
                wordWrap: { width: 560 }
            }
        ).setOrigin(0.5).setDepth(5000);

        this.updateHud();
    }


    createEnemy() {
        this.enemyArt = this.add.image(
            GAME_WIDTH / 2,
            350,
            "runeEnemy"
        )
        .setScale(0.48)
        .setTint(0x9d668f)
        .setDepth(300);

        this.tweens.add({
            targets: this.enemyArt,
            y: 336,
            scaleX: 0.51,
            scaleY: 0.51,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.add.text(
            GAME_WIDTH / 2,
            420,
            `HOUSE ADVERSARY • RANK ${this.difficulty}`,
            {
                fontFamily: FONT_TECH,
                fontSize: "13px",
                fontStyle: "bold",
                color: "#d7b6d4"
            }
        ).setOrigin(0.5).setDepth(500);
    }


    createButtons() {
        this.endButton = this.add.image(
            610,
            1188,
            "runeRoundBlue"
        )
        .setScale(0.58)
        .setInteractive({ useHandCursor: true })
        .setDepth(10000);
        this.endButtonIcon = this.add.image(
            610,
            1188,
            "runeHeavy"
        ).setScale(0.34).setDepth(10001);
        this.endButtonText = this.add.text(
            610,
            1240,
            "END TURN",
            {
                fontFamily: FONT_TECH,
                fontSize: "12px",
                fontStyle: "bold",
                color: "#f6edff"
            }
        ).setOrigin(0.5).setDepth(10001);
        this.endButton.on("pointerdown", () => this.endPlayerTurn());

        const leave = this.add.image(62, 1188, "runeRoundRed")
            .setScale(0.48)
            .setInteractive({ useHandCursor: true })
            .setDepth(10000);
        const leaveIcon = this.add.image(62, 1188, "runeTown")
            .setScale(0.31)
            .setDepth(10001);
        const leaveText = this.add.text(98, 1188, "FOLD", {
            fontFamily: FONT_TECH,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#e9dbea"
        }).setOrigin(0, 0.5).setDepth(10001);
        leave.on("pointerdown", () => this.finish(false, true));
    }


    shuffleDeck() {
        const source = this.cards.map((card, index) => ({ ...card, uid: `${card.id}-${index}-${this.turn}` }));
        for (let i = source.length - 1; i > 0; i--) {
            const j = Phaser.Math.Between(0, i);
            [source[i], source[j]] = [source[j], source[i]];
        }
        this.drawPile = source;
        this.discardPile = [];
    }


    drawOne() {
        if (!this.drawPile.length) {
            if (!this.discardPile.length) return null;
            this.drawPile = this.discardPile.splice(0);
            for (let i = this.drawPile.length - 1; i > 0; i--) {
                const j = Phaser.Math.Between(0, i);
                [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
            }
        }
        return this.drawPile.pop() || null;
    }


    drawHand() {
        if (this.runEnded) return;

        for (const object of this.cardObjects) {
            if (object?.active !== false) object.destroy?.();
        }
        this.cardObjects = [];
        this.hand = [];

        while (this.hand.length < 4) {
            const card = this.drawOne();
            if (!card) break;
            this.hand.push(card);
        }

        this.renderHand();
        try { this.sound.play("runeDrawSound", { volume: 0.14 }); } catch (_) {}
    }


    renderHand() {
        for (const object of this.cardObjects) {
            if (object?.active !== false) object.destroy?.();
        }
        this.cardObjects = [];

        const positions = [115, 278, 442, 605];

        this.hand.forEach((card, index) => {
            const x = positions[index] ?? GAME_WIDTH / 2;
            const y = 965;
            const affordable = card.cost <= this.resolve;

            const bg = this.add.graphics().setDepth(7000);
            bg.fillStyle(affordable ? 0x2e2540 : 0x211b29, 1);
            bg.fillRoundedRect(x - 70, y - 105, 140, 210, 18);
            bg.lineStyle(3, affordable ? 0xb77ad5 : 0x65566d, affordable ? 0.85 : 0.50);
            bg.strokeRoundedRect(x - 70, y - 105, 140, 210, 18);

            const plate = this.add.image(x, y - 57, "runeTinyBlue")
                .setScale(0.78)
                .setAlpha(affordable ? 1 : 0.55)
                .setDepth(7001);
            const icon = this.add.image(x, y - 57, card.icon)
                .setScale(0.34)
                .setAlpha(affordable ? 1 : 0.55)
                .setDepth(7002);
            const cost = this.add.text(x - 54, y - 90, String(card.cost), {
                fontFamily: FONT_DISPLAY,
                fontSize: "19px",
                color: affordable ? "#ffe38d" : "#877c8c"
            }).setOrigin(0.5).setDepth(7003);
            const title = this.add.text(x, y - 8, card.name, {
                fontFamily: FONT_DISPLAY,
                fontSize: card.name.length > 10 ? "14px" : "17px",
                color: affordable ? "#f9ecff" : "#8f8294",
                align: "center",
                wordWrap: { width: 126 }
            }).setOrigin(0.5).setDepth(7003);
            const text = this.add.text(x, y + 55, card.text, {
                fontFamily: FONT_BODY,
                fontSize: "11px",
                fontStyle: "bold",
                color: affordable ? "#cfc4d4" : "#746d78",
                align: "center",
                wordWrap: { width: 122 }
            }).setOrigin(0.5).setDepth(7003);
            const hit = this.add.zone(x, y, 140, 210)
                .setDepth(7004)
                .setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => this.playCard(card));

            this.cardObjects.push(bg, plate, icon, cost, title, text, hit);
        });
    }


    playCard(card) {
        if (
            this.runEnded ||
            this.enemyActing ||
            !this.hand.includes(card) ||
            card.cost > this.resolve
        ) {
            if (card?.cost > this.resolve) {
                this.floatText(GAME_WIDTH / 2, 820, "NOT ENOUGH RESOLVE", "#ff9aa9");
            }
            return;
        }

        this.resolve -= card.cost;
        card.play();
        this.hand = this.hand.filter(item => item !== card);
        if (!card.exhaust) this.discardPile.push(card);
        try { this.sound.play("runeRollSound", { volume: 0.10, rate: Phaser.Math.FloatBetween(0.92, 1.08) }); } catch (_) {}

        this.cameras.main.shake(50, 0.0025);
        this.updateHud();
        if (!this.runEnded) this.renderHand();
    }


    dealEnemyDamage(amount) {
        if (this.runEnded) return;
        let remaining = amount;
        if (this.enemyBlock > 0) {
            const absorbed = Math.min(this.enemyBlock, remaining);
            this.enemyBlock -= absorbed;
            remaining -= absorbed;
        }
        this.enemyHp -= remaining;
        this.floatText(
            GAME_WIDTH / 2,
            300,
            remaining > 0 ? `-${remaining}` : "BLOCKED",
            remaining > 0 ? "#ffb1bd" : "#a9d9ff"
        );
        this.enemyArt.setTintFill(0xffffff);
        this.time.delayedCall(70, () => {
            if (this.enemyArt?.active) this.enemyArt.setTint(0x9d668f);
        });
        try { this.sound.play("runeHitSound", { volume: 0.12 }); } catch (_) {}
        this.updateHud();
        if (this.enemyHp <= 0) this.finish(true, false);
    }


    prepareEnemyIntent() {
        const rank = this.difficulty;
        const cycle = (this.turn + rank) % 5;
        if (cycle === 0) {
            this.enemyIntent = {
                type: "attack",
                amount: 6 + rank,
                label: `INTENT • CUT ${6 + rank}`
            };
        } else if (cycle === 1) {
            this.enemyIntent = {
                type: "guard",
                amount: 6 + Math.floor(rank * 0.7),
                label: `INTENT • WARD +${6 + Math.floor(rank * 0.7)}`
            };
        } else if (cycle === 2) {
            this.enemyIntent = {
                type: "heavy",
                amount: 9 + rank,
                label: `INTENT • HEAVY ${9 + rank}`
            };
        } else if (cycle === 3) {
            this.enemyIntent = {
                type: "hex",
                amount: 4 + Math.floor(rank * 0.65),
                label: `INTENT • HEX ${4 + Math.floor(rank * 0.65)} + DRAIN`
            };
        } else {
            this.enemyIntent = {
                type: "bite",
                amount: 5 + Math.floor(rank * 0.75),
                heal: 4 + Math.floor(rank * 0.5),
                label: `INTENT • BITE ${5 + Math.floor(rank * 0.75)} / HEAL`
            };
        }
        this.updateHud();
    }


    endPlayerTurn() {
        if (this.runEnded || this.enemyActing) return;
        this.enemyActing = true;
        this.endButton.disableInteractive();

        for (const card of this.hand) {
            this.discardPile.push(card);
        }
        this.hand = [];
        this.renderHand();

        this.time.delayedCall(360, () => this.executeEnemyIntent());
    }


    executeEnemyIntent() {
        if (this.runEnded) return;
        const intent = this.enemyIntent;
        try { this.sound.play("runeRollSound", { volume: 0.13, rate: 0.78 }); } catch (_) {}

        if (intent.type === "guard") {
            this.enemyBlock += intent.amount;
            this.floatText(GAME_WIDTH / 2, 315, `+${intent.amount} WARD`, "#c59fff");
        } else {
            this.takeDamage(intent.amount);
            if (intent.type === "hex" && !this.runEnded) {
                this.nextResolvePenalty = 1;
                this.floatText(GAME_WIDTH / 2 - 145, 705, "RESOLVE DRAINED", "#e3a0ff");
            }
            if (intent.type === "bite" && !this.runEnded) {
                this.enemyHp = Math.min(this.enemyMaxHp, this.enemyHp + intent.heal);
                this.floatText(GAME_WIDTH / 2, 335, `+${intent.heal} HP`, "#b3ffbd");
            }
        }

        if (this.runEnded) return;

        this.time.delayedCall(430, () => this.startNextTurn());
    }


    takeDamage(amount) {
        let remaining = amount;
        if (this.block > 0) {
            const absorbed = Math.min(this.block, remaining);
            this.block -= absorbed;
            remaining -= absorbed;
        }

        this.hp -= remaining;
        this.floatText(
            GAME_WIDTH / 2 - 150,
            680,
            remaining > 0 ? `-${remaining} HP` : "BLOCKED",
            remaining > 0 ? "#ff98aa" : "#a9d9ff"
        );

        if (this.retaliate > 0 && amount > 0) {
            const retaliation = this.retaliate;
            this.retaliate = 0;
            this.time.delayedCall(120, () => this.dealEnemyDamage(retaliation));
        }

        this.updateHud();
        if (this.hp <= 0) this.finish(false, false);
    }


    startNextTurn() {
        if (this.runEnded) return;
        this.turn++;
        const bonus = this.nextTurnResolveBonus || 0;
        this.nextTurnResolveBonus = 0;
        this.resolve = Math.max(
            1,
            this.resolveMax + bonus - this.nextResolvePenalty
        );
        this.nextResolvePenalty = 0;
        this.block = 0;
        this.enemyActing = false;
        this.endButton.setInteractive({ useHandCursor: true });
        this.prepareEnemyIntent();
        this.drawHand();
        this.updateHud();
    }


    updateHud() {
        if (!this.turnHud) return;
        this.turnHud.setText(`TURN ${this.turn} • HOUSE RANK ${this.difficulty}`);
        const dailyReady =
            (this.saveData.fateLastRewardDay ?? -1) !==
            this.entryData.meadowDay;
        this.dailyHud.setText(dailyReady ? "DAILY DAWNSEAL READY" : "DAILY PAID");
        this.resolveHud.setText(`RESOLVE ${this.resolve}`);
        this.playerHud.setText(`PIP  HP ${Math.max(0, this.hp)}/${this.maxHp}  •  BLOCK ${this.block}`);
        this.enemyHud.setText(`HOUSE  HP ${Math.max(0, this.enemyHp)}/${this.enemyMaxHp}  •  WARD ${this.enemyBlock}`);
        if (this.enemyIntent) this.intentHud.setText(this.enemyIntent.label);
    }


    floatText(x, y, text, color) {
        const t = this.add.text(x, y, text, {
            fontFamily: FONT_TECH,
            fontSize: "16px",
            fontStyle: "bold",
            color,
            stroke: "#0f0912",
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(12000);
        this.tweens.add({
            targets: t,
            y: y - 34,
            alpha: 0,
            duration: 620,
            onComplete: () => t.destroy()
        });
    }


    finish(won, folded) {
        if (this.runEnded) return;
        this.runEnded = true;
        this.enemyActing = false;

        let glassReward = 0;
        let sealReward = 0;
        let daily = false;

        if (won) {
            this.saveData.fateWins = (this.saveData.fateWins || 0) + 1;
            glassReward = 18 + this.difficulty * 5;
            this.saveData.riftglass += glassReward;

            daily =
                (this.saveData.fateLastRewardDay ?? -1) !==
                this.entryData.meadowDay;
            if (daily) {
                sealReward = 1 + (this.difficulty >= 8 ? 1 : 0);
                this.saveData.dawnseals += sealReward;
                this.saveData.fateLastRewardDay = this.entryData.meadowDay;
            }

            if (hasBuildingInSave(this.saveData, "bountyBell")) {
                const bounty = ensureRotatingBounty(this.saveData);
                if (
                    bounty.definition.type === "fate" &&
                    !bounty.state.claimed
                ) {
                    bounty.state.progress = Math.min(
                        bounty.definition.target,
                        Number(bounty.state.progress || 0) + 1
                    );
                }
            }
        } else if (!folded) {
            this.saveData.fateLosses = (this.saveData.fateLosses || 0) + 1;
        }

        persistSave(this.saveData);
        this.registry.set("saveData", this.saveData);

        for (const object of this.cardObjects) {
            if (object?.active !== false) object.destroy?.();
        }
        this.cardObjects = [];
        this.endButton?.disableInteractive();

        const overlay = this.add.container(0, 0).setDepth(30000);
        overlay.add(
            this.add.rectangle(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2,
                GAME_WIDTH,
                GAME_HEIGHT,
                0x09060d,
                0.89
            )
        );

        overlay.add(
            this.add.text(
                GAME_WIDTH / 2,
                345,
                won ? "THE HOUSE FOLDS" : folded ? "HAND FOLDED" : "THE HOUSE TAKES IT",
                {
                    fontFamily: FONT_DISPLAY,
                    fontSize: "38px",
                    color: won ? "#ffe18d" : "#ff9cb2",
                    align: "center"
                }
            ).setOrigin(0.5)
        );

        let summary = won
            ? `+${glassReward} Riftglass\n${daily ? `+${sealReward} Dawnseal${sealReward === 1 ? "" : "s"} • daily omen claimed` : "Daily Dawnseal already claimed • practice payout only"}`
            : folded
                ? "No penalty. The House will still be here."
                : "No reward this hand. Read the intent before spending the last Resolve.";

        overlay.add(
            this.add.text(
                GAME_WIDTH / 2,
                455,
                summary,
                {
                    fontFamily: FONT_BODY,
                    fontSize: "19px",
                    fontStyle: "bold",
                    color: "#d9cddd",
                    align: "center",
                    wordWrap: { width: 560 }
                }
            ).setOrigin(0.5, 0)
        );

        const home = this.add.image(GAME_WIDTH / 2, 730, "runeRoundBlue")
            .setScale(0.72)
            .setInteractive({ useHandCursor: true });
        const homeIcon = this.add.image(GAME_WIDTH / 2, 730, "runeTown")
            .setScale(0.39);
        const homeText = this.add.text(GAME_WIDTH / 2, 792, "RETURN TO FATEHOUSE", {
            fontFamily: FONT_TECH,
            fontSize: "14px",
            fontStyle: "bold",
            color: "#f6edff"
        }).setOrigin(0.5);
        overlay.add([home, homeIcon, homeText]);

        const again = this.add.image(GAME_WIDTH / 2, 915, "runeRoundRed")
            .setScale(0.58)
            .setInteractive({ useHandCursor: true });
        const againIcon = this.add.image(GAME_WIDTH / 2, 915, "runeHeavy")
            .setScale(0.32);
        const againText = this.add.text(GAME_WIDTH / 2, 968, "DEAL AGAIN", {
            fontFamily: FONT_TECH,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#f5e9f6"
        }).setOrigin(0.5);
        overlay.add([again, againIcon, againText]);

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
                    returnFromRunehand: true,
                    x: this.entryData.x,
                    y: this.entryData.y
                }
            );
        });

        again.on("pointerdown", () => {
            if (leaving) return;
            leaving = true;
            if (AudioDirector.releaseScene) {
                AudioDirector.releaseScene(this);
            } else {
                try { this.sound.stopAll(); } catch (_) {}
            }
            this.scene.restart(this.entryData);
        });
    }
}
