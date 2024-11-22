/**
 * This scene is launched automatically from our Title Scene, and is used for simulating
 * a game of Connect Four being played.
 */

import * as Phaser from 'phaser';
import { ConnectFour, ConnectFourData } from '@devshareacademy/connect-four';
import { FRAME_SIZE, GAME_ASSETS, SCENE_KEYS, sleep } from '../common';

export class DemoScene extends Phaser.Scene {
  #connectFour!: ConnectFour;
  #gamePiece!: Phaser.GameObjects.Image;
  #boardContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENE_KEYS.DEMO });
  }

  public init() {
    this.#connectFour = new ConnectFour();
  }

  public create(): void {
    // disable input by default
    this.input.enabled = false;
    // Create game objects
    this.#boardContainer = this.add.container(0, 0, []);
    this.#createBoard();

    this.cameras.main.fadeIn(1000, 31, 50, 110).setAlpha(0.8);
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
      void this.#createMockGame();
    });
  }

  #createBoard(): void {
    this.#boardContainer = this.add.container(256 + FRAME_SIZE, 500, []).setDepth(1);
    this.add.image(256, 120, GAME_ASSETS.BOARD).setOrigin(0).setDepth(2);
  }

  async #addGamePiece(row: number, col: number, player: string): Promise<void> {
    return new Promise((resolve) => {
      const gameAssetKey = player === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.RED_PIECE : GAME_ASSETS.YELLOW_PIECE;
      const x = col * FRAME_SIZE;
      const y = row * FRAME_SIZE + -FRAME_SIZE * 2 + 5;
      const piece = this.add.image(x, y, gameAssetKey).setDepth(1).setVisible(false);
      this.#boardContainer.add(piece);

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
              this.#gamePiece.setVisible(false);
              piece.setVisible(true);
              resolve();
            },
          });
        },
      });
    });
  }

  async #createMockGame(): Promise<void> {
    // create game piece for showing selected column
    this.#gamePiece = this.add.image(0, -FRAME_SIZE * 3.45, GAME_ASSETS.RED_PIECE).setDepth(1);
    this.#boardContainer.add(this.#gamePiece);

    const movesToMake = [0, 1, 0, 0, 1, 2, 2, 6, 4, 1, 3, 3, 2, 4, 2, 2, 5, 4, 5, 1, 2, 3, 3];

    for (const move of movesToMake) {
      const currentPlayer = this.#connectFour.playersTurn;
      const nextPlayerAssetKey =
        currentPlayer === ConnectFourData.PLAYER.ONE ? GAME_ASSETS.RED_PIECE : GAME_ASSETS.YELLOW_PIECE;
      this.#gamePiece
        .setPosition(move * FRAME_SIZE, -FRAME_SIZE * 3.45)
        .setTexture(nextPlayerAssetKey)
        .setVisible(true);

      const coordinate = this.#connectFour.makeMove(move);
      await this.#addGamePiece(coordinate.row, coordinate.col, currentPlayer);
      await sleep(this, 800);
    }

    await sleep(this, 500);
    this.cameras.main.fadeOut(1000, 31, 50, 110);
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart();
    });
  }
}
