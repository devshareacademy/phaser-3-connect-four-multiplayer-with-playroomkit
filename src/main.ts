/**
 * Main entry point for our web app, and is responsible for constructing and starting
 * our Phaser 3 game instance.
 */

import * as Phaser from 'phaser';
import { GameScene } from './scenes/game-scene';
import { PreLoadScene } from './scenes/preload-scene';
import { TitleScene } from './scenes/title-scene';
import { DemoScene } from './scenes/demo-scene';

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  pixelArt: true,
  scale: {
    parent: 'game-container',
    width: 1536,
    height: 960,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: '#1F326E',
  scene: [PreLoadScene, TitleScene, DemoScene, GameScene],
};

window.onload = () => {
  new Phaser.Game(gameConfig);
};
