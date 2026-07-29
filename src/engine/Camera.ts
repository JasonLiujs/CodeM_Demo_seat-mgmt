/**
 * 相机模块：管理 PerspectiveCamera 与 resize 时的宽高比更新。
 * 后续需求（玩家控制器、武器）将在此模块基础上扩展。
 */
import { PerspectiveCamera } from 'three';

export interface CameraOptions {
  /** 初始视场角（度），默认 75。 */
  fov?: number;
  /** 近裁剪面，默认 0.1。 */
  near?: number;
  /** 远裁剪面，默认 1000。 */
  far?: number;
  /** 初始位置，默认 (0, 0, 5)。 */
  position?: [number, number, number];
}

/**
 * 游戏相机：透视相机，随窗口 resize 更新宽高比。
 */
export class Camera {
  readonly camera: PerspectiveCamera;
  private readonly resizeHandler: () => void;

  constructor(options: CameraOptions = {}) {
    const {
      fov = 75,
      near = 0.1,
      far = 1000,
      position = [0, 0, 5],
    } = options;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(position[0], position[1], position[2]);

    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.handleResize();
  }

  /** 窗口尺寸变化时更新相机宽高比并重投。 */
  handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** 移除事件监听。 */
  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }
}
