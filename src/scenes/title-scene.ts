/**
 * After all of the assets for our game our loaded, this scene is shown to the player.
 * The title scene launches the demo scene which has a game of Connect Four being played
 * in the background. Once the player is ready to start the game, if they click on this scene
 * this will stop the demo and launch the Game Scene.
 */

import * as Phaser from 'phaser';
import { GAME_ASSETS, SCENE_KEYS } from '../common';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  public create(): void {
    this.scene.launch(SCENE_KEYS.DEMO).sendToBack(SCENE_KEYS.DEMO);

    // disable input by default
    this.input.enabled = false;

    const titleText = this.add
      .text(this.scale.width / 2, 350, 'Connect Four', {
        fontFamily: GAME_ASSETS.DANCING_SCRIPT_FONT,
        fontSize: '200px',
      })
      .setOrigin(0.5);

    const clickToStartText = this.add
      .text(this.scale.width / 2, 700, 'Click to play', {
        fontFamily: GAME_ASSETS.DANCING_SCRIPT_FONT,
        fontSize: '80px',
      })
      .setAlpha(0)
      .setOrigin(0.5);

    this.add
      .timeline([
        {
          run: () => {
            titleText.setScale(0);
          },
        },
        {
          at: 100,
          tween: {
            targets: titleText,
            scaleY: 1.2,
            scaleX: 1.2,
            duration: 1500,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
        },
        {
          at: 1500,
          tween: {
            targets: titleText,
            scaleY: 1,
            scaleX: 1,
            duration: 400,
            ease: Phaser.Math.Easing.Sine.InOut,
          },
        },
        {
          at: 2000,
          run: () => {
            this.input.enabled = true;
          },
        },
        {
          at: 2000,
          tween: {
            targets: clickToStartText,
            alpha: {
              start: 0,
              to: 1,
              from: 0.2,
            },
            duration: 1200,
            ease: Phaser.Math.Easing.Sine.InOut,
            yoyo: true,
            repeat: -1,
          },
        },
      ])
      .play();

    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      // launch the lobby to allow players to join, and once ready go to game scene
      // await Playroom.insertCoin({ streamMode: false, enableBots: false, matchmaking: false, maxPlayersPerRoom: 2 });
      this.cameras.main.fadeOut(1000, 31, 50, 110);
      this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        // stop demo scene
        this.scene.stop(SCENE_KEYS.DEMO);
        this.scene.start(SCENE_KEYS.GAME);
      });
    });
  }
}
