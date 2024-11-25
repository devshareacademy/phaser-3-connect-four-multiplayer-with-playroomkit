import * as Playroom from 'playroomkit';
import { Service } from './service';
import { GAME_STATE, GameState } from '../common';

const PLAYROOM_STATE_KEYS = {
  GAME_STATE: 'GAME_STATE',
  MOVES_MADE: 'MOVES_MADE',
  PLAYER_ONE_ID: 'PLAYER_ONE_ID',
  PLAYER_TWO_ID: 'PLAYER_TWO_ID',
} as const;

const CUSTOM_PLAYROOM_EVENTS = {
  PLAYER_CONNECTED: 'PLAYER_CONNECTED',
} as const;

export type PlayerConnectedEventData = {
  playerId: string;
};

export class PlayroomService extends Service {
  #playerIds: Set<string>;
  #playerStates: { [key: string]: Playroom.PlayerState };

  constructor() {
    super();
    this.#playerIds = new Set<string>();
    this.#playerStates = {};
  }

  get isMyTurn(): boolean {
    return true;
  }

  public async connect(): Promise<boolean> {
    try {
      this.#registerEventListeners();

      await Playroom.insertCoin({
        streamMode: false,
        enableBots: false,
        matchmaking: false,
        maxPlayersPerRoom: 2,
        skipLobby: false,
        defaultStates: {
          [PLAYROOM_STATE_KEYS.MOVES_MADE]: [],
          [PLAYROOM_STATE_KEYS.PLAYER_ONE_ID]: '',
          [PLAYROOM_STATE_KEYS.PLAYER_TWO_ID]: '',
          [PLAYROOM_STATE_KEYS.GAME_STATE]: GAME_STATE.WAITING_FOR_PLAYERS,
        },
      });

      // after insertCoin resolves, this player is now connected to a Playroom kit Room, and so we should have player profile information
      const playerConnectedData: PlayerConnectedEventData = {
        playerId: Playroom.me().id,
      };
      Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.PLAYER_CONNECTED, playerConnectedData, Playroom.RPC.Mode.ALL).catch(
        (error) => {
          console.log(error);
        },
      );

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  public makeMove(col: number): void {
    // TODO
  }

  #registerEventListeners(): void {
    // event is triggered once a new player has connected to the Playroom Room, will trigger for every player
    Playroom.RPC.register(CUSTOM_PLAYROOM_EVENTS.PLAYER_CONNECTED, async (data: PlayerConnectedEventData) => {
      return new Promise(() => {
        this._gameState = Playroom.getState(PLAYROOM_STATE_KEYS.GAME_STATE) as GameState;

        console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.PLAYER_CONNECTED} called with ${data.playerId}`);
        const playerIds = Array.from(this.#playerIds);
        console.log(playerIds, this.gameState);
      });
    });

    // callback to allow us to run logic for when a player joins and leaves a room, allows us to setup and cleanup state
    // in our game
    Playroom.onPlayerJoin((player) => {
      // in case of duplicate events
      if (this.#playerStates[player.id]) {
        return;
      }

      console.log(`player joined: ${player.id}`);
      this.#playerIds.add(player.id);
      this.#playerStates[player.id] = player;
      console.log(`existing players for this room`, Array.from(this.#playerIds));

      player.onQuit((playerThatLeft) => {
        console.log(`player left: ${playerThatLeft.id}`);
        delete this.#playerStates[playerThatLeft.id];
        this.#playerIds.delete(playerThatLeft.id);

        // when player leaves, we need make sure we assign next player to that players spot (1 or 2)
        if (playerThatLeft.id === Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID)) {
          Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID, '');
          return;
        }
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID, '');
      });
    });
  }
}
