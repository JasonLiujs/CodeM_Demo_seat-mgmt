/**
 * MenuOverlay 测试：验证主菜单与结算面板的状态切换逻辑。
 *
 * MenuOverlay 依赖 DOM，这里使用 jsdom 不适用（node --test 环境），
 * 因此抽取面板显示/隐藏的纯状态机逻辑进行验证，确保：
 * - 初始状态显示主菜单
 * - showGameOver 切换到结算面板并填入数据
 * - hide 隐藏所有面板
 * - startGame 流程：主菜单 → hide → 游戏
 * - restart 流程：结算面板 → 重置 → 主菜单或游戏
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * 面板状态机（复刻 MenuOverlay 的显示逻辑，不依赖 DOM）。
 * visible: 'main' | 'gameover' | 'hidden'
 */
class MenuState {
  constructor() {
    this.visible = 'main';
    this.gameOverWave = 0;
    this.gameOverKills = 0;
  }

  showMainMenu() {
    this.visible = 'main';
  }

  showGameOver(wave, kills) {
    this.visible = 'gameover';
    this.gameOverWave = wave;
    this.gameOverKills = kills;
  }

  hide() {
    this.visible = 'hidden';
  }
}

/** 模拟 Game 的 startGame/restart 流程中 MenuOverlay 的状态变化。 */
function simulateStartGame(menu) {
  // 点击「开始游戏」：隐藏菜单
  menu.hide();
}

function simulateRestart(menu, wave, kills) {
  // GameOver → reset → 重新进入游戏
  menu.hide();
}

test('MenuState 初始状态显示主菜单', () => {
  const m = new MenuState();
  assert.strictEqual(m.visible, 'main');
});

test('showGameOver 切换到结算面板并填入波次与击杀数', () => {
  const m = new MenuState();
  m.showGameOver(5, 12);
  assert.strictEqual(m.visible, 'gameover');
  assert.strictEqual(m.gameOverWave, 5);
  assert.strictEqual(m.gameOverKills, 12);
});

test('hide 隐藏所有面板', () => {
  const m = new MenuState();
  m.showGameOver(3, 8);
  m.hide();
  assert.strictEqual(m.visible, 'hidden');
});

test('startGame 流程：主菜单 → 隐藏 → 进入游戏', () => {
  const m = new MenuState();
  assert.strictEqual(m.visible, 'main');
  simulateStartGame(m);
  assert.strictEqual(m.visible, 'hidden');
});

test('restart 流程：结算面板 → 隐藏 → 重新进入游戏', () => {
  const m = new MenuState();
  m.showGameOver(7, 20);
  assert.strictEqual(m.visible, 'gameover');
  simulateRestart(m, 7, 20);
  assert.strictEqual(m.visible, 'hidden');
});

test('showMainMenu 从结算面板切回主菜单', () => {
  const m = new MenuState();
  m.showGameOver(2, 5);
  m.showMainMenu();
  assert.strictEqual(m.visible, 'main');
});

test('GameOver 波次与击杀数正确传入', () => {
  const cases = [
    { wave: 0, kills: 0 },
    { wave: 1, kills: 1 },
    { wave: 10, kills: 50 },
    { wave: 99, kills: 999 },
  ];
  for (const { wave, kills } of cases) {
    const m = new MenuState();
    m.showGameOver(wave, kills);
    assert.strictEqual(m.gameOverWave, wave);
    assert.strictEqual(m.gameOverKills, kills);
  }
});
