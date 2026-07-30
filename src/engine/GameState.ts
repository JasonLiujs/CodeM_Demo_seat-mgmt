/**
 * GameState 游戏状态：集中管理玩家 HP、波次、弹药、击杀数与 GameOver。
 *
 * 职责：
 * - 管理玩家 HP（初始 MAX_HP），受击扣减，HP<=0 触发 GameOver
 * - 暴露状态快照供 HUD 读取（hp/wave/ammo/kills/gameOver）
 * - 提供事件回调：onHpChange / onGameOver / onStateChange
 * - 不依赖 DOM，纯逻辑便于测试
 *
 * 对外接口约定：
 * - new GameState(options?)：可选初始 HP
 * - state.takeDamage(amount)：受击扣 HP，返回是否触发 GameOver
 * - state.heal(amount)：恢复 HP（不超过上限）
 * - state.setWave(wave)：设置当前波次
 * - state.setAmmo(snapshot)：同步弹药状态
 * - state.addKill()：击杀数 +1
 * - state.getSnapshot()：返回状态快照
 * - state.isGameOver()：是否已 GameOver
 * - state.reset()：重置为初始状态
 * - state.onHpChange / onGameOver / onStateChange：事件回调
 *
 * 后续需求接入方式：
 * - Game 构造时创建 GameState，将各模块回调接入
 * - HUD 通过 state.onStateChange 订阅状态变化刷新
 */
export interface GameStateOptions {
  /** 初始/最大 HP，默认 100。 */
  maxHp?: number;
}

/** 状态快照，供 HUD 读取。 */
export interface GameStateSnapshot {
  /** 当前 HP。 */
  readonly hp: number;
  /** 最大 HP。 */
  readonly maxHp: number;
  /** HP 百分比（0~1）。 */
  readonly hpPercent: number;
  /** 当前波次。 */
  readonly wave: number;
  /** 当前弹匣余弹。 */
  readonly magazine: number;
  /** 弹匣容量。 */
  readonly magazineSize: number;
  /** 是否正在换弹。 */
  readonly reloading: boolean;
  /** 换弹进度（0~1）。 */
  readonly reloadProgress: number;
  /** 累计击杀数。 */
  readonly kills: number;
  /** 是否已 GameOver。 */
  readonly gameOver: boolean;
}

/** 默认最大 HP。 */
const DEFAULT_MAX_HP = 100;

/**
 * 游戏状态管理器：集中管理玩家 HP、波次、弹药与击杀数。
 *
 * 使用方式：
 *   const state = new GameState({ maxHp: 100 });
 *   state.onStateChange = (snap) => hud.update(snap);
 *   state.takeDamage(20);
 */
export class GameState {
  /** 最大 HP。 */
  readonly maxHp: number;
  /** 当前 HP。 */
  private hp: number;
  /** 当前波次。 */
  private wave = 0;
  /** 当前弹匣余弹。 */
  private magazine = 0;
  /** 弹匣容量。 */
  private magazineSize = 0;
  /** 是否正在换弹。 */
  private reloading = false;
  /** 换弹进度（0~1）。 */
  private reloadProgress = 1;
  /** 累计击杀数。 */
  private kills = 0;
  /** 是否已 GameOver。 */
  private gameOver = false;

  /** HP 变化回调。 */
  onHpChange: ((hp: number, maxHp: number) => void) | null = null;
  /** GameOver 回调。 */
  onGameOver: (() => void) | null = null;
  /** 通用状态变化回调（任何状态变化时触发）。 */
  onStateChange: ((snapshot: GameStateSnapshot) => void) | null = null;

  constructor(options: GameStateOptions = {}) {
    this.maxHp = options.maxHp ?? DEFAULT_MAX_HP;
    this.hp = this.maxHp;
  }

  /**
   * 受击扣 HP。
   * @param amount 伤害值（正数）
   * @returns true 表示本次伤害触发 GameOver
   */
  takeDamage(amount: number): boolean {
    if (this.gameOver) return false;
    if (amount <= 0) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.notifyHpChange();

    if (this.hp <= 0) {
      this.triggerGameOver();
      return true;
    }
    this.notifyStateChange();
    return false;
  }

  /**
   * 恢复 HP，不超过上限。
   * @param amount 恢复值（正数）
   */
  heal(amount: number): void {
    if (this.gameOver || amount <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.notifyHpChange();
    this.notifyStateChange();
  }

  /** 设置当前波次。 */
  setWave(wave: number): void {
    if (this.gameOver) return;
    this.wave = wave;
    this.notifyStateChange();
  }

  /**
   * 同步弹药状态。
   * @param magazine 当前弹匣余弹
   * @param magazineSize 弹匣容量
   * @param reloading 是否换弹中
   * @param reloadProgress 换弹进度 0~1
   */
  setAmmo(
    magazine: number,
    magazineSize: number,
    reloading: boolean,
    reloadProgress: number,
  ): void {
    if (this.gameOver) return;
    this.magazine = magazine;
    this.magazineSize = magazineSize;
    this.reloading = reloading;
    this.reloadProgress = reloadProgress;
    this.notifyStateChange();
  }

  /** 击杀数 +1。 */
  addKill(): void {
    if (this.gameOver) return;
    this.kills++;
    this.notifyStateChange();
  }

  /** 返回状态快照。 */
  getSnapshot(): GameStateSnapshot {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      hpPercent: this.maxHp > 0 ? this.hp / this.maxHp : 0,
      wave: this.wave,
      magazine: this.magazine,
      magazineSize: this.magazineSize,
      reloading: this.reloading,
      reloadProgress: this.reloadProgress,
      kills: this.kills,
      gameOver: this.gameOver,
    };
  }

  /** 是否已 GameOver。 */
  isGameOver(): boolean {
    return this.gameOver;
  }

  /** 重置为初始状态（GameOver 后重启用）。 */
  reset(): void {
    this.hp = this.maxHp;
    this.wave = 0;
    this.magazine = 0;
    this.magazineSize = 0;
    this.reloading = false;
    this.reloadProgress = 1;
    this.kills = 0;
    this.gameOver = false;
    this.notifyHpChange();
    this.notifyStateChange();
  }

  /** 触发 GameOver。 */
  private triggerGameOver(): void {
    this.gameOver = true;
    this.notifyStateChange();
    this.onGameOver?.();
  }

  private notifyHpChange(): void {
    this.onHpChange?.(this.hp, this.maxHp);
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getSnapshot());
  }
}

/** 导出常量供测试与后续模块使用。 */
export { DEFAULT_MAX_HP };
