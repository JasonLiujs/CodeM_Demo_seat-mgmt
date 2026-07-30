/**
 * Game 主入口：组合 Renderer、Camera、Clock，驱动 requestAnimationFrame 主循环。
 *
 * 模块注册点（后续需求接入方式）：
 * 所有模块通过 Game 主类组合，不依赖全局变量。后续需求在 Game 构造时注入
 * 对应模块（Player、EnemyManager、WeaponSystem 等），并在 update/render 中调用。
 *
 * 示例：
 *   const game = new Game();
 *   game.start();
 */
import { Clock } from 'three';
import { Renderer } from './engine/Renderer.js';
import { Camera } from './engine/Camera.js';
import { Arena } from './engine/Arena.js';

export interface GameOptions {
  /** 渲染器实例，默认创建新实例。 */
  renderer?: Renderer;
  /** 相机实例，默认创建新实例。 */
  camera?: Camera;
  /** 竞技场场景实例，默认基于 renderer.scene 创建。 */
  arena?: Arena;
}

/**
 * 游戏主类：持有引擎核心对象，驱动固定步长更新的主循环。
 *
 * 对外接口约定：
 * - start()：启动主循环（幂等，重复调用安全）
 * - stop()：停止主循环
 * - update(delta)：每帧逻辑更新入口，子类或扩展模块在此接入
 * - dispose()：释放资源
 */
export class Game {
  readonly renderer: Renderer;
  readonly camera: Camera;
  /** 竞技场场景，包含地板/围墙/掩体/光照。 */
  readonly arena: Arena;
  private readonly clock: Clock;
  private animationId: number | null = null;
  private running = false;

  constructor(options: GameOptions = {}) {
    this.renderer = options.renderer ?? new Renderer();
    // 相机默认置于竞技场内、略高俯视，保证视野合理（验收标准）
    this.camera = options.camera ?? new Camera({ position: [0, 6, 16] });
    this.arena = options.arena ?? new Arena(this.renderer.scene);
    this.clock = new Clock();
  }

  /** 启动主循环。幂等：已运行时重复调用无副作用。 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  /** 停止主循环。 */
  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clock.stop();
  }

    /** 每帧逻辑更新。后续需求在此扩展（玩家、敌人、武器等）。 */
  update(delta: number): void {
    this.arena.update(delta);
  }

  /** 每帧渲染。 */
  private render(): void {
    this.renderer.renderer.render(this.renderer.scene, this.camera.camera);
  }

  /** requestAnimationFrame 回调。 */
  private loop = (): void => {
    if (!this.running) return;
    const delta = this.clock.getDelta();
    this.update(delta);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  /** 释放所有资源并停止循环。 */
  dispose(): void {
    this.stop();
    this.arena.dispose(this.renderer.scene);
    this.renderer.dispose();
    this.camera.dispose();
  }
}
