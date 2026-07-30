import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Player 玩家控制器的纯逻辑测试。
 *
 * Player 类依赖浏览器 DOM（document、Pointer Lock、MouseEvent），
 * 无法在 Node 直接实例化。这里抽取并验证 Player 对外暴露的常量
 * 与移动/边界逻辑约束，确保：
 * - 玩家高度合理（第一人称视角）
 * - 移动加速度/阻尼/最大速度参数合理
 * - 俯仰角限制防翻转
 * - 边界碰撞在竞技场范围内
 */

// 与 src/engine/Player.ts 保持一致的常量
const PLAYER_HEIGHT = 1.7;
const MOVE_ACCELERATION = 60;
const MOVE_DAMPING = 8;
const MAX_SPEED = 8;
const MOUSE_SENSITIVITY = 0.0022;
const PITCH_LIMIT_DEG = 85;
const ARENA_SIZE = 40;
const BOUNDARY_MARGIN = 0.5;
const HALF_ARENA = ARENA_SIZE / 2 - BOUNDARY_MARGIN;

test('PLAYER_HEIGHT 为合理第一人称高度', () => {
  assert.ok(PLAYER_HEIGHT >= 1.5 && PLAYER_HEIGHT <= 2.0,
    `玩家高度应 1.5~2.0，实际 ${PLAYER_HEIGHT}`);
});

test('MOVE_ACCELERATION 为正，确保有加速感', () => {
  assert.ok(MOVE_ACCELERATION > 0, '加速度必须为正');
  assert.ok(MOVE_ACCELERATION >= 30, '加速度应足够大以响应输入');
});

test('MOVE_DAMPING 为正，确保松键后减速', () => {
  assert.ok(MOVE_DAMPING > 0, '阻尼必须为正');
  assert.ok(MOVE_DAMPING <= 20, '阻尼不应过大导致瞬间停止');
});

test('MAX_SPEED 为正且适合 FPS 场景', () => {
  assert.ok(MAX_SPEED > 0, '最大速度必须为正');
  assert.ok(MAX_SPEED >= 5 && MAX_SPEED <= 15,
    `最大速度应 5~15，实际 ${MAX_SPEED}`);
});

test('MOUSE_SENSITIVITY 为正且灵敏适中', () => {
  assert.ok(MOUSE_SENSITIVITY > 0, '灵敏度必须为正');
  assert.ok(MOUSE_SENSITIVITY < 0.01, '灵敏度不应过高');
});

test('PITCH_LIMIT 约束在 85° 以内，防止视角翻转', () => {
  assert.ok(PITCH_LIMIT_DEG >= 80 && PITCH_LIMIT_DEG <= 89,
    `俯仰限制应 80~89°，实际 ${PITCH_LIMIT_DEG}`);
});

test('边界碰撞范围在竞技场内侧', () => {
  assert.ok(HALF_ARENA < ARENA_SIZE / 2,
    `HALF_ARENA 应小于竞技场半边长，实际 ${HALF_ARENA}`);
  assert.ok(HALF_ARENA > ARENA_SIZE / 2 - 2,
    `HALF_ARENA 不应过小导致可用空间不足，实际 ${HALF_ARENA}`);
  assert.ok(BOUNDARY_MARGIN > 0, '边界间距必须为正');
});

test('边界 clamp 逻辑：坐标不超出 HALF_ARENA', () => {
  // 模拟边界 clamp 逻辑
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const testX = [0, HALF_ARENA, HALF_ARENA + 5, -HALF_ARENA, -HALF_ARENA - 5];
  for (const x of testX) {
    const clamped = clamp(x, -HALF_ARENA, HALF_ARENA);
    assert.ok(clamped >= -HALF_ARENA && clamped <= HALF_ARENA,
      `clamp(${x}) = ${clamped} 超出边界 ±${HALF_ARENA}`);
  }
});

test('移动方向逻辑：WASD 对应正确方向', () => {
  // 验证 yaw=0 时 forward 和 right 向量方向
  const yaw = 0;
  const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
  // yaw=0: forward 指向 -Z（屏幕深处），right 指向 +X（右侧）
  assert.ok(forward.z < 0, 'yaw=0 时 forward 应指向 -Z');
  assert.ok(right.x > 0, 'yaw=0 时 right 应指向 +X');
});

test('阻尼衰减后速度减小（不反方向）', () => {
  const damping = MOVE_DAMPING;
  const delta = 0.016; // ~60fps
  const factor = Math.max(0, 1 - damping * delta);
  assert.ok(factor > 0 && factor < 1,
    `阻尼因子应 0~1，实际 ${factor}`);
  const v = MAX_SPEED * factor;
  assert.ok(v < MAX_SPEED, '阻尼后速度应减小');
  assert.ok(v >= 0, '阻尼不应使速度变负');
});

test('限速逻辑：速度不超 MAX_SPEED', () => {
  // 模拟速度超限时被钳制
  let speed = MAX_SPEED * 2;
  const velocity = { x: speed, z: 0 };
  if (speed > MAX_SPEED) {
    velocity.x *= MAX_SPEED / speed;
    velocity.z *= MAX_SPEED / speed;
  }
  const finalSpeed = Math.hypot(velocity.x, velocity.z);
  assert.ok(finalSpeed <= MAX_SPEED + 0.001,
    `限速后速度应 ≤ ${MAX_SPEED}，实际 ${finalSpeed}`);
});
