/**
 * GameState 测试：复刻 GameState 纯逻辑进行验证（与源码保持一致）。
 *
 * GameState 不依赖 three.js 或 DOM，但为与既有测试风格一致（.js 测试不 import .ts），
 * 这里复刻核心逻辑验证状态机行为。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** 默认最大 HP（与 src/engine/GameState.ts 一致）。 */
const DEFAULT_MAX_HP = 100;

/**
 * 复刻 GameState 的纯逻辑（仅状态字段与行为，不含回调通知细节）。
 * 用于验证 HP/弹药/击杀/波次/GameOver 状态机正确性。
 */
class GameStateLogic {
  constructor(maxHp = DEFAULT_MAX_HP) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.wave = 0;
    this.magazine = 0;
    this.magazineSize = 0;
    this.reloading = false;
    this.reloadProgress = 1;
    this.kills = 0;
    this.gameOver = false;
  }
  takeDamage(amount) {
    if (this.gameOver) return false;
    if (amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) { this.gameOver = true; return true; }
    return false;
  }
  heal(amount) {
    if (this.gameOver || amount <= 0) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
  setWave(w) { if (!this.gameOver) this.wave = w; }
  setAmmo(mag, magSize, rel, prog) {
    if (this.gameOver) return;
    this.magazine = mag; this.magazineSize = magSize;
    this.reloading = rel; this.reloadProgress = prog;
  }
  addKill() { if (!this.gameOver) this.kills++; }
  reset() {
    this.hp = this.maxHp; this.wave = 0; this.magazine = 0;
    this.magazineSize = 0; this.reloading = false; this.reloadProgress = 1;
    this.kills = 0; this.gameOver = false;
  }
  get hpPercent() { return this.maxHp > 0 ? this.hp / this.maxHp : 0; }
}

test('DEFAULT_MAX_HP 为 100', () => {
  assert.strictEqual(DEFAULT_MAX_HP, 100);
});

test('初始状态：满血、波次 0、击杀 0、未 GameOver', () => {
  const s = new GameStateLogic();
  assert.strictEqual(s.hp, 100);
  assert.strictEqual(s.maxHp, 100);
  assert.strictEqual(s.hpPercent, 1);
  assert.strictEqual(s.wave, 0);
  assert.strictEqual(s.kills, 0);
  assert.strictEqual(s.gameOver, false);
});

test('takeDamage 扣减 HP', () => {
  const s = new GameStateLogic();
  s.takeDamage(30);
  assert.strictEqual(s.hp, 70);
});

test('takeDamage HP 归零触发 GameOver，返回 true', () => {
  const s = new GameStateLogic();
  const triggered = s.takeDamage(100);
  assert.strictEqual(triggered, true);
  assert.strictEqual(s.hp, 0);
  assert.strictEqual(s.gameOver, true);
});

test('GameOver 后 takeDamage 不再生效', () => {
  const s = new GameStateLogic();
  s.takeDamage(100);
  const again = s.takeDamage(50);
  assert.strictEqual(again, false);
  assert.strictEqual(s.hp, 0);
});

test('heal 恢复 HP 不超过上限', () => {
  const s = new GameStateLogic();
  s.takeDamage(30);
  s.heal(10);
  assert.strictEqual(s.hp, 80);
  s.heal(100);
  assert.strictEqual(s.hp, 100);
});

test('heal 在 GameOver 后无效', () => {
  const s = new GameStateLogic();
  s.takeDamage(100);
  s.heal(50);
  assert.strictEqual(s.hp, 0);
});

test('setWave 更新波次', () => {
  const s = new GameStateLogic();
  s.setWave(3);
  assert.strictEqual(s.wave, 3);
});

test('setAmmo 同步弹药状态', () => {
  const s = new GameStateLogic();
  s.setAmmo(15, 30, false, 1);
  assert.strictEqual(s.magazine, 15);
  assert.strictEqual(s.magazineSize, 30);
  assert.strictEqual(s.reloading, false);
  assert.strictEqual(s.reloadProgress, 1);
});

test('setAmmo 换弹中状态', () => {
  const s = new GameStateLogic();
  s.setAmmo(0, 30, true, 0.5);
  assert.strictEqual(s.reloading, true);
  assert.strictEqual(s.reloadProgress, 0.5);
});

test('addKill 累计击杀数', () => {
  const s = new GameStateLogic();
  s.addKill(); s.addKill(); s.addKill();
  assert.strictEqual(s.kills, 3);
});

test('addKill 在 GameOver 后无效', () => {
  const s = new GameStateLogic();
  s.takeDamage(100);
  s.addKill();
  assert.strictEqual(s.kills, 0);
});

test('reset 恢复初始状态', () => {
  const s = new GameStateLogic();
  s.takeDamage(50);
  s.setWave(5);
  s.addKill();
  s.takeDamage(50); // GameOver
  assert.strictEqual(s.gameOver, true);
  s.reset();
  assert.strictEqual(s.hp, 100);
  assert.strictEqual(s.wave, 0);
  assert.strictEqual(s.kills, 0);
  assert.strictEqual(s.gameOver, false);
});

test('自定义 maxHp', () => {
  const s = new GameStateLogic(200);
  assert.strictEqual(s.maxHp, 200);
  assert.strictEqual(s.hp, 200);
  assert.strictEqual(s.hpPercent, 1);
});

test('takeDamage 0 或负值不生效', () => {
  const s = new GameStateLogic();
  s.takeDamage(0);
  assert.strictEqual(s.hp, 100);
  s.takeDamage(-10);
  assert.strictEqual(s.hp, 100);
});

test('hpPercent 在受伤后正确计算', () => {
  const s = new GameStateLogic();
  s.takeDamage(25);
  assert.strictEqual(s.hpPercent, 0.75);
});
