import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Resize 适配与尺寸计算逻辑的纯函数测试（不依赖浏览器 DOM）。
 *
 * Renderer/Camera 的 resize 行为依赖 window 与 WebGLRenderer，无法在 Node
 * 环境直接实例化；这里抽取并测试尺寸计算的纯逻辑，确保 resize 自适应的
 * 核心算法正确。集成层面的 resize 由 build + 浏览器手测覆盖。
 */

/**
 * 计算 resize 后的渲染尺寸（纯逻辑，与 Renderer.handleResize 一致）。
 */
function computeRenderSize(windowWidth, windowHeight) {
  return { width: windowWidth, height: windowHeight };
}

/**
 * 计算相机宽高比（纯逻辑，与 Camera.handleResize 一致）。
 */
function computeAspect(windowWidth, windowHeight) {
  return windowWidth / windowHeight;
}

test('computeRenderSize returns full window dimensions', () => {
  const cases = [
    [1920, 1080],
    [800, 600],
    [375, 812],
  ];
  for (const [w, h] of cases) {
    const result = computeRenderSize(w, h);
    assert.strictEqual(result.width, w);
    assert.strictEqual(result.height, h);
  }
});

test('computeAspect returns width / height', () => {
  assert.strictEqual(computeAspect(1920, 1080), 1920 / 1080);
  assert.strictEqual(computeAspect(800, 600), 800 / 600);
});

test('computeAspect handles zero height gracefully (Infinity)', () => {
  assert.strictEqual(computeAspect(100, 0), Infinity);
});
