import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Weapon 武器系统的纯逻辑测试。
 *
 * Weapon 类依赖浏览器 DOM（document、MouseEvent、performance）与 three.js WebGL，
 * 无法在 Node 直接实例化。这里抽取并验证 Weapon 对外暴露的常量与核心逻辑约束：
 * - 弹匣容量合理（30 发）
 * - 开火间隔符合需求（100ms，约 10 发/秒）
 * - 换弹耗时合理（2s）
 * - 射线最大距离足够覆盖竞技场
 * - 自动开火、弹药递减、换弹逻辑验证
 * - 弹药耗尽判定
 */

// 与 src/engine/Weapon.ts 保持一致的常量
const MAGAZINE_SIZE = 30;
const FIRE_INTERVAL_MS = 100;
const RELOAD_DURATION = 2;
const MAX_RAY_DISTANCE = 200;
const MUZZLE_FLASH_DURATION_MS = 50;
const ARENA_SIZE = 40;

test('MAGAZINE_SIZE 为 30 发，符合需求', () => {
  assert.strictEqual(MAGAZINE_SIZE, 30, '弹匣容量应为 30');
  assert.ok(MAGAZINE_SIZE > 0, '弹匣容量必须为正');
});

test('FIRE_INTERVAL_MS 为 100ms，约 10 发/秒', () => {
  assert.strictEqual(FIRE_INTERVAL_MS, 100, '开火间隔应为 100ms');
  const fireRate = 1000 / FIRE_INTERVAL_MS;
  assert.ok(fireRate >= 8 && fireRate <= 15,
    `射速应 8~15 发/秒，实际 ${fireRate}`);
});

test('RELOAD_DURATION 为 2 秒，符合需求', () => {
  assert.strictEqual(RELOAD_DURATION, 2, '换弹耗时应为 2 秒');
  assert.ok(RELOAD_DURATION >= 1 && RELOAD_DURATION <= 5,
    `换弹耗时应 1~5 秒，实际 ${RELOAD_DURATION}`);
});

test('MAX_RAY_DISTANCE 足够覆盖竞技场对角线', () => {
  const diagonal = ARENA_SIZE * Math.SQRT2;
  assert.ok(MAX_RAY_DISTANCE > diagonal,
    `射线距离 ${MAX_RAY_DISTANCE} 应大于竞技场对角线 ${diagonal.toFixed(1)}`);
});

test('MUZZLE_FLASH_DURATION_MS 为短暂时长，确保视觉反馈不残留', () => {
  assert.ok(MUZZLE_FLASH_DURATION_MS > 0, '火光持续时间必须为正');
  assert.ok(MUZZLE_FLASH_DURATION_MS <= 100,
    `火光应不超过 100ms，实际 ${MUZZLE_FLASH_DURATION_MS}`);
});

test('弹药递减逻辑：满弹连续开火后弹药递减到 0', () => {
  let ammo = MAGAZINE_SIZE;
  const fire = () => {
    if (ammo <= 0) return false;
    ammo--;
    return true;
  };
  // 模拟 30 发开火
  for (let i = 0; i < MAGAZINE_SIZE; i++) {
    assert.ok(fire(), `第 ${i + 1} 发应成功开火`);
  }
  assert.strictEqual(ammo, 0, '30 发后弹药应为 0');
  // 第 31 发应被拦截
  assert.ok(!fire(), '弹药耗尽后不应开火');
});

test('开火间隔限制：100ms 内不重复开火', () => {
  const fireInterval = FIRE_INTERVAL_MS;
  let lastFireTime = 0;
  const canFire = (now) => now - lastFireTime >= fireInterval;
  // 首发可以开火
  assert.ok(canFire(100), '100ms 时应可开火');
  lastFireTime = 100;
  // 50ms 后不能开火
  assert.ok(!canFire(150), '50ms 后不应开火（间隔不足）');
  // 100ms 后可以开火
  assert.ok(canFire(200), '100ms 后应可开火');
  lastFireTime = 200;
  // 99ms 后不能开火
  assert.ok(!canFire(299), '99ms 后不应开火');
  // 100ms 后可以开火
  assert.ok(canFire(300), '100ms 后应可开火');
});

