export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  level: number;
  levelName: string;
  isGameOver: boolean;
  isWin: boolean;
}
