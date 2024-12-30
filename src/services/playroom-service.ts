import * as Phaser from 'phaser';
import * as Playroom from 'playroomkit';
import { Service } from './service';
import { CUSTOM_GAME_EVENTS, ExistingGameData, GAME_STATE, GameState } from '../common';
import { ConnectFourData } from '@devshareacademy/connect-four';

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
  GAME_PIECE_ADDED: 'GAME_PIECE_ADDED',
  MOVE_MADE: 'MOVE_MADE',
} as const;

type PlayerConnectedEventData = {
  playerId: string;
};

type ExistingGameEventData = {
  playerId: string;
};

type GamePieceAddedEventData = {
  coordinate: ConnectFourData.Coordinate;
  player: ConnectFourData.Player;
};

export type MoveMadeEventData = {
  col: number;
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
    const isFirstPlayer = Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID) === Playroom.me().id;
    const isSecondPlayer = Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID) === Playroom.me().id;
    console.log(
      `isMyTurn called, firstPlayer: ${isFirstPlayer.toString()}, secondPlayer: ${isSecondPlayer.toString()}`,
    );
    if (this._connectFour.playersTurn === ConnectFourData.PLAYER.ONE && isFirstPlayer) {
      return true;
    }
    if (this._connectFour.playersTurn === ConnectFourData.PLAYER.TWO && isSecondPlayer) {
      return true;
    }
    return false;
  }

  get gameWinnerText(): string {
    if (this._connectFour.gameWinner === undefined) {
      return 'Draw';
    }
    const isFirstPlayer = Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID) === Playroom.me().id;
    const isSecondPlayer = Playroom.getState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID) === Playroom.me().id;
    if (
      (this._connectFour.gameWinner === ConnectFourData.PLAYER.ONE && isFirstPlayer) ||
      (this._connectFour.gameWinner === ConnectFourData.PLAYER.TWO && isSecondPlayer)
    ) {
      return 'You Win!';
    }

    return 'Opponent Won';
  }

  get playersTurnText(): string {
    if (!this.isMyTurn) {
      return 'Opponents turn';
    }
    return 'Your turn';
  }

  public async connect(): Promise<boolean> {
    try {
      this.#registerEventListeners();

      await Playroom.insertCoin({
        maxPlayersPerRoom: 2,
        defaultStates: {
          [PLAYROOM_STATE_KEYS.GAME_STATE]: GAME_STATE.WAITING_FOR_PLAYERS,
          [PLAYROOM_STATE_KEYS.PLAYER_ONE_ID]: '',
          [PLAYROOM_STATE_KEYS.PLAYER_TWO_ID]: '',
          [PLAYROOM_STATE_KEYS.MOVES_MADE]: [],
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
    if (!this.isMyTurn) {
      return;
    }

    // if we are the host player, update game state and notify other players
    if (Playroom.isHost()) {
      this.#handleMoveMadeEvent(col);
      return;
    }

    // if we are not the host, emit event so host can update game state and update all players
    const data: MoveMadeEventData = {
      col,
    };
    Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.MOVE_MADE, data, Playroom.RPC.Mode.HOST).catch((error) => {
      console.log(error);
    });
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

    // event is triggered when a new game piece is added to a connect four game, will trigger for every player
    Playroom.RPC.register(CUSTOM_PLAYROOM_EVENTS.GAME_PIECE_ADDED, async (data: GamePieceAddedEventData) => {
      await this.#handleGamePieceAddedEvent(data);
    });

    // register listener for moves made by other players, will trigger just for the host player
    Playroom.RPC.register(CUSTOM_PLAYROOM_EVENTS.MOVE_MADE, async (data: MoveMadeEventData) => {
      return new Promise(() => {
        console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.MOVE_MADE} called`);
        this.#handleMoveMadeEvent(data.col);
      });
    });

    // callback to allow us to run logic for when a player joins and leaves a room, allows us to setup and cleanup state
    // in our game
    Playroom.onPlayerJoin((player: Playroom.PlayerState) => {
      this.#handlePlayerJoined(player);
    });
  }

  /**
   * When a player joins our game, we can be in a variety of states:
   *   1. the main player joined and started the game, and is now waiting for player two
   *   2. both players joined the room, and the game state shows we are playing the game
   *   3. a player reconnects, so the game is already in progress
   *
   * To account for this, we only want to start a connect four game once we have 2 players, either join
   * at the same time, or one joins and then a second joins. Once we have both players, we should update
   * our game state, and notify our Phaser Game so we can render out that the players can start playing.
   *
   * If a player leaves and comes back, or a different player joins, we need to emit a different event
   * since the game is already in progress. This will let us notify the Phaser Game so we can update
   * the local state to match the existing game state.
   */
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
      if (this._gameState === GAME_STATE.WAITING_FOR_PLAYERS) {
        const firstPlayerId = Phaser.Math.RND.pick(playerIds);
        const otherPlayerId = playerIds.filter((id) => id !== firstPlayerId)[0];
        console.log('first player id: ', firstPlayerId);
        console.log('other player id: ', otherPlayerId);
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_ONE_ID, firstPlayerId);
        Playroom.setState(PLAYROOM_STATE_KEYS.PLAYER_TWO_ID, otherPlayerId);
        Playroom.setState(PLAYROOM_STATE_KEYS.GAME_STATE, GAME_STATE.PLAYING);
        // notify all players that game is starting
        Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.NEW_GAME_STARTED, undefined, Playroom.RPC.Mode.ALL).catch((error) => {
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
      console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.EXISTING_GAME} called with player id ${data.playerId}`);
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

  #handleMoveMadeEvent(col: number): void {
    const currentPlayer = this._connectFour.playersTurn;
    const coordinate = this._connectFour.makeMove(col);
    Playroom.setState(PLAYROOM_STATE_KEYS.MOVES_MADE, this._connectFour.moveHistory);

    const data: GamePieceAddedEventData = {
      coordinate,
      player: currentPlayer,
    };
    Playroom.RPC.call(CUSTOM_PLAYROOM_EVENTS.GAME_PIECE_ADDED, data, Playroom.RPC.Mode.ALL).catch((error) => {
      console.log(error);
    });
  }

  async #handleGamePieceAddedEvent(data: GamePieceAddedEventData): Promise<void> {
    return new Promise(() => {
      console.log(`RPC: ${CUSTOM_PLAYROOM_EVENTS.GAME_PIECE_ADDED} called`);
      if (!Playroom.isHost()) {
        this._connectFour.makeMove(data.coordinate.col);
      }
      this._events.emit(CUSTOM_GAME_EVENTS.GAME_PIECE_ADDED, data);
    });
  }
}
