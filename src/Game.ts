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
import { GameState } from './engine/GameState.js';
import { HUD } from './engine/HUD.js';
import { MenuOverlay } from './engine/MenuOverlay.js';
import type { Object3D } from 'three';

  /** 武器单发伤害（与既有 weapon.onHit 逻辑一致）。 */
  const WEAPON_DAMAGE = 25;

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
  /** 游戏状态管理器实例，默认创建新实例（初始 HP 100）。 */
  gameState?: GameState;
  /** HUD 界面实例，默认创建新实例。 */
  hud?: HUD;
  /** 主菜单与结算面板实例，默认创建新实例。 */
  menu?: MenuOverlay;
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
  /** 游戏状态管理器，集中管理 HP/波次/弹药/击杀/GameOver。 */
  readonly gameState: GameState;
  /** HUD 界面，DOM 覆盖层显示血量/波次/弹药/击杀。 */
  readonly hud: HUD;
  /** 主菜单与结算面板。 */
  readonly menu: MenuOverlay;
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
    // GameState 集中管理玩家 HP、波次、弹药、击杀数
    this.gameState = options.gameState ?? new GameState({ maxHp: 100 });
    // HUD 用 DOM 覆盖层显示状态，订阅 GameState 变化刷新
    this.hud = options.hud ?? new HUD();
      // 主菜单与结算面板覆盖层
      this.menu = options.menu ?? new MenuOverlay();
      this.gameState.onStateChange = (snap) => this.hud.update(snap);
      // GameOver 时显示结算面板（存活波次 + 击杀数）并退出 Pointer Lock
      this.gameState.onGameOver = () => {
        this.hud.showGameOver();
        this.menu.showGameOver(this.gameState.getSnapshot());
        this.exitPointerLock();
      };
      // 主菜单点击「开始游戏」：隐藏菜单，请求 Pointer Lock，确保主循环运行
      this.menu.onStart = () => this.startGame();
      // 结算面板点击「重新开始」：重置 GameState 与场景，重新进入游戏
      this.menu.onRestart = () => this.restart();

      // 将武器射线目标接入敌人 mesh 列表
    this.weapon.setTargets(this.enemySpawner.getTargets());
    // 武器命中时：通过 mesh.userData.enemyRef 找到 Enemy 实例并扣血；
    // 若敌人因此死亡，累计击杀数；同时触发准星命中反馈
    this.weapon.onHit = (object) => {
  const enemyRef = object.userData.enemyRef;
      if (enemyRef && typeof enemyRef.takeDamage === 'function') {
        const killed = enemyRef.takeDamage(WEAPON_DAMAGE);
        if (killed) {
          this.gameState.addKill();
        }
      this.hud.showHitFeedback();
    }
      };
    // 弹药状态变化时同步到 GameState（HUD 通过 onStateChange 刷新）
    this.weapon.onAmmoChange = (ammo) => {
      this.gameState.setAmmo(
        ammo.magazine,
        ammo.magazineSize,
        ammo.reloading,
        ammo.reloadProgress,
      );
    };
    // 波次变化同步到 GameState
    this.enemySpawner.onWaveChange = (wave) => this.gameState.setWave(wave);
      // 敌人接触玩家时扣减玩家 HP（由 Enemy 触发 onContactPlayer 回调）
    this.enemySpawner.onEnemyContactPlayer = (damage) =>
    this.gameState.takeDamage(damage);
    this.clock = new Clock();
    }

  /**
   * 启动主循环（幂等）。启动后显示主菜单，等待玩家点击开始。
   * 不自动请求 Pointer Lock——由主菜单「开始游戏」按钮触发。
   */
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

  /**
  * 每帧逻辑更新。Game Over 时暂停敌人/武器更新，仅保留渲染。
    */
    update(delta: number): void {
    this.arena.update(delta);
  this.player.update(delta);
    if (this.gameState.isGameOver()) return;
    // 敌人波次更新：移动、生成、清理
    this.enemySpawner.update(delta, this.player.getPosition());
  // 同步武器射线目标（敌人列表会随死亡/新生变化）
    this.weapon.setTargets(this.enemySpawner.getTargets());
    this.weapon.update(delta);
  // HUD 命中反馈衰减
    this.hud.updateHitFeedback(delta);
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

  /**
   * 从主菜单进入游戏：隐藏菜单，请求 Pointer Lock。
   * 主循环应已通过 start() 启动。
   */
  startGame(): void {
    this.menu.hide();
    this.hud.hideGameOver();
    this.player.lock();
  }

  /**
   * 重新开始：重置 GameState，隐藏结算面板，重置敌人与弹药，重新请求 Pointer Lock。
   */
  restart(): void {
    this.gameState.reset();
    this.hud.hideGameOver();
    this.menu.hide();
    this.enemySpawner.reset();
    this.weapon.refill();
    this.player.lock();
  }

  /** 退出 Pointer Lock（GameOver 时调用，释放鼠标供结算面板交互）。 */
  private exitPointerLock(): void {
    if (document.pointerLockElement !== null) {
      document.exitPointerLock();
    }
  }

  /** 释放所有资源并停止循环。 */
  dispose(): void {
    this.stop();
    this.weapon.dispose();
    this.enemySpawner.dispose();
    this.player.dispose();
    this.arena.dispose(this.renderer.scene);
    this.renderer.dispose();
    this.camera.dispose();
    this.hud.dispose();
    this.menu.dispose();
  }
}
