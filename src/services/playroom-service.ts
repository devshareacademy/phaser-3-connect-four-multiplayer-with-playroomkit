import * as Phaser from 'phaser';
import * as Playroom from 'playroomkit';
import { Service } from './service';
import { CUSTOM_GAME_EVENTS, ExistingGameData, GAME_STATE, GameState } from '../common';

const PLAYROOM_STATE_KEYS = {
  GAME_STATE: 'GAME_STATE',
  MOVES_MADE: 'MOVES_MADE',
  PLAYER_ONE_ID: 'PLAYER_ONE_ID',
  PLAYER_TWO_ID: 'PLAYER_TWO_ID',
} as const;

const CUSTOM_PLAYROOM_EVENTS = {
  PLAYER_CONNECTED: 'PLAYER_CONNECTED',
  NEW_GAME_STARTED: 'NEW_GAME_STARTED',
  EXISTING_GAME: 'EXISTING_GAME',
} as const;

type PlayerConnectedEventData = {
  playerId: string;
};

type ExistingGameEventData = {
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
      await this.#handlePlayerConnectedEvent(data);
    });

    // event is triggered once we have two players for a game, and we create a new game instance, will trigger for every player
    Playroom.RPC.register(CUSTOM_PLAYROOM_EVENTS.NEW_GAME_STARTED, async () => {
      await this.#handleNewGameStartedEvent();
    });

    // event is triggered when a player joins an existing Connect Four game, this could happen if a player disconnects and reconnects,
    // if a player leaves and new player joins
    Playroom.RPC.register(CUSTOM_PLAYROOM_EVENTS.EXISTING_GAME, async (data: ExistingGameEventData) => {
      await this.#handleExistingGameEvent(data);
    });

    // callback to allow us to run logic for when a player joins and leaves a room, allows us to setup and cleanup state
    // in our game
    Playroom.onPlayerJoin((player: Playroom.PlayerState) => {
      this.#handlePlayerJoined(player);
    });
  }

  #handlePlayerJoined(player: Playroom.PlayerState): void {
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
  }

  async #handlePlayerConnectedEvent(data: PlayerConnectedEventData): Promise<void> {
    return new Promise(() => {
      this._gameState = Playroom.getState(PLAYROOM_STATE_KEYS.GAME_STATE) as GameState;

      // if we don't have two players, or this player is not host, there is nothing else to do
      if (this.#playerIds.size !== 2 || !Playroom.isHost()) {
        return;
      }

      console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.PLAYER_CONNECTED} called with ${data.playerId}`);
      const playerIds = Array.from(this.#playerIds);
      console.log(playerIds, this.gameState);

      // starting a new connect four game since we have two players
      if (this.gameState === GAME_STATE.WAITING_FOR_PLAYERS) {
        const firstPlayerId = Phaser.Math.RND.pick(playerIds);
        // const firstPlayerId = playerIds.filter((id) => id !== Playroom.me().id)[0];
        const otherPlayerId = playerIds.filter((id) => id !== firstPlayerId)[0];
        console.log('first player id: ', firstPlayerId);
        console.log('other player id: ', otherPlayerId);
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID, firstPlayerId);
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID, playerIds.filter((id) => id !== firstPlayerId)[0]);
        Playroom.setState(PLAYROOM_STATE_KEYS.GAME_STATE, GAME_STATE.PLAYING);
        // notify all players that game is starting
        Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.NEW_GAME_STARTED, Playroom.RPC.Mode.ALL).catch((error) => {
          console.log(error);
        });
        return;
      }

      // existing game state found, either existing player rejoined or a new player replaced an old player, so we need to update ids
      console.log(
        'Player ids before update: ',
        Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID),
        Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID),
      );

      if (Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID) === '') {
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID, data.playerId);
      } else if (Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID) === '') {
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID, data.playerId);
      }

      console.log(
        'Player ids after update: ',
        Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID),
        Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID),
      );
      const existingGameData: ExistingGameEventData = {
        playerId: data.playerId,
      };
      // notify all players that there is an existing game
      Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.EXISTING_GAME, existingGameData, Playroom.RPC.Mode.ALL).catch(
        (error) => {
          console.log(error);
        },
      );
    });
  }

  async #handleNewGameStartedEvent(): Promise<void> {
    return new Promise(() => {
      console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.NEW_GAME_STARTED} called`);
      this._gameState = GAME_STATE.PLAYING;
      this._events.emit(CUSTOM_GAME_EVENTS.NEW_GAME_STARTED);
    });
  }

  async #handleExistingGameEvent(data: ExistingGameEventData): Promise<void> {
    return new Promise(() => {
      console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.EXISTING_GAME} called`, data.playerId);
      if (data.playerId !== Playroom.me().id) {
        return;
      }
      console.log('updating local connect four state');
      // grab existing moves from game state and update local instance of game
      const existingPlayerMoves = Playroom.getState(PLAYROOM_STATE_KEYS.MOVES_MADE) as number[];
      existingPlayerMoves.forEach((move) => {
        this._connectFour.makeMove(move);
      });
      const existingGameData: ExistingGameData = {
        board: this._connectFour.board,
      };
      this._events.emit(CUSTOM_GAME_EVENTS.EXISTING_GAME, existingGameData);
    });
  }
}
