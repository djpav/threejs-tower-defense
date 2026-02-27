/** Abstract base for all UI components. Owns a root DOM element. */
export abstract class UIComponent {
  protected readonly root: HTMLElement;

  constructor(tag: keyof HTMLElementTagNameMap = "div") {
    this.root = document.createElement(tag);
  }

  getElement(): HTMLElement {
    return this.root;
  }

  show(): void {
    this.root.style.display = "";
  }

  hide(): void {
    this.root.style.display = "none";
  }

  dispose(): void {
    this.root.remove();
  }
}
