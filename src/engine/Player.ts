/**
 * Player 玩家控制器：FPS 第一人称视角的移动与视角控制。
 *
 * 职责：
 * - Pointer Lock API 锁定鼠标，鼠标移动控制相机俯仰角（pitch）与偏航角（yaw）
 * - WASD 控制相机沿水平面前后左右移动
 * - 移动加速度与阻尼，使手感平滑
 * - 简单边界碰撞检测，限制在竞技场范围内
 *
 * 对外接口约定：
 * - new Player(camera, arena)：注入 Camera 与 Arena 边界信息
 * - player.lock()：请求 Pointer Lock（由 UI 点击触发）
 * - player.update(delta)：每帧更新，由 Game.update 调用
 * - player.getPosition()：返回当前世界坐标，供 Enemy/Weapon 使用
 * - player.dispose()：移除所有事件监听
 *
 * 后续需求接入方式：
 * - Enemy 系统通过 player.getPosition() 获取玩家位置以追踪
 * - Weapon 系统通过 camera 方向判断射击射线
 */
import { Vector3, MathUtils } from 'three';
import type { PerspectiveCamera } from 'three';
import { ARENA_SIZE } from './Arena.js';

/** 玩家眼睛高度（世界单位）。 */
const PLAYER_HEIGHT = 1.7;

/** 移动加速度（单位/秒²）。 */
const MOVE_ACCELERATION = 60;

/** 移动阻尼系数（越大停得越快）。 */
const MOVE_DAMPING = 8;

/** 最大移动速度（单位/秒）。 */
const MAX_SPEED = 8;

/** 鼠标灵敏度。 */
const MOUSE_SENSITIVITY = 0.0022;

/** 俯仰角上限（弧度），约 85°。 */
const PITCH_LIMIT = MathUtils.degToRad(85);

/** 边界安全间距，防止贴墙穿模。 */
const BOUNDARY_MARGIN = 0.5;

/** 竞技场半边长，用于边界碰撞。 */
const HALF_ARENA = ARENA_SIZE / 2 - BOUNDARY_MARGIN;

export interface PlayerOptions {
  /** 初始位置，默认 (0, PLAYER_HEIGHT, 0)。 */
  position?: [number, number, number];
  /** 移动加速度，默认 MOVE_ACCELERATION。 */
  acceleration?: number;
  /** 阻尼系数，默认 MOVE_DAMPING。 */
  damping?: number;
  /** 最大速度，默认 MAX_SPEED。 */
  maxSpeed?: number;
  /** 鼠标灵敏度，默认 MOUSE_SENSITIVITY。 */
  sensitivity?: number;
}

/**
 * 第一人称玩家控制器。
 *
 * 使用方式：
 *   const player = new Player(camera, arena);
 *   canvas.addEventListener('click', () => player.lock());
 *   // 在 Game.update 中：player.update(delta);
 */
export class Player {
  private readonly camera: PerspectiveCamera;
  /** 当前俯仰角（弧度）。 */
  private pitch = 0;
  /** 当前偏航角（弧度）。 */
  private yaw = 0;
  /** 水平面速度向量。 */
  private readonly velocity: Vector3;
  /** 当前世界位置。 */
  private readonly position: Vector3;
  /** WASD 按键状态。 */
  private readonly keys: Record<string, boolean> = {};

  private readonly acceleration: number;
  private readonly damping: number;
  private readonly maxSpeed: number;
  private readonly sensitivity: number;

  private readonly mouseMoveHandler: (e: MouseEvent) => void;
  private readonly keyDownHandler: (e: KeyboardEvent) => void;
  private readonly keyUpHandler: (e: KeyboardEvent) => void;
  private readonly pointerLockChangeHandler: () => void;
  private readonly lockTarget: HTMLElement;

  /** Pointer Lock 是否激活。 */
  private locked = false;

  constructor(camera: PerspectiveCamera, options: PlayerOptions = {}) {
    this.camera = camera;
    const {
      position = [0, PLAYER_HEIGHT, 0],
      acceleration = MOVE_ACCELERATION,
      damping = MOVE_DAMPING,
      maxSpeed = MAX_SPEED,
      sensitivity = MOUSE_SENSITIVITY,
    } = options;

    this.acceleration = acceleration;
    this.damping = damping;
    this.maxSpeed = maxSpeed;
    this.sensitivity = sensitivity;

    this.position = new Vector3(position[0], position[1], position[2]);
    this.velocity = new Vector3(0, 0, 0);

    // 初始化相机位置与朝向
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';

    // Pointer Lock 目标为 document.body
    this.lockTarget = document.body;

    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    this.pointerLockChangeHandler = () => this.handlePointerLockChange();

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
  }

  /** 请求 Pointer Lock，由 UI 点击事件触发。 */
  lock(): void {
    this.lockTarget.requestPointerLock();
  }

  /** 是否已锁定鼠标。 */
  isLocked(): boolean {
    return this.locked;
  }

  /** 返回当前世界坐标副本，供 Enemy/Weapon 使用。 */
  getPosition(): Vector3 {
    return this.position.clone();
  }

  /** 鼠标移动：控制偏航角（yaw）与俯仰角（pitch）。 */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.locked) return;
    this.yaw -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    this.pitch = MathUtils.clamp(this.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  /** 键盘按下：记录 WASD 状态。 */
  private handleKeyDown(e: KeyboardEvent): void {
    this.keys[e.code] = true;
  }

  /** 键盘松开：清除按键状态。 */
  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.code] = false;
  }

  /** Pointer Lock 状态变化。 */
  private handlePointerLockChange(): void {
    this.locked = document.pointerLockElement === this.lockTarget;
    if (!this.locked) {
      // 退出锁定时清空按键，避免持续移动
      this.keys['KeyW'] = false;
      this.keys['KeyA'] = false;
      this.keys['KeyS'] = false;
      this.keys['KeyD'] = false;
    }
  }

  /**
   * 每帧更新：处理输入、加速度积分、阻尼、边界碰撞、相机同步。
   * 由 Game.update(delta) 调用。
   */
  update(delta: number): void {
    // 1. 计算移动方向（基于偏航角的水平面前后左右）
    const forward = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new Vector3(0, 0, 0);
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyD']) moveDir.add(right);
    if (this.keys['KeyA']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(this.acceleration * delta);
      this.velocity.add(moveDir);
    }

    // 2. 阻尼：速度衰减
    const dampingFactor = Math.max(0, 1 - this.damping * delta);
    this.velocity.multiplyScalar(dampingFactor);

    // 3. 限速
    const speed = this.velocity.length();
    if (speed > this.maxSpeed) {
      this.velocity.multiplyScalar(this.maxSpeed / speed);
    }

    // 4. 位置积分
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // 5. 边界碰撞检测（限制在竞技场内）
    this.position.x = MathUtils.clamp(this.position.x, -HALF_ARENA, HALF_ARENA);
    this.position.z = MathUtils.clamp(this.position.z, -HALF_ARENA, HALF_ARENA);

    // 6. 同步相机
    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** 移除所有事件监听。 */
  dispose(): void {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  PLAYER_HEIGHT,
  MOVE_ACCELERATION,
  MOVE_DAMPING,
  MAX_SPEED,
  MOUSE_SENSITIVITY,
  PITCH_LIMIT,
  HALF_ARENA,
};
