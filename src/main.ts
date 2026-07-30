/**
 * 应用入口：创建 Game 实例并启动主循环。
 *
 * 启动后显示主菜单，玩家点击「开始游戏」后进入游戏（请求 Pointer Lock）。
 * 死亡后显示结算面板，点击「重新开始」重置游戏。
 */
import { Game } from './Game.js';

const game = new Game();
game.start();

// 暴露到 window 便于开发调试与后续模块接入（生产环境可移除）
if (typeof window !== 'undefined') {
  (window as unknown as { __game: Game }).__game = game;
}

export { game };
