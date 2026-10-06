// ============================================================
// VIBE GAME BASE
// Phaser 3 + plain JavaScript
// ============================================================

const GAME_WIDTH = 720;
const GAME_HEIGHT = 1280;


// ============================================================
// MAIN SCENE
// ============================================================

class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
    }


    // --------------------------------------------------------
    // LOAD ASSETS HERE
    // --------------------------------------------------------

    preload() {

        /*
        EXAMPLES:

        this.load.image(
            "player",
            "assets/images/player.png"
        );

        this.load.image(
            "background",
            "assets/images/background.png"
        );

        this.load.audio(
            "coinSound",
            "assets/audio/coin.mp3"
        );

        this.load.spritesheet(
            "character",
            "assets/images/character.png",
            {
                frameWidth: 128,
                frameHeight: 128
            }
        );
        */

    }


    // --------------------------------------------------------
    // CREATE GAME OBJECTS
    // --------------------------------------------------------

    create() {

        // Background
        this.cameras.main.setBackgroundColor("#20242b");


        // ----------------------------------------------------
        // TEMP PLAYER
        // Delete this when you have actual assets.
        // ----------------------------------------------------

        this.player = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT * 0.75,
            120,
            120,
            0x00ff88
        );


        // ----------------------------------------------------
        // TITLE / DEBUG TEXT
        // ----------------------------------------------------

        this.titleText = this.add.text(
            GAME_WIDTH / 2,
            100,
            "VIBE GAME",
            {
                fontFamily: "Arial",
                fontSize: "64px",
                fontStyle: "bold",
                color: "#ffffff"
            }
        );

        this.titleText.setOrigin(0.5);


        this.helpText = this.add.text(
            GAME_WIDTH / 2,
            180,
            "Drag anywhere",
            {
                fontFamily: "Arial",
                fontSize: "32px",
                color: "#aaaaaa"
            }
        );

        this.helpText.setOrigin(0.5);


        // ----------------------------------------------------
        // INPUT
        // ----------------------------------------------------

        this.input.on("pointerdown", (pointer) => {

            this.movePlayer(pointer);

        });


        this.input.on("pointermove", (pointer) => {

            if (pointer.isDown) {
                this.movePlayer(pointer);
            }

        });


        // ----------------------------------------------------
        // GAME STATE
        // ----------------------------------------------------

        this.score = 0;

    }


    // --------------------------------------------------------
    // RUNS EVERY FRAME
    // --------------------------------------------------------

    update(time, delta) {

        // Put continuous game logic here.

    }


    // --------------------------------------------------------
    // PLAYER MOVEMENT
    // --------------------------------------------------------

    movePlayer(pointer) {

        // Converts screen pointer coordinates into game coordinates.

        const worldPoint = pointer.positionToCamera(
            this.cameras.main
        );

        this.player.x = Phaser.Math.Clamp(
            worldPoint.x,
            60,
            GAME_WIDTH - 60
        );

    }

}



// ============================================================
// PHASER CONFIG
// ============================================================

const config = {

    type: Phaser.AUTO,

    parent: "game-container",

    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    backgroundColor: "#20242b",

    scale: {

        mode: Phaser.Scale.FIT,

        autoCenter: Phaser.Scale.CENTER_BOTH,

        width: GAME_WIDTH,
        height: GAME_HEIGHT

    },

    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
    },

    input: {
        activePointers: 3
    },

    scene: [
        GameScene
    ]

};



// ============================================================
// START GAME
// ============================================================

const game = new Phaser.Game(config);