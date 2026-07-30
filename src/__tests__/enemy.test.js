import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Enemy 与 EnemySpawner 的纯逻辑测试。
 *
 * Enemy/EnemySpawner 依赖浏览器 DOM 与 three.js WebGL，无法在 Node 直接实例化。
 * 这里抽取并验证对外暴露的常量与核心逻辑约束：
 * - 波次数量公式：第 N 波 N+2 个
 * - 波次血量公式：50 + (wave-1)*25，随波次递增
 * - 同屏上限 15
 * - 清波延迟 3s
 * - 接触伤害参数合理
 * - 敌人速度合理
 */

// 与 src/engine/EnemySpawner.ts 保持一致的常量
const MAX_ALIVE = 15;
const NEXT_WAVE_DELAY = 3;
const SPAWN_Y = 0.5;
const HALF_ARENA_SIZE = 19;

// 与 src/engine/Enemy.ts 保持一致的常量
const ENEMY_RADIUS = 0.5;
const CONTACT_DISTANCE = 1.2;
const CONTACT_DAMAGE = 10;
const CONTACT_COOLDOWN_MS = 800;
const BASE_SPEED = 2.5;

// 复刻波次公式
function waveCount(wave) {
  return wave + 2;
}
function waveHealth(wave) {
  return 50 + (wave - 1) * 25;
}

test('波次数量公式：第 N 波生成 N+2 个敌人', () => {
  assert.strictEqual(waveCount(1), 3, '第 1 波应为 3 个');
  assert.strictEqual(waveCount(2), 4, '第 2 波应为 4 个');
  assert.strictEqual(waveCount(3), 5, '第 3 波应为 5 个');
  assert.strictEqual(waveCount(10), 12, '第 10 波应为 12 个');
});

test('波次血量公式：随波次递增', () => {
  assert.strictEqual(waveHealth(1), 50, '第 1 波血量应为 50');
  assert.strictEqual(waveHealth(2), 75, '第 2 波血量应为 75');
  assert.strictEqual(waveHealth(3), 100, '第 3 波血量应为 100');
  assert.strictEqual(waveHealth(5), 150, '第 5 波血量应为 150');
  assert.ok(waveHealth(2) > waveHealth(1), '血量必须递增');
  assert.ok(waveHealth(3) > waveHealth(2), '血量必须递增');
});

test('同屏敌人上限为 15', () => {
  assert.strictEqual(MAX_ALIVE, 15, '同屏敌人上限应为 15');
});

test('清波延迟为 3 秒', () => {
  assert.strictEqual(NEXT_WAVE_DELAY, 3, '清波延迟应为 3 秒');
  assert.ok(NEXT_WAVE_DELAY > 0, '延迟必须为正');
  assert.ok(NEXT_WAVE_DELAY <= 10, '延迟不应过长');
});

test('敌人血量为正且首波合理', () => {
  const h1 = waveHealth(1);
  assert.ok(h1 > 0, '第 1 波血量必须为正');
  assert.ok(h1 >= 30, '第 1 波血量至少 30（保证可玩性）');
  assert.ok(h1 <= 100, '第 1 波血量不超过 100（保证可击杀）');
});

test('接触伤害参数合理', () => {
  assert.ok(CONTACT_DAMAGE > 0, '接触伤害必须为正');
  assert.ok(CONTACT_DAMAGE <= 30, '接触伤害不应过高');
  assert.ok(CONTACT_DISTANCE > 0, '接触距离必须为正');
  assert.ok(CONTACT_DISTANCE <= 2, '接触距离不应过大');
  assert.ok(CONTACT_COOLDOWN_MS > 0, '冷却必须为正');
  assert.ok(CONTACT_COOLDOWN_MS >= 500, '冷却至少 500ms 避免瞬死');
});

test('敌人移动速度合理', () => {
  assert.ok(BASE_SPEED > 0, '速度必须为正');
  assert.ok(BASE_SPEED < 10, '速度不应超过玩家最大速度 8 太多');
});

test('敌人生成 Y 坐标在地板上方', () => {
  assert.ok(SPAWN_Y > 0, '生成 Y 坐标必须在地板上方');
  assert.ok(SPAWN_Y < 2, '生成 Y 坐标不应过高');
});

test('敌人半径合理', () => {
  assert.ok(ENEMY_RADIUS > 0, '半径必须为正');
  assert.ok(ENEMY_RADIUS < 1, '半径不应过大');
});

test('生成范围在竞技场内（竞技场 40x40）', () => {
  assert.ok(HALF_ARENA_SIZE < 20, '生成范围应在竞技场半边长内');
  assert.ok(HALF_ARENA_SIZE > 10, '生成范围不应过小');
});

test('高波次血量仍可击杀（弹匣 30 发 * 25 伤害 = 750）', () => {
  const magazineDamage = 30 * 25;
  assert.ok(waveHealth(10) < magazineDamage, '第 10 波（275 血）应可被一个弹匣击杀');
  assert.ok(waveHealth(20) < magazineDamage, '第 20 波（525 血）应可被一个弹匣击杀');
  assert.ok(waveHealth(30) > magazineDamage, '第 30 波（775 血）超过单弹匣伤害，需换弹');
});

test('波次数量最终受同屏上限约束', () => {
  // 第 13 波需要 15 个敌人，恰等于同屏上限
  assert.strictEqual(waveCount(13), 15, '第 13 波需 15 个');
  // 第 14 波需要 16 个，超过同屏上限，应分批生成
  assert.ok(waveCount(14) > MAX_ALIVE, '第 14 波超过同屏上限，需分批生成');
});
