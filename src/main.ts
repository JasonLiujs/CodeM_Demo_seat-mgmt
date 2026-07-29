/**
 * 应用入口：创建 Game 实例并启动主循环。
 *
 * 后续需求接入方式：
 * - 在此处或 Game 构造函数中组合新模块（Player、EnemyManager 等）
 * - 通过 Game.update(delta) 扩展每帧逻辑
 */
import { Game } from './Game.js';

const game = new Game();
game.start();

// 暴露到 window 便于开发调试与后续模块接入（生产环境可移除）
if (typeof window !== 'undefined') {
  (window as unknown as { __game: Game }).__game = game;
}

export { game };
