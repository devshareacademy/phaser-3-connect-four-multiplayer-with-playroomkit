/**
 * Core Phaser 3 Scene that has the actual game play of our Connect Four Game.
 */

import * as Phaser from 'phaser';
import { ConnectFour, ConnectFourData, ConnectFourUtils } from '@devshareacademy/connect-four';
import {
  CUSTOM_GAME_EVENTS,
  ExistingGameData,
  FRAME_SIZE,
  GAME_ASSETS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GamePieceAddedEventData,
  SCENE_KEYS,
} from '../common';
import { Service } from '../services/service';
import { PlayroomService } from '../services/playroom-service';
// import { LocalService } from '../services/local-service';

export class GameScene extends Phaser.Scene {
  #service!: Service;
  #gamePiece!: Phaser.GameObjects.Image;
  #boardContainer!: Phaser.GameObjects.Container;
  #gamePieceContainer!: Phaser.GameObjects.Container;
  #currentPlayerTurnText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  public create(): void {
    // disable input by default
    this.input.enabled = false;

    // create game service
    // this.#service = new LocalService();
    this.#service = new PlayroomService();

    // Create game objects
    this.#createGameText();
    this.#createBoard();
    this.#createInputColumns();
    this.#registerEventListeners();

    this.cameras.main.fadeIn(1000, 31, 50, 110);
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, async () => {
      const connected = await this.#service.connect();
      if (!connected) {
        console.log('failed to connect to service');
        return;
      }
      console.log('connected to service');
    });
  }

  /**
   * Creates the core Phaser Game Object containers that represent our game board and the floating
   * game piece that players will drop into the board. We use containers here to make it easier
   * to position the individual game pieces into the correct spots on the board.
   */
  #createBoard(): void {
    this.#boardContainer = this.add.container(256 + FRAME_SIZE, 500, []).setDepth(1);
    this.#gamePieceContainer = this.add.container(256 + FRAME_SIZE, 500, []).setDepth(1);
    this.add.image(256, 120, GAME_ASSETS.BOARD).setOrigin(0).setDepth(2);
  }

  /**
   * Creates the Phaser Zone Game Objects that represent each of the columns a Connect Four game
   * piece can be dropped into. These game objects are not rendered in the game and they are just
   * used as an easy way to handle player input on a given column.
   */
  #createInputColumns(): void {
    const columnIndexKey = 'columnIndex';

    // create game piece for showing selected column
    this.#gamePiece = this.add
      .image(0, -FRAME_SIZE * 3.45, GAME_ASSETS.RED_PIECE)
      .setDepth(1)
      .setVisible(false);
    this.#boardContainer.add(this.#gamePiece);

    // create the columns for the game and make them interactive
    for (let i = 0; i < 7; i++) {
      const x = i * FRAME_SIZE;
      const zone = this.add
        .zone(x, 0, FRAME_SIZE, GAME_HEIGHT + FRAME_SIZE / 2)
        .setData(columnIndexKey, i)
        .setInteractive();

      // used for debugging the zone game objects
      // const rect = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xff0000, 0.8);
      this.#boardContainer.add([zone]);

      zone.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (this.#service.isGameOver) {
          return;
        }
        this.#gamePiece.setX((zone.getData(columnIndexKey) as number) * FRAME_SIZE);
      });

      zone.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.#service.isGameOver) {
          return;
        }

        // const currentPlayer = this.#connectFour.playersTurn;
        // const coordinate = this.#connectFour.makeMove(zone.getData(columnIndexKey) as number);
        // this.#addGamePiece(coordinate.row, coordinate.col, currentPlayer);
        this.input.enabled = false;
        this.#service.makeMove(zone.getData(columnIndexKey) as number);
      });
    }
  }

  /**
   * Creates and adds a new Phaser game object to the existing Connect Four board state. Once the game
   * piece is created, we animate dropping the game piece into the correct spot.
   */
  #addGamePiece(row: number, col: number, player: string): void {
    const nextPlayerAssetKey = player === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.YELLOW_PIECE : GAME_ASSETS.RED_PIECE;
    const piece = this.#createGamePiece(row, col, player, false);

    this.input.enabled = false;
    this.#gamePiece.setX(piece.x).setVisible(true);

    this.tweens.add({
      targets: this.#gamePiece,
      y: piece.y,
      ease: Phaser.Math.Easing.Sine.InOut,
      duration: row * 80,
      onComplete: () => {
        this.tweens.add({
          targets: this.#gamePiece,
          y: piece.y - 5 * row - 20,
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

  /**
   * Creates a Phaser image game object that represents one of the Connect Four game pieces. The pieces
   * are placed in a Phaser container game object to make it easier to position the game piece in the correct
   * row and col of the Connect Four board.
   */
  #createGamePiece(row: number, col: number, player: string, isVisible: boolean): Phaser.GameObjects.Image {
    const gameAssetKey = player === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.RED_PIECE : GAME_ASSETS.YELLOW_PIECE;
    const x = col * FRAME_SIZE;
    const y = row * FRAME_SIZE + -FRAME_SIZE * 2 + 5;
    const piece = this.add.image(x, y, gameAssetKey).setDepth(1).setVisible(isVisible);
    this.#boardContainer.add(piece);
    this.#gamePieceContainer.add(piece);
    return piece;
  }

  /**
   * After each move is made in the Connect Four game, this method is called to see if one of the players
   * has won the game. If so, we use a few Phaser game objects to notify the players who won the game, and
   * if no one has one, the game will continue to the next player.
   */
  #checkForGameOver(): void {
    if (!this.#service.isGameOver) {
      if (this.#service.isMyTurn) {
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

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 20, this.#service.gameWinnerText, {
        fontSize: '64px',
        fontFamily: GAME_ASSETS.DANCING_SCRIPT_FONT,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 40, 'Click to play again!', {
        fontFamily: GAME_ASSETS.DANCING_SCRIPT_FONT,
        fontSize: '32px',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.#clearPieces();
    });
  }

  /**
   * Creates the main Phaser text game object that notifies players of the state of the game.
   */
  #createGameText(): void {
    const { width } = this.scale;
    this.#currentPlayerTurnText = this.add
      .text(width / 2, 50, 'Waiting', {
        fontFamily: GAME_ASSETS.DANCING_SCRIPT_FONT,
        fontSize: '64px',
      })
      .setOrigin(0.5)
      .setDepth(5);
  }

  /**
   * Disables input handling on the Phaser game instance. Will become unlocked once it is this players turn.
   * Note: this currently does not lock the input since both players playing locally.
   */
  #disableInput(): void {
    this.input.enabled = false;
    this.#gamePiece.setVisible(false);
    this.#currentPlayerTurnText.setText(this.#service.playersTurnText);
  }

  /**
   * Re-enables the input handling on the Phaser game instance once the game is ready to begin, or when it is
   * this players turn.
   */
  #enableInput(): void {
    this.input.enabled = true;
    this.#gamePiece.setVisible(true);
    this.#currentPlayerTurnText.setText(this.#service.playersTurnText);
  }

  /**
   * Used to empty all of the game pieces out of the Connect Four board once the players are ready
   * to start a new game.
   */
  #clearPieces(): void {
    this.add.tween({
      targets: this.#gamePieceContainer,
      y: this.scale.height + FRAME_SIZE,
      duration: 1000,
      ease: Phaser.Math.Easing.Sine.InOut,
      onComplete: () => {
        this.cameras.main.fadeOut(1000);
        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          window.location.replace('/');
        });
      },
    });
  }

  #registerEventListeners(): void {
    this.#service.events.on(CUSTOM_GAME_EVENTS.GAME_PIECE_ADDED, (data: GamePieceAddedEventData) => {
      this.#addGamePiece(data.coordinate.row, data.coordinate.col, data.player);
    });

    this.#service.events.on(CUSTOM_GAME_EVENTS.NEW_GAME_STARTED, () => {
      this.#handleGameStarted();
    });

    this.#service.events.on(CUSTOM_GAME_EVENTS.EXISTING_GAME, (data: ExistingGameData) => {
      data.board.forEach((val, index) => {
        if (val === 0) {
          return;
        }
        const coordinate = ConnectFourUtils.get2DPosition(index);
        const player = val === 1 ? ConnectFourData.PLAYER.ONE : ConnectFourData.PLAYER.TWO;
        this.#createGamePiece(coordinate.row, coordinate.col, player, true);
      });

      const nextPlayerAssetKey =
        this.#service.currentPlayer === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.RED_PIECE : GAME_ASSETS.YELLOW_PIECE;
      this.#gamePiece.setTexture(nextPlayerAssetKey);

      this.#checkForGameOver();
    });
  }

  #handleGameStarted(): void {
    this.#currentPlayerTurnText.setText('');
    this.time.delayedCall(1000, () => {
      if (this.#service.isMyTurn) {
        this.#enableInput();
        return;
      }
      this.#disableInput();
    });
  }
}