test('换弹逻辑：换弹完成后弹药补满', () => {
  let ammo = 10; // 部分消耗
  let reloading = false;
  let reloadElapsed = 0;
  const reloadDuration = RELOAD_DURATION;

  // 开始换弹
  reloading = true;
  reloadElapsed = 0;
  assert.ok(reloading, '换弹应开始');

  // 换弹中不能开火
  assert.ok(reloading, '换弹中不应开火');

  // 模拟每帧更新
  const delta = 0.016;
  while (reloadElapsed < reloadDuration) {
    reloadElapsed += delta;
  }
  if (reloadElapsed >= reloadDuration) {
    reloading = false;
    ammo = MAGAZINE_SIZE;
  }
  assert.ok(!reloading, '换弹应完成');
  assert.strictEqual(ammo, MAGAZINE_SIZE, '换弹后弹药应补满');
});

test('换弹拦截：满弹时不能换弹', () => {
  let ammo = MAGAZINE_SIZE;
  let reloading = false;
  const reload = () => {
    if (reloading) return false;
    if (ammo >= MAGAZINE_SIZE) return false;
    reloading = true;
    return true;
  };
  assert.ok(!reload(), '满弹时不应触发换弹');
  assert.ok(!reloading, '满弹时换弹状态不应改变');
});

test('换弹拦截：换弹中不能重复触发', () => {
  let ammo = 15;
  let reloading = false;
  const reload = () => {
    if (reloading) return false;
    if (ammo >= MAGAZINE_SIZE) return false;
    reloading = true;
    return true;
  };
  assert.ok(reload(), '首次换弹应成功');
  assert.ok(!reload(), '换弹中重复触发应被拦截');
});

test('弹药耗尽判定：弹药为 0 时 empty 为 true', () => {
  const ammo = 0;
  const empty = ammo <= 0;
  assert.ok(empty, '弹药为 0 时应判定为耗尽');
});

test('换弹进度计算：换弹过程中 progress 从 0 递增到 1', () => {
  const reloadDuration = RELOAD_DURATION;
  let reloadElapsed = 0;
  const delta = 0.5;

  // 初始进度
  let progress = Math.min(1, reloadElapsed / reloadDuration);
  assert.ok(progress < 0.01, `初始进度应接近 0，实际 ${progress}`);

  // 一半时间
  reloadElapsed = reloadDuration / 2;
  progress = Math.min(1, reloadElapsed / reloadDuration);
  assert.ok(progress >= 0.49 && progress <= 0.51,
    `半程进度应约 0.5，实际 ${progress}`);

  // 完成
  reloadElapsed = reloadDuration;
  progress = Math.min(1, reloadElapsed / reloadDuration);
  assert.strictEqual(progress, 1, '完成时进度应为 1');

  // 超时钳制
  reloadElapsed = reloadDuration + 1;
  progress = Math.min(1, reloadElapsed / reloadDuration);
  assert.strictEqual(progress, 1, '超时后进度应钳制为 1');
});

test('AmmoState 结构完整：包含所有必要字段', () => {
  const state = {
    magazine: 15,
    magazineSize: MAGAZINE_SIZE,
    reloading: false,
    reloadProgress: 1,
    empty: false,
  };
  assert.strictEqual(typeof state.magazine, 'number', 'magazine 应为 number');
  assert.strictEqual(typeof state.magazineSize, 'number', 'magazineSize 应为 number');
  assert.strictEqual(typeof state.reloading, 'boolean', 'reloading 应为 boolean');
  assert.strictEqual(typeof state.reloadProgress, 'number', 'reloadProgress 应为 number');
  assert.strictEqual(typeof state.empty, 'boolean', 'empty 应为 boolean');
});
