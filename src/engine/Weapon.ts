/**
 * Weapon 武器与射击系统：FPS 自动步枪的开火、射线命中检测、弹药与换弹。
 *
 * 职责：
 * - 在相机前方添加武器视图模型（简单几何体：枪身 + 枪管）
 * - 左键按住自动开火，每发使用 Raycaster 从屏幕中心发射射线检测命中
 * - 命中目标触发伤害回调
 * - 弹匣管理（30 发）与换弹（R 键，耗时约 2s）
 * - 弹药耗尽自动提示换弹
 * - 开火间隔限制（100ms）
 * - 开火视觉反馈：准星 + 枪口火光
 *
 * 对外接口约定：
 * - new Weapon(camera, scene, options?)：注入相机与场景
 * - weapon.update(delta)：每帧更新，由 Game.update 调用
 * - weapon.fire()：尝试开火（左键按住时由内部 mousedown 自动触发）
 * - weapon.reload()：手动换弹（R 键触发）
 * - weapon.getAmmo()：返回当前弹匣/备弹状态，供 UI 显示
 * - weapon.onHit：命中回调，外部设置后命中敌人时触发
 * - weapon.dispose()：移除事件监听与场景对象
 *
 * 后续需求接入方式：
 * - EnemyManager 通过 weapon.onHit 回调接收命中事件，对命中的 Object3D 查找对应 Enemy 实例并扣血
 * - UI 系统通过 weapon.getAmmo() 获取弹药状态渲染准星与弹药条
 */
import {
  Raycaster,
  Vector2,
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  type Vector3,
  type PerspectiveCamera,
  type Scene,
  type Object3D,
  type BufferGeometry,
  type Intersection,
} from 'three';

/** 弹匣容量（发）。 */
const MAGAZINE_SIZE = 30;

/** 开火间隔（毫秒），约 10 发/秒。 */
const FIRE_INTERVAL_MS = 100;

/** 换弹耗时（秒）。 */
const RELOAD_DURATION = 2;

/** 射线最大检测距离（世界单位）。 */
const MAX_RAY_DISTANCE = 200;

/** 枪口火光持续时间（毫秒）。 */
const MUZZLE_FLASH_DURATION_MS = 50;

/** 准星 DOM 元素 ID。 */
const CROSSHAIR_ID = 'weapon-crosshair';

/** 换弹提示 DOM 元素 ID。 */
const RELOAD_HINT_ID = 'weapon-reload-hint';

/** 射线中心坐标（屏幕中心）。 */
const SCREEN_CENTER = new Vector2(0, 0);

export interface WeaponOptions {
  /** 弹匣容量，默认 30。 */
  magazineSize?: number;
  /** 开火间隔（毫秒），默认 100。 */
  fireInterval?: number;
  /** 换弹耗时（秒），默认 2。 */
  reloadDuration?: number;
  /** 射线最大检测距离，默认 200。 */
  maxRayDistance?: number;
  /** 可命中目标的物体列表（敌人 mesh 等）。 */
  targets?: Object3D[];
}

/** 弹药状态快照，供 UI 读取。 */
export interface AmmoState {
  /** 当前弹匣余弹。 */
  readonly magazine: number;
  /** 弹匣容量。 */
  readonly magazineSize: number;
  /** 是否正在换弹。 */
  readonly reloading: boolean;
  /** 换弹进度（0~1）。 */
  readonly reloadProgress: number;
  /** 弹药是否耗尽。 */
  readonly empty: boolean;
}

/**
 * 武器系统：自动步枪的开火、射线检测、弹药与换弹管理。
 *
 * 使用方式：
 *   const weapon = new Weapon(camera, scene, { targets: enemyMeshes });
 *   weapon.onHit = (object, point) => { ... };
 *   // 在 Game.update 中：weapon.update(delta);
 */
export class Weapon {
  private readonly camera: PerspectiveCamera;
  /** 射线检测的场景（供 intersectObjects 使用）。 */
  private targets: Object3D[];
  /** 武器视图模型组（挂载在相机下方）。 */
  private readonly weaponGroup: Group;
  /** 枪口火光 mesh。 */
  private readonly muzzleFlash: Mesh;
  /** 射线检测器。 */
  private readonly raycaster: Raycaster;

  private readonly magazineSize: number;
  private readonly fireInterval: number;
  private readonly reloadDuration: number;
  private readonly maxRayDistance: number;

  /** 当前弹匣余弹。 */
  private ammo: number;
  /** 是否正在换弹。 */
  private reloading = false;
  /** 换弹已用时间（秒）。 */
  private reloadElapsed = 0;

  /** 上次开火时间戳（毫秒）。 */
  private lastFireTime = 0;
  /** 枪口火光剩余显示时间（毫秒），<=0 表示不显示。 */
  private muzzleFlashRemaining = 0;

  /** 左键是否按住。 */
  private firing = false;

/** 枪口火光材质引用（dispose 用）。 */
  private readonly muzzleMaterial: MeshStandardMaterial;
  /** 武器模型几何体与材质（dispose 用）。 */
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshStandardMaterial[] = [];

