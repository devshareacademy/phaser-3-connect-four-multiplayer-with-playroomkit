import { Service } from './service';
import { CUSTOM_GAME_EVENTS, GamePieceAddedEventData } from '../common';

export class LocalService extends Service {
  constructor() {
    super();
  }

  get isMyTurn(): boolean {
    return true;
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);

      // emit event about new game starting since both players are local
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

    // emit event about game piece being added
    this._events.emit(CUSTOM_GAME_EVENTS.GAME_PIECE_ADDED, data);
  }
}
