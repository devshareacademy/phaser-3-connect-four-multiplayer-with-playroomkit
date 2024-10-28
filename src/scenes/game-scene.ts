import * as Phaser from 'phaser';
import { ConnectFour, ConnectFourData } from '@devshareacademy/connect-four';
import { FRAME_SIZE, GAME_ASSETS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../common';

export class GameScene extends Phaser.Scene {
  #skipFadeIn!: boolean;
  #connectFour!: ConnectFour;
  #gamePiece!: Phaser.GameObjects.Image;
  #boardContainer!: Phaser.GameObjects.Container;
  #gamePieceContainer!: Phaser.GameObjects.Container;
  #currentPlayerTurnText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  public init(data: { skipFadeIn?: boolean }) {
    this.#connectFour = new ConnectFour();
    this.#skipFadeIn = data?.skipFadeIn || false;
  }

  public create(): void {
    // disable input by default
    this.input.enabled = false;

    // Create game objects
    this.#createGameText();
    this.#createBoard();
    this.#createInputColumns();
    this.#enableInput();

    if (!this.#skipFadeIn) {
      this.cameras.main.fadeIn(1000, 31, 50, 110);
    }
  }

  #createBoard(): void {
    this.#boardContainer = this.add.container(256 + FRAME_SIZE, 500, []).setDepth(1);
    this.#gamePieceContainer = this.add.container(256 + FRAME_SIZE, 500, []).setDepth(1);
    this.add.image(256, 120, GAME_ASSETS.BOARD).setOrigin(0).setDepth(2);
  }

  #createInputColumns(): void {
    const columnIndexKey = 'columnIndex';

    // create game piece for showing selected column
    this.#gamePiece = this.add.image(0, -FRAME_SIZE * 3.45, GAME_ASSETS.RED_PIECE).setDepth(1);
    this.#boardContainer.add(this.#gamePiece);

    // create the columns for the game and make them interactive
    for (let i = 0; i < 7; i++) {
      const x = i * FRAME_SIZE;
      const zone = this.add
        .zone(x, 0, FRAME_SIZE, GAME_HEIGHT + FRAME_SIZE / 2)
        .setData(columnIndexKey, i)
        .setInteractive();

      //const rect = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xff0000, 0.8);
      this.#boardContainer.add([zone]);

      zone.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (this.#connectFour.isGameOver) {
          return;
        }
        this.#gamePiece.setX((zone.getData(columnIndexKey) as number) * FRAME_SIZE);
      });

      zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.#connectFour.isGameOver) {
          return;
        }

        const currentPlayer = this.#connectFour.playersTurn;
        const coordinate = this.#connectFour.makeMove(zone.getData(columnIndexKey) as number);
        this.#addGamePiece(coordinate.row, coordinate.col, currentPlayer);
      });
    }
  }

  #addGamePiece(row: number, col: number, player: string): void {
    const gameAssetKey = player === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.RED_PIECE : GAME_ASSETS.YELLOW_PIECE;
    const nextPlayerAssetKey = player === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.YELLOW_PIECE : GAME_ASSETS.RED_PIECE;
    const x = col * FRAME_SIZE;
    const y = row * FRAME_SIZE + -FRAME_SIZE * 2 + 5;
    const piece = this.add.image(x, y, gameAssetKey).setDepth(1).setVisible(false);
    this.#boardContainer.add(piece);
    this.#gamePieceContainer.add(piece);

    this.input.enabled = false;
    this.#gamePiece.setX(x);

    this.tweens.add({
      targets: this.#gamePiece,
      y: y,
      ease: Phaser.Math.Easing.Sine.InOut,
      duration: row * 80,
      onComplete: () => {
        this.tweens.add({
          targets: this.#gamePiece,
          y: y - 5 * row - 20,
          ease: Phaser.Math.Easing.Sine.InOut,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            this.#gamePiece.setY(-FRAME_SIZE * 3.45);
            this.#gamePiece.setTexture(nextPlayerAssetKey);
            piece.setVisible(true);
            this.#checkForGameOver();
          },
        });
      },
    });
  }

  #checkForGameOver(): void {
    if (!this.#connectFour.isGameOver) {
      if (this.#connectFour.playersTurn === ConnectFourData.PLAYER.ONE) {
        this.#enableInput();
      } else {
        this.#disableInput();
      }
      return;
    }

    this.#enableInput();
    this.#gamePiece.setVisible(false);
    this.#currentPlayerTurnText.setText('Game over');

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, GAME_WIDTH - 40, 140, 0x1f326e, 0.8).setDepth(4);

    let winText = 'Draw';
    if (this.#connectFour.gameWinner) {
      winText = `Player ${this.#connectFour.gameWinner} Wins!`;
    }

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 20, winText, {
        fontSize: '64px',
        fontFamily: 'Dancing Script',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 40, 'Click to play again!', {
        fontFamily: 'Dancing Script',
        fontSize: '32px',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.#clearPieces();
    });
  }

  #createGameText(): void {
    const { width } = this.scale;
    this.#currentPlayerTurnText = this.add
      .text(width / 2, 50, '', {
        fontFamily: 'Dancing Script',
        fontSize: '64px',
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  #disableInput(): void {
    // this.input.enabled = false;
    this.input.enabled = true;
    this.#currentPlayerTurnText.setText('Player Twos turn');
  }

  #enableInput(): void {
    this.input.enabled = true;
    this.#currentPlayerTurnText.setText('Player Ones turn');
  }

  #clearPieces(): void {
    this.add.tween({
      targets: this.#gamePieceContainer,
      y: this.scale.height + FRAME_SIZE,
      duration: 1000,
      ease: Phaser.Math.Easing.Sine.InOut,
      onComplete: () => {
        this.scene.restart({ skipFadeIn: true });
      },
    });
  }
}
