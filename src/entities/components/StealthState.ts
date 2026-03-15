import { MeshStandardMaterial } from "three";
import { HealthBar } from "./HealthBar";

export class StealthState {
  private _isRevealed = false;

  get isRevealed(): boolean {
    return this._isRevealed;
  }

  reveal(material: MeshStandardMaterial, healthBar: HealthBar, hasPoisonStacks: boolean): void {
    if (this._isRevealed) return;
    this._isRevealed = true;
    material.opacity = 1.0;
    healthBar.show();
    // Restore poison glow if poisoned
    if (hasPoisonStacks) {
      material.emissive.setHex(0x27ae60);
      material.emissiveIntensity = 0.3;
    }
  }

  conceal(material: MeshStandardMaterial, healthBar: HealthBar): void {
    if (!this._isRevealed) return;
    this._isRevealed = false;
    material.opacity = 0.15;
    healthBar.hide();
    // Hide poison glow while stealthed
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
  }
}
