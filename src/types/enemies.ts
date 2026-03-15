export interface EnemyConfig {
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color?: number;
  bodyType?: "sphere" | "cube" | "icosahedron" | "cone" | "diamond";
  isFlying?: boolean;
  healRadius?: number;
  healAmount?: number;
  healTickRate?: number;
  splitOnDeath?: boolean;
  splitCount?: number;
  splitConfig?: EnemyConfig;
  isStealth?: boolean;
  stealthRevealRange?: number;
}

export interface EnemyInfo {
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  isFlying: boolean;
  isStealth: boolean;
  isRevealed: boolean;
  slowFactor: number;
  poisonStacks: number;
  color: number;
}
