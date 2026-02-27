import "./style.css";
import { Game } from "@/core/Game";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas element #game-canvas not found");

const game = new Game(canvas);
game.start();

// HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose());
}
