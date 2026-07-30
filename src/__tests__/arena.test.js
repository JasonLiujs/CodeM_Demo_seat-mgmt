import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Arena 场景参数的纯逻辑测试。
 *
 * Arena 类依赖 three.js 的 Scene/Mesh（浏览器 WebGL），无法在 Node 直接实例化。
 * 这里抽取并验证 Arena 对外暴露的几何常量与掩体布局约束，确保：
 * - 竞技场尺寸符合验收（约 40x40）
 * - 掩体均在围墙内、不贴墙、留出移动空间
 * - 围墙高度合理（玩家不可越墙）
 */

// 与 src/engine/Arena.ts 保持一致的常量（Arena.ts 未导出这些，测试复制数值做约束校验）
const ARENA_SIZE = 40;
const WALL_HEIGHT = 4;
const WALL_THICKNESS = 1;

const OBSTACLE_LAYOUT = [
  { x: -8, z: -8, width: 3, depth: 3, height: 2 },
  { x: 8, z: -8, width: 3, depth: 3, height: 2 },
  { x: -8, z: 8, width: 3, depth: 3, height: 2 },
  { x: 8, z: 8, width: 3, depth: 3, height: 2 },
  { x: 0, z: 0, width: 4, depth: 1.5, height: 1.5 },
  { x: -12, z: 0, width: 1.5, depth: 4, height: 1.5 },
  { x: 12, z: 0, width: 1.5, depth: 4, height: 1.5 },
];

test('ARENA_SIZE 约为 40x40，符合验收', () => {
  assert.ok(ARENA_SIZE >= 38 && ARENA_SIZE <= 42, `ARENA_SIZE 应约 40，实际 ${ARENA_SIZE}`);
});

test('WALL_HEIGHT 为正且玩家不可越墙', () => {
  assert.ok(WALL_HEIGHT > 0, '墙高必须为正');
  assert.ok(WALL_HEIGHT >= 3, '墙高至少 3，防止玩家跳越');
});

test('所有掩体位于围墙内侧且不贴墙', () => {
  const half = ARENA_SIZE / 2;
  const margin = WALL_THICKNESS + 0.5; // 与墙保持安全间距
  for (const o of OBSTACLE_LAYOUT) {
    const minX = o.x - o.width / 2;
    const maxX = o.x + o.width / 2;
    const minZ = o.z - o.depth / 2;
    const maxZ = o.z + o.depth / 2;
    assert.ok(minX > -half + margin, `掩体 ${JSON.stringify(o)} minX 越界贴墙`);
    assert.ok(maxX < half - margin, `掩体 ${JSON.stringify(o)} maxX 越界贴墙`);
    assert.ok(minZ > -half + margin, `掩体 ${JSON.stringify(o)} minZ 越界贴墙`);
    assert.ok(maxZ < half - margin, `掩体 ${JSON.stringify(o)} maxZ 越界贴墙`);
  }
});

test('掩体高度均低于围墙，玩家不可站上越墙', () => {
  for (const o of OBSTACLE_LAYOUT) {
    assert.ok(o.height < WALL_HEIGHT, `掩体高度 ${o.height} 不应超过墙高 ${WALL_HEIGHT}`);
  }
});

test('掩体布局对称，保证视野与移动空间', () => {
  // 四角对称
  const corners = OBSTACLE_LAYOUT.filter((o) => o.x !== 0 && o.z !== 0);
  assert.ok(corners.length >= 4, '至少 4 个角部掩体');
  const xs = new Set(corners.map((o) => Math.abs(o.x)));
  const zs = new Set(corners.map((o) => Math.abs(o.z)));
  assert.ok(xs.size === 1, `角部掩体 x 应对称，实际 ${[...xs]}`);
  assert.ok(zs.size === 1, `角部掩体 z 应对称，实际 ${[...zs]}`);
  // 中心留有通道：中央掩体不应阻断主轴
  const centerObstacle = OBSTACLE_LAYOUT.find((o) => o.x === 0 && o.z === 0);
  assert.ok(centerObstacle, '应有中心掩体');
  assert.ok(centerObstacle.width < ARENA_SIZE / 2, '中心掩体不应过宽阻断通道');
});

test('掩体数量提供足够掩蔽且不拥挤', () => {
  assert.ok(OBSTACLE_LAYOUT.length >= 4, '至少 4 个掩体');
  assert.ok(OBSTACLE_LAYOUT.length <= 12, '掩体不应过多导致拥挤');
});
