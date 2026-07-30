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
import { Player } from './engine/Player.js';
import { Weapon } from './engine/Weapon.js';
import { EnemySpawner } from './engine/EnemySpawner.js';
import type { Object3D } from 'three';

export interface GameOptions {
  /** 渲染器实例，默认创建新实例。 */
  renderer?: Renderer;
  /** 相机实例，默认创建新实例。 */
  camera?: Camera;
  /** 竞技场场景实例，默认基于 renderer.scene 创建。 */
  arena?: Arena;
  /** 可命中目标列表，供武器射线检测使用（后续 EnemyManager 接入时传入）。 */
  targets?: Object3D[];
  /** 武器系统实例，默认基于 camera 与 renderer.scene 创建。 */
  weapon?: Weapon;
  /** 玩家控制器实例，默认基于 camera 创建。 */
  player?: Player;
/** 敌人波次生成器实例，默认基于 renderer.scene 创建。 */
  enemySpawner?: EnemySpawner;
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
  /** 玩家控制器，负责第一人称视角移动与鼠标控制。 */
  readonly player: Player;
  /** 武器系统，负责开火、射线检测、弹药与换弹。 */
  readonly weapon: Weapon;
  /** 敌人波次生成器，负责敌人创建、波次推进与清理。 */
  readonly enemySpawner: EnemySpawner;
  private readonly clock: Clock;
  private animationId: number | null = null;
  private running = false;

  constructor(options: GameOptions = {}) {
    this.renderer = options.renderer ?? new Renderer();
    // 相机默认置于竞技场内、略高俯视，保证视野合理（验收标准）
    this.camera = options.camera ?? new Camera({ position: [0, 6, 16] });
    this.arena = options.arena ?? new Arena(this.renderer.scene);
    // Player 接管相机，初始位置为玩家眼睛高度
    this.player = options.player ?? new Player(this.camera.camera, {
      position: [0, 1.7, 0],
    });
    // 将相机加入场景，使挂载在其上的武器视图模型被渲染
    this.renderer.scene.add(this.camera.camera);
    // Weapon 接管相机前方的武器视图模型与开火逻辑
    this.weapon = options.weapon ?? new Weapon(
      this.camera.camera,
      this.renderer.scene,
      { targets: options.targets ?? [] },
    );
    // EnemySpawner 管理波次敌人生成
    this.enemySpawner = options.enemySpawner ?? new EnemySpawner(this.renderer.scene);
    // 将武器射线目标接入敌人 mesh 列表
    this.weapon.setTargets(this.enemySpawner.getTargets());
    // 武器命中时，通过 mesh.userData.enemyRef 找到 Enemy 实例并扣血
    this.weapon.onHit = (object) => {
      const enemyRef = object.userData.enemyRef;
      if (enemyRef && typeof enemyRef.takeDamage === 'function') {
        enemyRef.takeDamage(25);
      }
    };
    // 敌人接触玩家时，对玩家造成伤害（通过 health 回调暴露，后续 GameState 接入）
    // 当前仅暴露事件，实际扣血由 Player/GameState 后续需求实现
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

  /** 每帧逻辑更新。后续需求在此扩展（敌人、武器等）。 */
  update(delta: number): void {
    this.arena.update(delta);
    this.player.update(delta);
    // 敌人波次更新：移动、生成、清理
  this.enemySpawner.update(delta, this.player.getPosition());
    // 同步武器射线目标（敌人列表会随死亡/新生变化）
    this.weapon.setTargets(this.enemySpawner.getTargets());
    this.weapon.update(delta);
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
    this.weapon.dispose();
    this.enemySpawner.dispose();
    this.player.dispose();
    this.arena.dispose(this.renderer.scene);
    this.renderer.dispose();
  this.camera.dispose();
  }
}
