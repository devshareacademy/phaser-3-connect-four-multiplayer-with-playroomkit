import * as Phaser from 'phaser';
import { WebFontFileLoader } from '../utils/web-font-file-loader';
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
    this.load.addFile(new WebFontFileLoader(this.load, ['Dancing Script:700']));
  }

  public create(): void {
    this.scene.start(SCENE_KEYS.TITLE);
  }
}
