/**
 * Enemy 敌人：AI 移动、接触伤害、受击扣血、死亡移除。
 *
 * 职责：
 * - 拥有血量（随波次递增）
 * - 每帧朝玩家方向移动
 * - 与玩家距离小于阈值时造成接触伤害（带冷却）
 * - 受击扣血，血量归零后死亡并从场景移除
 * - 暴露 mesh 供 Weapon 射线检测
 *
 * 对外接口约定：
 * - new Enemy(scene, options?)：注入场景与配置
 * - enemy.update(delta, playerPos)：每帧更新，由 EnemySpawner 调用
 * - enemy.takeDamage(amount)：受击扣血，返回是否因此击死亡
 * - enemy.isDead()：是否已死亡
 * - enemy.getMesh()：返回 mesh（供 weapon targets）
 * - enemy.getPosition()：返回当前位置
 * - enemy.dispose()：移除 mesh 并释放资源
 *
 * 后续需求接入方式：
 * - Weapon.onHit 回调中根据 hit.object 找到对应 Enemy，调用 takeDamage
 * - EnemySpawner 管理 Enemy 实例生命周期与波次逻辑
 */
import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Scene,
} from 'three';

/** 敌人基础半径（世界单位）。 */
const ENEMY_RADIUS = 0.5;

/** 接触伤害阈值距离（世界单位）。 */
const CONTACT_DISTANCE = 1.2;

/** 接触伤害（每次）。 */
const CONTACT_DAMAGE = 10;

/** 接触伤害冷却（毫秒）。 */
const CONTACT_COOLDOWN_MS = 800;

/** 敌人基础移动速度（单位/秒）。 */
const BASE_SPEED = 2.5;

/** 受击闪烁持续时长（秒）。 */
const HIT_FLASH_DURATION = 0.15;

/** 受击闪烁时的发光强度。 */
const HIT_FLASH_EMISSIVE_INTENSITY = 4;

export interface EnemyOptions {
  /** 初始位置。 */
  position: [number, number, number];
  /** 初始血量。 */
  health: number;
  /** 移动速度，默认 BASE_SPEED。 */
  speed?: number;
  /** 敌人颜色，默认红色。 */
  color?: number;
  /** 唯一标识，便于外部查找。 */
  id?: number;
}

/**
 * 敌人实例：管理单个敌人的移动、伤害与死亡。
 *
 * 使用方式：
 *   const enemy = new Enemy(scene, { position: [0, 1, -10], health: 100 });
 *   // 在 spawner update 中：enemy.update(delta, player.getPosition());
 *   // 受击：enemy.takeDamage(25);
 */
export class Enemy {
  /** 唯一 ID。 */
  readonly id: number;
  /** 敌人 mesh（供 weapon 射线检测）。 */
  readonly mesh: Mesh;
  /** 当前血量。 */
  private health: number;
  /** 最大血量（用于 HUD 百分比）。 */
  readonly maxHealth: number;
  /** 移动速度。 */
  private readonly speed: number;
  /** 当前世界位置。 */
  private readonly position: Vector3;

  /** 是否已死亡。 */
  private dead = false;

  /** 上次接触伤害时间戳（毫秒）。 */
  private lastContactTime = 0;

  /** 受击闪烁剩余时间（秒），<=0 表示不闪烁。 */
  private hitFlashRemaining = 0;

  /** 受击闪烁总时长（秒），用于计算插值。 */
  private readonly hitFlashDuration: number;

  /** 受击闪烁时叠加的发光强度。 */
  private readonly hitFlashEmissiveIntensity: number;

  /** 原始 emissive 颜色（闪烁恢复用）。 */
  private readonly baseEmissive: number;

  /** 原始 emissiveIntensity（闪烁恢复用）。 */
  private readonly baseEmissiveIntensity: number;

  /** 接触伤害回调：敌人接触玩家时触发，供 Player 扣血。 */
  onContactPlayer: ((damage: number) => void) | null = null;

  /** 死亡回调：敌人死亡时触发，供 spawner 清理。 */
  onDeath: ((enemy: Enemy) => void) | null = null;

  private readonly geometry: BufferGeometry;
  private readonly material: MeshStandardMaterial;
  private readonly scene: Scene;

