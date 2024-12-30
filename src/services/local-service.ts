import { ConnectFourData } from '@devshareacademy/connect-four';
import { CUSTOM_GAME_EVENTS, GAME_STATE, GamePieceAddedEventData } from '../common';
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

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);

      // update local game state to show we have both players
      this._gameState = GAME_STATE.PLAYING;
      // emit event about new game starting since both players are local
      this._events.emit(CUSTOM_GAME_EVENTS.NEW_GAME_STARTED);
    });
  }

  public makeMove(col: number): void {
    const currentPlayer = this._connectFour.playersTurn;
    const coordinate = this._connectFour.makeMove(col);

    // emit event about game piece being added
    const data: GamePieceAddedEventData = {
      coordinate,
      player: currentPlayer,
    };
    this._events.emit(CUSTOM_GAME_EVENTS.GAME_PIECE_ADDED, data);
  }
}
