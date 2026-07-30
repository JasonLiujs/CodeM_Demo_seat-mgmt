/**
 * EnemySpawner 波次生成器：按波次生成敌人，难度递增。
 *
 * 职责：
 * - 第 N 波生成 N+2 个敌人，血量随波次递增
 * - 场上敌人归零后延迟 3s 进入下一波
 * - 同屏敌人上限 15
 * - 管理 Enemy 实例生命周期（创建/更新/销毁）
 * - 暴露当前波次、存活数供 HUD 读取
 *
 * 对外接口约定：
 * - new EnemySpawner(scene, options?)：注入场景
 * - spawner.update(delta, playerPos)：每帧更新，由 Game.update 调用
 * - spawner.getTargets()：返回可命中 Enemy mesh 列表（供 Weapon.setTargets）
 * - spawner.getWave()：返回当前波次
 * - spawner.getAliveCount()：返回存活敌人数
 * - spawner.getTotalKills()：返回累计击杀数
 * - spawner.onWaveChange：波次变化回调，供 HUD
 * - spawner.onKill：击杀回调，供 GameState 计分
 * - spawner.dispose()：销毁所有敌人
 *
 * 后续需求接入方式：
 * - Game 构造时创建 spawner，每帧调用 spawner.update(delta, player.getPosition())
 * - Weapon.setTargets(spawner.getTargets()) 注入可命中 mesh
 * - Weapon.onHit 回调中通过 mesh.userData.enemyRef 找到 Enemy 实例并 takeDamage
 */
import type { Scene, Object3D, Vector3 } from 'three';
import { Enemy, BASE_SPEED } from './Enemy.js';

/** 第 N 波生成数量公式：N + 2。 */
function waveCount(wave: number): number {
  return wave + 2;
}

/** 第 N 波敌人血量公式：50 + (wave - 1) * 25。 */
function waveHealth(wave: number): number {
  return 50 + (wave - 1) * 25;
}

/** 同屏敌人上限。 */
const MAX_ALIVE = 15;

/** 清波后延迟进入下一波（秒）。 */
const NEXT_WAVE_DELAY = 3;

/** 敌人生成 Y 坐标（地板上方）。 */
const SPAWN_Y = 0.5;

/** 竞技场半边长（敌人生成范围）。 */
const HALF_ARENA_SIZE = 19;

export interface EnemySpawnerOptions {
  /** 同屏敌人上限，默认 15。 */
  maxAlive?: number;
  /** 清波延迟（秒），默认 3。 */
  nextWaveDelay?: number;
  /** 竞技场半边长（生成范围），默认 19。 */
  halfArena?: number;
  /** 敌人移动速度，默认 BASE_SPEED。 */
  enemySpeed?: number;
}

/**
 * 波次生成器：管理敌人创建、波次推进与清理。
 *
 * 使用方式：
 *   const spawner = new EnemySpawner(scene);
 *   weapon.setTargets(spawner.getTargets());
 *   // 在 Game.update 中：spawner.update(delta, player.getPosition());
 */
export class EnemySpawner {
  private readonly scene: Scene;
  private readonly maxAlive: number;
  private readonly nextWaveDelay: number;
  private readonly halfArena: number;
  private readonly enemySpeed: number;

  /** 当前活跃敌人列表。 */
  private enemies: Enemy[] = [];
  /** 自增 ID 计数器。 */
  private nextId = 1;
  /** 当前波次（从 1 开始）。 */
  private wave = 0;
  /** 本波已生成数量。 */
  private spawnedThisWave = 0;
  /** 本波目标数量。 */
  private waveTargetCount = 0;
  /** 清波后延迟计时器（秒），<0 表示不在延迟中。 */
  private waveDelayTimer = -1;
  /** 累计击杀数。 */
  private totalKills = 0;
  /** 是否已启动第一波。 */
  private started = false;

  /** 波次变化回调。 */
  onWaveChange: ((wave: number) => void) | null = null;
  /** 击杀回调。 */
  onKill: ((enemy: Enemy) => void) | null = null;

