/**
 * 渲染器封装：WebGLRenderer + Scene 初始化与 Canvas 全屏自适应。
 * 负责创建 renderer、配置清屏色、监听窗口 resize 并更新渲染尺寸。
 *
 * 注意：Renderer 只持有 renderer 与 scene，不持有相机；
 * 相机由 Camera 模块管理，渲染时由 Game 注入。
 */
import { WebGLRenderer, Scene, Color } from 'three';

/** 清屏色（深蓝灰），验收标准要求"空场景渲染（清屏色可见）"。 */
export const CLEAR_COLOR = 0x1a1a2e;

export interface RendererOptions {
  /** 渲染目标 canvas 元素，默认使用 DOM 中 #game-canvas。 */
  canvas?: HTMLCanvasElement;
  /** 初始清屏色，默认 CLEAR_COLOR。 */
  clearColor?: number;
}

/**
 * 引擎渲染器：持有 renderer 与 scene，提供 resize 自适应与渲染帧接口。
 */
export class Renderer {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly resizeHandler: () => void;

  constructor(options: RendererOptions = {}) {
    this.canvas =
      options.canvas ??
      (document.getElementById('game-canvas') as HTMLCanvasElement | null) ??
      document.createElement('canvas');

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    powerPreference: 'high-performance',
    });
    // 限制像素比上限为 2，避免高 DPI 屏过度渲染拖累性能（60fps 目标）
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new Scene();
    this.scene.background = new Color(options.clearColor ?? CLEAR_COLOR);

    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    this.handleResize();
  }

  /** 窗口尺寸变化时同步更新 renderer 与 canvas。 */
  handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    // canvas 元素由 setSize 同步，无需手动设置 style
  }

  /** 释放资源并移除事件监听。 */
  dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
  }
}
