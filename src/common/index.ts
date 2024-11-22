/**
 * Contains common configuration, types, and functions that are used throughout our game.
 */

export const GAME_ASSETS = {
  RED_PIECE: 'RED_PIECE',
  YELLOW_PIECE: 'YELLOW_PIECE',
  BOARD: 'BOARD',
  DANCING_SCRIPT_FONT: 'DANCING_SCRIPT_FONT',
} as const;

export const SCENE_KEYS = {
  PRELOAD: 'PRELOAD',
  TITLE: 'TITLE',
  DEMO: 'DEMO',
  GAME: 'GAME',
};

export const FRAME_SIZE = 128;
export const GAME_HEIGHT = FRAME_SIZE * 7;
export const GAME_WIDTH = FRAME_SIZE * 7;

export function sleep(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, () => {
      resolve();
    });
  });
}
