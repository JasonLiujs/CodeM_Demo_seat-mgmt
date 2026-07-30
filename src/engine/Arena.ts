/**
 * Arena 场景：构建 3D 封闭竞技场，包含地板、围墙、掩体与光照。
 *
 * 负责内容：
 * - 地板（PlaneGeometry）
 * - 四面围墙（BoxGeometry）
 * - 若干掩体方块（BoxGeometry），对称分布保证视野与移动空间
 * - 环境光 + 方向光，确保明暗可见且不过曝
 *
 * 对外接口约定：
 * - new Arena(scene)：将场景几何体加入传入的 THREE.Scene，并持有光照引用
 * - arena.update(delta)：每帧更新入口（当前为空，掩体静态）
 * - arena.dispose()：移除所有几何体与材质，释放资源
 *
 * 后续需求接入方式：
 * - 玩家控制器通过 Arena.ARENA_SIZE / WALL_HEIGHT 获取边界约束
 * - 武器/敌人系统通过 Arena.getObstacles() 获取掩体包围盒做碰撞检测
 */
import type {
  Scene} from 'three';
import {
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  AmbientLight,
  DirectionalLight,
  Group,
  type BufferGeometry,
} from 'three';

/** 竞技场边长（正方形），单位：Three.js 世界单位。验收要求约 40x40。 */
export const ARENA_SIZE = 40;

/** 围墙高度。 */
export const WALL_HEIGHT = 4;

/** 围墙厚度。 */
export const WALL_THICKNESS = 1;

/** 地板颜色（深灰）。 */
const FLOOR_COLOR = 0x3a3f4b;

/** 围墙颜色（中灰蓝）。 */
const WALL_COLOR = 0x4a5568;

/** 掩体颜色（暖灰，与地板/墙区分）。 */
const OBSTACLE_COLOR = 0x8b6f47;

/** 环境光强度（不过曝）。 */
const AMBIENT_LIGHT_INTENSITY = 0.6;

/** 方向光强度（与环境光搭配，避免局部过曝）。 */
const DIRECTIONAL_LIGHT_INTENSITY = 0.8;

/** 掩体布局配置：以中心对称放置，保证视野与移动空间。 */
const OBSTACLE_LAYOUT: ReadonlyArray<ObstacleBox> = [
  { x: -8, z: -8, width: 3, depth: 3, height: 2 },
  { x: 8, z: -8, width: 3, depth: 3, height: 2 },
  { x: -8, z: 8, width: 3, depth: 3, height: 2 },
  { x: 8, z: 8, width: 3, depth: 3, height: 2 },
  { x: 0, z: 0, width: 4, depth: 1.5, height: 1.5 },
  { x: -12, z: 0, width: 1.5, depth: 4, height: 1.5 },
  { x: 12, z: 0, width: 1.5, depth: 4, height: 1.5 },
];

/** 掩体包围盒描述，供碰撞检测使用。 */
export interface ObstacleBox {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/**
 * 竞技场场景模块。
 *
 * 使用方式：
 *   const arena = new Arena(scene);
 *   // 在 Game.update 中调用 arena.update(delta)
 *   // 销毁时调用 arena.dispose()
 */
export class Arena {
  /** 所有可销毁资源：几何体与材质。 */
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: MeshStandardMaterial[] = [];
  /** 场景中所有网格与光源，dispose 时从 scene 移除。 */
  private readonly disposables: Array<Mesh | AmbientLight | DirectionalLight> = [];
  /** 整体容器，便于一次性从 scene 移除。 */
  private readonly group: Group;
  /** 方向光引用，后续天气/昼夜需求可调整。 */
  readonly directionalLight: DirectionalLight;
  /** 环境光引用。 */
  readonly ambientLight: AmbientLight;

  constructor(scene: Scene) {
    this.group = new Group();
    this.group.name = 'arena';

    this.ambientLight = new AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
    this.group.add(this.ambientLight);
    this.disposables.push(this.ambientLight);

    this.directionalLight = new DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_INTENSITY);
    this.directionalLight.position.set(ARENA_SIZE * 0.4, ARENA_SIZE * 0.6, ARENA_SIZE * 0.3);
    this.directionalLight.target.position.set(0, 0, 0);
    this.group.add(this.directionalLight);
    this.group.add(this.directionalLight.target);
    this.disposables.push(this.directionalLight);

    this.buildFloor();
    this.buildWalls();
    this.buildObstacles();

    scene.add(this.group);
  }

  /** 构建地板。 */
  private buildFloor(): void {
    const geometry = new PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const material = new MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9, metalness: 0.1 });
    this.geometries.push(geometry);
    this.materials.push(material);
    const floor = new Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'arena-floor';
    this.group.add(floor);
    this.disposables.push(floor);
  }

  /** 构建四面围墙。 */
  private buildWalls(): void {
    const half = ARENA_SIZE / 2;
    const geometry = new BoxGeometry(ARENA_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    const material = new MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.8, metalness: 0.1 });
    this.geometries.push(geometry);
    this.materials.push(material);

    const wallConfigs: ReadonlyArray<{ x: number; z: number; rotY: number }> = [
      { x: 0, z: -half, rotY: 0 }, // 北墙
      { x: 0, z: half, rotY: 0 }, // 南墙
      { x: -half, z: 0, rotY: Math.PI / 2 }, // 西墙
      { x: half, z: 0, rotY: Math.PI / 2 }, // 东墙
    ];

    wallConfigs.forEach((cfg, index) => {
      const wall = new Mesh(geometry, material);
      wall.position.set(cfg.x, WALL_HEIGHT / 2, cfg.z);
      wall.rotation.y = cfg.rotY;
      wall.name = `arena-wall-${index}`;
      this.group.add(wall);
      this.disposables.push(wall);
    });
  }

  /** 构建掩体方块。 */
  private buildObstacles(): void {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({ color: OBSTACLE_COLOR, roughness: 0.7, metalness: 0.2 });
    this.geometries.push(geometry);
    this.materials.push(material);

    OBSTACLE_LAYOUT.forEach((cfg, index) => {
      const obstacle = new Mesh(geometry, material);
      obstacle.scale.set(cfg.width, cfg.height, cfg.depth);
      obstacle.position.set(cfg.x, cfg.height / 2, cfg.z);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      obstacle.name = `arena-obstacle-${index}`;
      this.group.add(obstacle);
      this.disposables.push(obstacle);
    });
  }

  /** 每帧更新入口。当前掩体为静态，预留后续动态效果扩展。 */
  update(_delta: number): void {
    // 静态场景，无每帧逻辑；后续需求可在此驱动掩体动画
  }

  /** 返回掩体包围盒列表，供碰撞检测使用。 */
  getObstacles(): readonly ObstacleBox[] {
    return OBSTACLE_LAYOUT;
  }

  /** 释放所有资源并从 scene 移除。 */
  dispose(scene: Scene): void {
    scene.remove(this.group);
    this.disposables.forEach((d) => {
      this.group.remove(d);
    });
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.geometries.length = 0;
    this.materials.length = 0;
    this.disposables.length = 0;
  }
}
