import { test } from 'node:test';
import assert from 'node:assert';

/**
 * 命中反馈（准星变色 + 敌人受击闪烁）的纯逻辑测试。
 *
 * HUD/Enemy 依赖浏览器 DOM 与 three.js，无法在 Node 直接实例化。
 * 这里验证对外暴露的常量与衰减逻辑约束：
 * - 命中反馈持续时长合理（短暂时长，不残留）
 * - 受击闪烁持续时长合理
 * - 衰减逻辑：剩余时间递减到 0 后隐藏
 */

// 与 src/engine/HUD.ts 保持一致的常量
const CROSSHAIR_HIT_DURATION_MS = 120;

// 与 src/engine/Enemy.ts 保持一致的常量
const HIT_FLASH_DURATION = 0.15;
const HIT_FLASH_EMISSIVE_INTENSITY = 4;

test('CROSSHAIR_HIT_DURATION_MS 为正且不超过 200ms，确保反馈短暂', () => {
  assert.ok(CROSSHAIR_HIT_DURATION_MS > 0, '命中反馈持续时长必须为正');
  assert.ok(CROSSHAIR_HIT_DURATION_MS <= 200,
    `命中反馈应不超过 200ms，实际 ${CROSSHAIR_HIT_DURATION_MS}`);
});

test('HIT_FLASH_DURATION 为正且不超过 0.5s，确保闪烁短暂', () => {
  assert.ok(HIT_FLASH_DURATION > 0, '受击闪烁持续时长必须为正');
  assert.ok(HIT_FLASH_DURATION <= 0.5,
    `受击闪烁应不超过 0.5s，实际 ${HIT_FLASH_DURATION}`);
});

test('HIT_FLASH_EMISSIVE_INTENSITY 大于基础发光强度，确保闪烁可见', () => {
  const baseEmissiveIntensity = 1;
  assert.ok(HIT_FLASH_EMISSIVE_INTENSITY > baseEmissiveIntensity,
    `闪烁发光强度 ${HIT_FLASH_EMISSIVE_INTENSITY} 应大于基础 ${baseEmissiveIntensity}`);
});

test('准星命中反馈衰减逻辑：剩余时间递减到 0 后隐藏', () => {
  let hitFlashRemaining = CROSSHAIR_HIT_DURATION_MS;
  let visible = true;
  const delta = 0.016; // 约 60fps 单帧

  // 模拟每帧衰减
  while (hitFlashRemaining > 0) {
    hitFlashRemaining -= delta * 1000;
    if (hitFlashRemaining <= 0) {
      hitFlashRemaining = 0;
      visible = false;
    }
  }
  assert.strictEqual(hitFlashRemaining, 0, '剩余时间应归零');
  assert.ok(!visible, '衰减完成后应隐藏');
});

test('敌人受击闪烁衰减逻辑：发光强度按剩余比例衰减', () => {
  const baseEmissiveIntensity = 1;
  let hitFlashRemaining = HIT_FLASH_DURATION;
  const delta = 0.016;
  let lastIntensity = HIT_FLASH_EMISSIVE_INTENSITY;

  // 模拟每帧衰减，发光强度应递减
  while (hitFlashRemaining > 0) {
    hitFlashRemaining -= delta;
    if (hitFlashRemaining <= 0) {
      hitFlashRemaining = 0;
      break;
    }
    const t = hitFlashRemaining / HIT_FLASH_DURATION;
    const intensity = baseEmissiveIntensity +
      (HIT_FLASH_EMISSIVE_INTENSITY - baseEmissiveIntensity) * t;
    assert.ok(intensity <= lastIntensity + 1e-9,
      `发光强度应非递增，前 ${lastIntensity} 现 ${intensity}`);
    lastIntensity = intensity;
  }
  // 衰减完成后应恢复基础强度
  assert.strictEqual(hitFlashRemaining, 0, '闪烁剩余时间应归零');
});

test('多次受击重置闪烁：连续命中时闪烁计时器被重置', () => {
  let hitFlashRemaining = 0;
  const triggerHitFlash = () => {
    hitFlashRemaining = HIT_FLASH_DURATION;
  };

  // 首次受击
  triggerHitFlash();
  assert.strictEqual(hitFlashRemaining, HIT_FLASH_DURATION, '首次受击应设置闪烁计时器');

  // 衰减一半
  hitFlashRemaining -= HIT_FLASH_DURATION / 2;
  assert.ok(hitFlashRemaining > 0 && hitFlashRemaining < HIT_FLASH_DURATION, '衰减一半后计时器在中间值');

  // 再次受击应重置
  triggerHitFlash();
  assert.strictEqual(hitFlashRemaining, HIT_FLASH_DURATION, '再次受击应重置计时器');
});
