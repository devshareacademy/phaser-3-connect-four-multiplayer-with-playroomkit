/**
 * Responsible for loading all game assets that are required for our other Phaser Scenes.
 */

import * as Phaser from 'phaser';
import { GAME_ASSETS, SCENE_KEYS } from '../common';

export class PreLoadScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  public preload(): void {
    this.load.setPath('assets/images');
    this.load.image(GAME_ASSETS.BOARD, 'board.png');
    this.load.image(GAME_ASSETS.RED_PIECE, 'red.png');
    this.load.image(GAME_ASSETS.YELLOW_PIECE, 'yellow.png');
    this.load.setPath('assets/fonts');
    this.load.font(GAME_ASSETS.DANCING_SCRIPT_FONT, 'Dancing_Script/DancingScript-Regular.ttf', 'truetype');
  }

  public create(): void {
    this.scene.start(SCENE_KEYS.GAME);
  }
}
