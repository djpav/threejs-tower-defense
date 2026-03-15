import { UIComponent } from "@/ui/UIComponent";

export type BuilderTool = "path" | "spawn" | "goal" | "erase";

export interface BuilderToolbarCallbacks {
  onResize: (rows: number, cols: number) => void;
  onValidate: () => void;
  onExport: () => void;
  onImport: () => void;
  onPlay: () => void;
  onBack: () => void;
  onClear: () => void;
  onShowPath: () => void;
}

export class BuilderToolbar extends UIComponent {
  private activeTool: BuilderTool = "path";
  private toolButtons: HTMLButtonElement[] = [];
  private validationMsg: HTMLDivElement;
  private rowsInput: HTMLInputElement;
  private colsInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private callbacks: BuilderToolbarCallbacks;
  private cleanupFns: (() => void)[] = [];

  constructor(callbacks: BuilderToolbarCallbacks) {
    super("div");
    this.callbacks = callbacks;
    this.root.className = "builder-toolbar";

    // ── Tools section ──
    const toolsGroup = this.createSection("Tools");
    const tools: { tool: BuilderTool; label: string }[] = [
      { tool: "path", label: "Path" },
      { tool: "spawn", label: "Spawn" },
      { tool: "goal", label: "Goal" },
      { tool: "erase", label: "Erase" },
    ];

    for (const { tool, label } of tools) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.className = "builder-tool-btn";
      btn.dataset.active = (tool === this.activeTool).toString();

      const onClick = () => this.setActiveTool(tool);
      btn.addEventListener("click", onClick);
      this.cleanupFns.push(() => btn.removeEventListener("click", onClick));

      this.toolButtons.push(btn);
      toolsGroup.appendChild(btn);
    }

    // ── Grid size section ──
    const sizeGroup = this.createSection("Grid");

    const rowsLabel = document.createElement("label");
    rowsLabel.className = "builder-label";
    rowsLabel.textContent = "Rows:";
    this.rowsInput = document.createElement("input");
    this.rowsInput.type = "number";
    this.rowsInput.min = "6";
    this.rowsInput.max = "20";
    this.rowsInput.value = "12";
    this.rowsInput.className = "builder-input";

    const colsLabel = document.createElement("label");
    colsLabel.className = "builder-label";
    colsLabel.textContent = "Cols:";
    this.colsInput = document.createElement("input");
    this.colsInput.type = "number";
    this.colsInput.min = "8";
    this.colsInput.max = "26";
    this.colsInput.value = "16";
    this.colsInput.className = "builder-input";

    const resizeBtn = document.createElement("button");
    resizeBtn.textContent = "Resize";
    resizeBtn.className = "builder-action-btn";
    const onResize = () => {
      const rows = Math.max(6, Math.min(20, parseInt(this.rowsInput.value) || 12));
      const cols = Math.max(8, Math.min(26, parseInt(this.colsInput.value) || 16));
      this.rowsInput.value = rows.toString();
      this.colsInput.value = cols.toString();
      callbacks.onResize(rows, cols);
    };
    resizeBtn.addEventListener("click", onResize);
    this.cleanupFns.push(() => resizeBtn.removeEventListener("click", onResize));

    sizeGroup.append(rowsLabel, this.rowsInput, colsLabel, this.colsInput, resizeBtn);

    // ── Actions section ──
    const actionsGroup = this.createSection("Actions");

    const clearBtn = this.createActionBtn("Clear", () => callbacks.onClear());
    const validateBtn = this.createActionBtn("Validate", () => callbacks.onValidate());
    const showPathBtn = this.createActionBtn("Show Path", () => {
      callbacks.onShowPath();
      const isActive = showPathBtn.dataset.active === "true";
      showPathBtn.dataset.active = (!isActive).toString();
    });
    showPathBtn.classList.add("builder-showpath-btn");
    showPathBtn.dataset.active = "false";
    const exportBtn = this.createActionBtn("Export", () => callbacks.onExport());
    const importBtn = this.createActionBtn("Import", () => callbacks.onImport());

    this.playBtn = document.createElement("button");
    this.playBtn.textContent = "Play";
    this.playBtn.className = "builder-action-btn builder-play-btn";
    const onPlay = () => callbacks.onPlay();
    this.playBtn.addEventListener("click", onPlay);
    this.cleanupFns.push(() => this.playBtn.removeEventListener("click", onPlay));

    const backBtn = this.createActionBtn("Back", () => callbacks.onBack());
    backBtn.classList.add("builder-back-btn");

    actionsGroup.append(clearBtn, validateBtn, showPathBtn, exportBtn, importBtn, this.playBtn, backBtn);

    // ── Validation message ──
    this.validationMsg = document.createElement("div");
    this.validationMsg.className = "builder-validation";

    this.root.append(toolsGroup, sizeGroup, actionsGroup, this.validationMsg);
    document.body.appendChild(this.root);
  }

  private createSection(label: string): HTMLDivElement {
    const section = document.createElement("div");
    section.className = "builder-section";
    const heading = document.createElement("span");
    heading.className = "builder-section-label";
    heading.textContent = label;
    section.appendChild(heading);
    return section;
  }

  private createActionBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = "builder-action-btn";
    btn.addEventListener("click", onClick);
    this.cleanupFns.push(() => btn.removeEventListener("click", onClick));
    return btn;
  }

  getActiveTool(): BuilderTool {
    return this.activeTool;
  }

  setActiveTool(tool: BuilderTool): void {
    this.activeTool = tool;
    const toolNames: BuilderTool[] = ["path", "spawn", "goal", "erase"];
    this.toolButtons.forEach((btn, i) => {
      btn.dataset.active = (toolNames[i] === tool).toString();
    });
  }

  showValidation(valid: boolean, errors: string[]): void {
    if (valid) {
      this.validationMsg.textContent = "Valid!";
      this.validationMsg.className = "builder-validation builder-valid";
    } else {
      this.validationMsg.textContent = errors.join(" | ");
      this.validationMsg.className = "builder-validation builder-invalid";
    }
    // Auto-hide after 4 seconds
    setTimeout(() => {
      this.validationMsg.textContent = "";
      this.validationMsg.className = "builder-validation";
    }, 4000);
  }

  setGridSize(rows: number, cols: number): void {
    this.rowsInput.value = rows.toString();
    this.colsInput.value = cols.toString();
  }

  override dispose(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];
    super.dispose();
  }
}
