/**
 * Contains common configuration, types, and functions that are used throughout our game.
 */

import { ConnectFourData } from '@devshareacademy/connect-four';

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

export const GAME_STATE = {
  WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
  PLAYING: 'PLAYING',
  FINISHED: 'FINISHED',
} as const;

export type GameState = keyof typeof GAME_STATE;

export const CUSTOM_GAME_EVENTS = {
  GAME_PIECE_ADDED: 'GAME_PIECE_ADDED',
  NEW_GAME_STARTED: 'NEW_GAME_STARTED',
  EXISTING_GAME: 'EXISTING_GAME',
} as const;

export type CustomGameEvents = keyof typeof CUSTOM_GAME_EVENTS;

export type GamePieceAddedEventData = {
  coordinate: ConnectFourData.Coordinate;
  player: ConnectFourData.Player;
};

export type ExistingGameData = {
  board: ConnectFourData.CellRange[];
};