  constructor(scene: Scene, options: EnemySpawnerOptions = {}) {
    this.scene = scene;
    this.maxAlive = options.maxAlive ?? MAX_ALIVE;
    this.nextWaveDelay = options.nextWaveDelay ?? NEXT_WAVE_DELAY;
    this.halfArena = options.halfArena ?? HALF_ARENA_SIZE;
    this.enemySpeed = options.enemySpeed ?? BASE_SPEED;
  }

  /**
   * 每帧更新：生成敌人、更新敌人位置、清理死亡敌人、推进波次。
   * @param delta 帧间隔（秒）
   * @param playerPos 玩家世界坐标
   */
  update(delta: number, playerPos: Vector3): void {
    // 首次调用时启动第一波
    if (!this.started) {
      this.started = true;
      this.startNextWave();
    }

    // 1. 清理已死亡敌人（先清理再生成，腾出同屏名额）
    this.removeDeadEnemies();

    // 2. 按需补充生成（受同屏上限与本波目标限制）
    this.spawnPendingEnemies();

    // 3. 更新所有存活敌人
    for (const enemy of this.enemies) {
      enemy.update(delta, playerPos);
    }

    // 4. 检查波次完成 → 延迟 → 下一波
    if (this.waveDelayTimer >= 0) {
      this.waveDelayTimer -= delta;
      if (this.waveDelayTimer <= 0) {
        this.waveDelayTimer = -1;
        this.startNextWave();
      }
    } else if (this.spawnedThisWave >= this.waveTargetCount && this.enemies.length === 0) {
      // 本波已全部生成且场上无敌人 → 进入延迟
      this.waveDelayTimer = this.nextWaveDelay;
    }
  }

  /** 启动下一波。 */
  private startNextWave(): void {
    this.wave++;
    this.spawnedThisWave = 0;
    this.waveTargetCount = waveCount(this.wave);
    this.onWaveChange?.(this.wave);
  }

  /** 按需补充生成敌人。 */
  private spawnPendingEnemies(): void {
    while (
      this.spawnedThisWave < this.waveTargetCount &&
      this.enemies.length < this.maxAlive
    ) {
      this.spawnEnemy();
      this.spawnedThisWave++;
    }
  }

  /** 生成单个敌人，位置随机在竞技场边缘。 */
  private spawnEnemy(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = this.halfArena * (0.7 + Math.random() * 0.3);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const enemy = new Enemy(this.scene, {
      id: this.nextId++,
      position: [x, SPAWN_Y, z],
      health: waveHealth(this.wave),
      speed: this.enemySpeed,
    });

    // 敌人死亡时累计击杀并通知回调
    enemy.onDeath = (e) => {
      this.totalKills++;
      this.onKill?.(e);
    };

    this.enemies.push(enemy);
  }

  /** 清理已死亡敌人并释放资源。 */
  private removeDeadEnemies(): void {
    const alive: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.isDead()) {
        enemy.dispose();
      } else {
        alive.push(enemy);
      }
    }
    this.enemies = alive;
  }

  /** 返回可命中 Enemy mesh 列表（供 Weapon.setTargets）。 */
  getTargets(): Object3D[] {
    return this.enemies
      .filter((e) => !e.isDead())
      .map((e) => e.getMesh());
  }

  /** 返回当前波次。 */
  getWave(): number {
    return this.wave;
  }

  /** 返回存活敌人数。 */
  getAliveCount(): number {
    return this.enemies.length;
  }

  /** 返回累计击杀数。 */
  getTotalKills(): number {
    return this.totalKills;
  }

  /** 销毁所有敌人并释放资源。 */
  dispose(): void {
    for (const enemy of this.enemies) {
      enemy.dispose();
    }
    this.enemies = [];
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  MAX_ALIVE,
  NEXT_WAVE_DELAY,
  SPAWN_Y,
  HALF_ARENA_SIZE,
  waveCount,
  waveHealth,
};
