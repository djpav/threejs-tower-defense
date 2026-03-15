import { CellType, MapConfig, CustomMapFile } from "@/types";

const CURRENT_VERSION = 1;
const CELL_SIZE = 1;
const CELL_HEIGHT = 0.2;

export function exportToJSON(
  grid: CellType[][],
  rows: number,
  cols: number,
  name: string,
  startingGold: number,
  startingLives: number,
): CustomMapFile {
  return {
    version: CURRENT_VERSION,
    name,
    rows,
    cols,
    grid: grid.map((row) => row.map((cell) => cell as string)),
    startingGold,
    startingLives,
  };
}

export function download(mapFile: CustomMapFile): void {
  const json = JSON.stringify(mapFile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${mapFile.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function upload(): Promise<CustomMapFile> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as CustomMapFile;
          if (data.version !== CURRENT_VERSION) {
            reject(new Error(`Unsupported map version: ${data.version}`));
            return;
          }
          if (!data.grid || !data.rows || !data.cols) {
            reject(new Error("Invalid map file: missing grid, rows, or cols"));
            return;
          }
          resolve(data);
        } catch (e) {
          reject(new Error("Failed to parse map file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });

    input.click();
  });
}

export function toMapConfig(mapFile: CustomMapFile): MapConfig {
  const grid: CellType[][] = mapFile.grid.map((row) =>
    row.map((cell) => cell as CellType),
  );
  return {
    rows: mapFile.rows,
    cols: mapFile.cols,
    cellSize: CELL_SIZE,
    cellHeight: CELL_HEIGHT,
    grid,
  };
}
