import { ConnectFourData } from '@devshareacademy/connect-four';
import { CUSTOM_GAME_EVENTS, GamePieceAddedEventData } from '../common';
import { Service } from './service';

export class LocalService extends Service {
  get isMyTurn(): boolean {
    return true;
  }

  get playersTurnText(): string {
    if (this._connectFour.playersTurn === ConnectFourData.PLAYER.ONE) {
      return 'Player Ones turn';
    }
    return 'Player Twos turn';
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);

      this._events.emit(CUSTOM_GAME_EVENTS.NEW_GAME_STARTED);
    });
  }

  public makeMove(col: number): void {
    const currentPlayer = this._connectFour.playersTurn;
    const coordinate = this._connectFour.makeMove(col);

    const data: GamePieceAddedEventData = {
      coordinate,
      player: currentPlayer,
    };
    this._events.emit(CUSTOM_GAME_EVENTS.GAME_PIECE_ADDED, data);
  }
}