  /** 命中回调：外部设置后，射线命中目标时触发。 */
  onHit: ((object: Object3D, point: Vector3) => void) | null = null;

  /** 弹药变化回调：弹匣/换弹状态变化时触发，供 UI 刷新。 */
  onAmmoChange: ((state: AmmoState) => void) | null = null;

  /** 弹药耗尽回调：弹药打空时触发一次，供 UI 提示换弹。 */
  onEmpty: (() => void) | null = null;

  private readonly mouseDownHandler: (e: MouseEvent) => void;
  private readonly mouseUpHandler: (e: MouseEvent) => void;
  private readonly keyDownHandler: (e: KeyboardEvent) => void;

  /**
   * @param camera 透视相机，武器视图模型挂载在相机子节点
   * @param scene 场景，射线检测的目标在场景中
   * @param options 可选参数
   */
  constructor(
    camera: PerspectiveCamera,
    _scene: Scene,
    options: WeaponOptions = {},
  ) {
    this.camera = camera;

    this.magazineSize = options.magazineSize ?? MAGAZINE_SIZE;
    this.fireInterval = options.fireInterval ?? FIRE_INTERVAL_MS;
    this.reloadDuration = options.reloadDuration ?? RELOAD_DURATION;
    this.maxRayDistance = options.maxRayDistance ?? MAX_RAY_DISTANCE;
    this.targets = options.targets ?? [];

    this.ammo = this.magazineSize;
    this.raycaster = new Raycaster();

    // 构建武器视图模型
    this.weaponGroup = this.buildWeaponModel();
    this.camera.add(this.weaponGroup);

    // 构建枪口火光
    this.muzzleMaterial = new MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xff6600,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9,
    });
    const flashGeo = new BoxGeometry(0.3, 0.3, 0.3);
    this.geometries.push(flashGeo);
    this.muzzleFlash = new Mesh(flashGeo, this.muzzleMaterial);
    this.muzzleFlash.visible = false;
    // 枪口位置在枪管前端
    this.muzzleFlash.position.set(0.15, -0.12, -0.85);
    this.weaponGroup.add(this.muzzleFlash);

    // 创建 UI 元素（准星 + 换弹提示）
    this.createCrosshair();
    this.createReloadHint();

    // 绑定事件
    this.mouseDownHandler = () => this.handleMouseDown();
    this.mouseUpHandler = () => this.handleMouseUp();
    this.keyDownHandler = (e) => this.handleKeyDown(e);

    document.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('keydown', this.keyDownHandler);

    this.notifyAmmoChange();
  }

  /** 设置可命中目标列表（敌人 mesh 等）。 */
  setTargets(targets: Object3D[]): void {
    this.targets = targets;
  }

  /**
   * 尝试开火：检查弹药、换弹状态、开火间隔后发射射线。
   * @returns true 表示成功开火，false 表示被拦截
   */
  fire(): boolean {
    if (this.reloading) return false;
    if (this.ammo <= 0) {
      this.notifyEmpty();
      return false;
    }
    const now = performance.now();
    if (now - this.lastFireTime < this.fireInterval) return false;

    this.lastFireTime = now;
    this.ammo--;
    this.showMuzzleFlash();
    this.castRay();
    this.notifyAmmoChange();

    if (this.ammo <= 0) {
      this.notifyEmpty();
    }
    return true;
  }

  /** 手动换弹：R 键触发，弹药未满时开始换弹流程。 */
  reload(): void {
    if (this.reloading) return;
    if (this.ammo >= this.magazineSize) return;
    this.reloading = true;
    this.reloadElapsed = 0;
    this.firing = false;
    this.showReloadHint(true);
    this.notifyAmmoChange();
  }

  /** 返回当前弹药状态快照。 */
  getAmmo(): AmmoState {
    return {
      magazine: this.ammo,
      magazineSize: this.magazineSize,
      reloading: this.reloading,
      reloadProgress: this.reloading
        ? Math.min(1, this.reloadElapsed / this.reloadDuration)
        : 1,
      empty: this.ammo <= 0,
    };
  }

  /**
   * 每帧更新：处理自动开火、换弹进度、枪口火光衰减。
   * 由 Game.update(delta) 调用。
   */
  update(delta: number): void {
    // 自动开火：左键按住时持续触发
    if (this.firing) {
      this.fire();
    }

    // 换弹进度
    if (this.reloading) {
      this.reloadElapsed += delta;
      if (this.reloadElapsed >= this.reloadDuration) {
        this.reloading = false;
        this.ammo = this.magazineSize;
        this.showReloadHint(false);
        this.notifyAmmoChange();
      }
    }

    // 枪口火光衰减
    if (this.muzzleFlashRemaining > 0) {
      this.muzzleFlashRemaining -= delta * 1000;
      if (this.muzzleFlashRemaining <= 0) {
        this.muzzleFlash.visible = false;
      }
    }
  }

  /** 释放所有资源并移除事件监听。 */
  dispose(): void {
    document.removeEventListener('mousedown', this.mouseDownHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    document.removeEventListener('keydown', this.keyDownHandler);

    this.camera.remove(this.weaponGroup);
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.muzzleMaterial.dispose();
    this.muzzleFlash.geometry.dispose();

    this.removeCrosshair();
    this.removeReloadHint();
  }

  // ===== 内部方法 =====

  /** 构建武器视图模型：枪身 + 枪管，挂载在相机前方下方。 */
  private buildWeaponModel(): Group {
    const group = new Group();
    group.name = 'weapon-view-model';

    // 枪身（稍大的方块）
    const bodyGeo = new BoxGeometry(0.25, 0.18, 0.5);
    const bodyMat = new MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.6,
      metalness: 0.4,
    });
    this.geometries.push(bodyGeo);
    this.materials.push(bodyMat);
    const body = new Mesh(bodyGeo, bodyMat);
    body.position.set(0.15, -0.15, -0.5);
    group.add(body);

    // 枪管（细长方块，向前延伸）
    const barrelGeo = new BoxGeometry(0.08, 0.08, 0.35);
    const barrelMat = new MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.6,
    });
    this.geometries.push(barrelGeo);
    this.materials.push(barrelMat);
    const barrel = new Mesh(barrelGeo, barrelMat);
    barrel.position.set(0.15, -0.12, -0.75);
    group.add(barrel);

    return group;
  }

  /** 显示枪口火光。 */
  private showMuzzleFlash(): void {
    this.muzzleFlash.visible = true;
    this.muzzleFlashRemaining = MUZZLE_FLASH_DURATION_MS;
  }

  /** 从屏幕中心发射射线检测命中目标。 */
  private castRay(): void {
    this.raycaster.setFromCamera(SCREEN_CENTER, this.camera);
    this.raycaster.far = this.maxRayDistance;

    const intersects: Intersection<Object3D>[] =
      this.raycaster.intersectObjects(this.targets, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object && hit.point) {
        this.onHit?.(hit.object, hit.point);
      }
    }
  }

  /** 通知弹药状态变化。 */
  private notifyAmmoChange(): void {
    this.onAmmoChange?.(this.getAmmo());
  }

  /** 通知弹药耗尽。 */
  private notifyEmpty(): void {
    this.onEmpty?.();
  }

  // ===== 事件处理 =====

  private handleMouseDown(): void {
    // 仅左键触发开火
    this.firing = true;
  }

  private handleMouseUp(): void {
    this.firing = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      this.reload();
    }
  }

  // ===== UI 元素 =====

  /** 创建准星 DOM 元素。 */
  private createCrosshair(): void {
    if (document.getElementById(CROSSHAIR_ID)) return;
    const el = document.createElement('div');
    el.id = CROSSHAIR_ID;
    el.style.cssText = [
      'position:fixed',
      'top:50%',
      'left:50%',
      'width:20px',
      'height:20px',
      'margin-left:-10px',
      'margin-top:-10px',
      'pointer-events:none',
      'z-index:1000',
    ].join(';');

    // 准星由 4 条线组成（十字）
    const lineStyle = 'position:absolute;background:rgba(255,255,255,0.8);';
    el.innerHTML = [
      `<span style="${lineStyle}left:9px;top:0;width:2px;height:8px;"></span>`,
      `<span style="${lineStyle}left:9px;top:12px;width:2px;height:8px;"></span>`,
      `<span style="${lineStyle}left:0;top:9px;width:8px;height:2px;"></span>`,
      `<span style="${lineStyle}left:12px;top:9px;width:8px;height:2px;"></span>`,
    ].join('');
    document.body.appendChild(el);
  }

  /** 移除准星。 */
  private removeCrosshair(): void {
    document.getElementById(CROSSHAIR_ID)?.remove();
  }

  /** 创建换弹提示 DOM 元素（默认隐藏）。 */
  private createReloadHint(): void {
    if (document.getElementById(RELOAD_HINT_ID)) return;
    const el = document.createElement('div');
    el.id = RELOAD_HINT_ID;
    el.style.cssText = [
      'position:fixed',
      'top:60%',
      'left:50%',
      'transform:translateX(-50%)',
      'color:#ff6600',
      'font-size:18px',
      'font-family:monospace',
      'background:rgba(0,0,0,0.5)',
      'padding:4px 12px',
      'border-radius:4px',
      'pointer-events:none',
      'z-index:1000',
      'display:none',
    ].join(';');
    el.textContent = '换弹中...';
    document.body.appendChild(el);
  }

  /** 显示/隐藏换弹提示。 */
  private showReloadHint(show: boolean): void {
    const el = document.getElementById(RELOAD_HINT_ID);
    if (el) el.style.display = show ? 'block' : 'none';
  }

  /** 移除换弹提示。 */
  private removeReloadHint(): void {
    document.getElementById(RELOAD_HINT_ID)?.remove();
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  MAGAZINE_SIZE,
  FIRE_INTERVAL_MS,
  RELOAD_DURATION,
  MAX_RAY_DISTANCE,
  MUZZLE_FLASH_DURATION_MS,
};
