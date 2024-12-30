import * as Phaser from 'phaser';
import { ConnectFour, ConnectFourData } from '@devshareacademy/connect-four';
import { GAME_STATE, GameState } from '../common';

export abstract class Service {
  protected _events: Phaser.Events.EventEmitter;
  protected _connectFour: ConnectFour;
  protected _gameState: GameState;
  protected _playerOneWinsText: string;
  protected _playerTwoWinsText: string;

  constructor() {
    this._events = new Phaser.Events.EventEmitter();
    this._connectFour = new ConnectFour();
    this._gameState = GAME_STATE.WAITING_FOR_PLAYERS;
    this._playerOneWinsText = 'Player One Wins!';
    this._playerTwoWinsText = 'Player Two Wins!';
  }

  get events(): Phaser.Events.EventEmitter {
    return this._events;
  }

  get isGameOver(): boolean {
    return this._connectFour.isGameOver;
  }

  get currentPlayer(): ConnectFourData.Player {
    return this._connectFour.playersTurn;
  }

  get gameState(): GameState {
    return this._gameState;
  }

  get gameWinnerText(): string {
    if (this._connectFour.gameWinner === undefined) {
      return 'Draw';
    }
    if (this._connectFour.gameWinner === ConnectFourData.PLAYER.ONE) {
      return this._playerOneWinsText;
    }
    return this._playerTwoWinsText;
  }

  abstract get playersTurnText(): string;

  abstract get isMyTurn(): boolean;

  public abstract connect(): Promise<boolean>;

  public abstract makeMove(col: number): void;
}