  constructor(scene: Scene, options: EnemyOptions) {
    this.scene = scene;
    this.id = options.id ?? 0;
    this.maxHealth = options.health;
    this.health = options.health;
    this.speed = options.speed ?? BASE_SPEED;

    this.position = new Vector3(
      options.position[0],
      options.position[1],
      options.position[2],
    );

    this.baseEmissive = options.color ?? 0xcc3333;
    this.baseEmissiveIntensity = 1;
    this.hitFlashDuration = HIT_FLASH_DURATION;
    this.hitFlashEmissiveIntensity = HIT_FLASH_EMISSIVE_INTENSITY;

    this.geometry = new SphereGeometry(ENEMY_RADIUS, 12, 8);
    this.material = new MeshStandardMaterial({
      color: options.color ?? 0xcc3333,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x330000,
      emissiveIntensity: this.baseEmissiveIntensity,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.name = `enemy-${this.id}`;
    // 用 userData 反向引用，便于 weapon.onHit 回调查找
    this.mesh.userData.enemyRef = this;

    scene.add(this.mesh);
  }

  /**
   * 每帧更新：朝玩家移动 + 接触伤害检测。
   * @param delta 帧间隔（秒）
   * @param playerPos 玩家世界坐标
   */
  update(delta: number, playerPos: Vector3): void {
    if (this.dead) return;

    // 1. 朝玩家方向移动（仅水平面 XZ）
    const direction = new Vector3(
      playerPos.x - this.position.x,
      0,
      playerPos.z - this.position.z,
    );
    const distance = direction.length();

    if (distance > CONTACT_DISTANCE) {
      direction.normalize();
      this.position.x += direction.x * this.speed * delta;
      this.position.z += direction.z * this.speed * delta;
      this.mesh.position.copy(this.position);
    }

    // 2. 接触伤害检测
    const horizontalDist = Math.hypot(
      playerPos.x - this.position.x,
      playerPos.z - this.position.z,
    );
    if (horizontalDist <= CONTACT_DISTANCE) {
      const now = performance.now();
      if (now - this.lastContactTime >= CONTACT_COOLDOWN_MS) {
        this.lastContactTime = now;
        this.onContactPlayer?.(CONTACT_DAMAGE);
      }
    }

    // 3. 受击闪烁衰减
    this.updateHitFlash(delta);
  }

  /**
   * 受击扣血。
   * @param amount 伤害值
   * @returns true 表示本次伤害导致敌人死亡
   */
  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.health -= amount;
    this.triggerHitFlash();
      if (this.health <= 0) {
      this.health = 0;
      this.die();
    return true;
    }
  return false;
  }

  /** 是否已死亡。 */
  isDead(): boolean {
    return this.dead;
  }

  /** 返回当前血量。 */
  getHealth(): number {
    return this.health;
  }

  /** 返回当前世界位置副本。 */
  getPosition(): Vector3 {
    return this.position.clone();
  }

  /** 返回 mesh（供 weapon targets 列表）。 */
  getMesh(): Mesh {
    return this.mesh;
  }

  /** 触发受击闪烁：重置闪烁计时器并立即点亮材质。 */
  private triggerHitFlash(): void {
    this.hitFlashRemaining = this.hitFlashDuration;
    this.material.emissive.setHex(0xff3300);
    this.material.emissiveIntensity = this.hitFlashEmissiveIntensity;
  }

  /** 每帧衰减受击闪烁，恢复到基础 emissive。 */
  private updateHitFlash(delta: number): void {
    if (this.hitFlashRemaining <= 0) return;
    this.hitFlashRemaining -= delta;
    if (this.hitFlashRemaining <= 0) {
      this.hitFlashRemaining = 0;
      this.material.emissive.setHex(this.baseEmissive);
      this.material.emissiveIntensity = this.baseEmissiveIntensity;
      return;
    }
    // 按剩余比例衰减发光强度，实现平滑闪烁
    const t = this.hitFlashRemaining / this.hitFlashDuration;
    this.material.emissiveIntensity =
      this.baseEmissiveIntensity +
      (this.hitFlashEmissiveIntensity - this.baseEmissiveIntensity) * t;
  }

  /** 死亡处理：标记死亡并触发回调。 */
  private die(): void {
    if (this.dead) return;
    this.dead = true;
    this.onDeath?.(this);
  }

  /** 释放资源：移除 mesh 并销毁几何体与材质。 */
  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  ENEMY_RADIUS,
  CONTACT_DISTANCE,
  CONTACT_DAMAGE,
  CONTACT_COOLDOWN_MS,
  BASE_SPEED,
};
