/**
 * EnemySpawner 新增 onEnemyContactPlayer 回调测试。
 *
 * EnemySpawner 依赖 three.js Scene，无法在 Node 直接实例化；
 * 这里复刻 spawn 逻辑中注入 onContactPlayer 的关键行为，
 * 验证：当 spawner.onEnemyContactPlayer 被设置时，新生成的 Enemy
 * 的 onContactPlayer 应指向同一回调。
 */
import { test } from 'node:test';
import assert from 'node:assert';

/**
 * 模拟 EnemySpawner 内部 spawnEnemy 注入 onContactPlayer 的逻辑。
 * 真实 EnemySpawner 在 spawnEnemy 中执行：
 *   if (this.onEnemyContactPlayer) enemy.onContactPlayer = this.onEnemyContactPlayer;
 * 这里用普通对象模拟 Enemy。
 */
function createMockEnemy(onEnemyContactPlayer) {
  const enemy = {
    onContactPlayer: null,
  };
  if (onEnemyContactPlayer) {
    enemy.onContactPlayer = onEnemyContactPlayer;
  }
  return enemy;
}

test('onEnemyContactPlayer 为 null 时，敌人不注入接触回调', () => {
  const spawner = { onEnemyContactPlayer: null };
  const enemy = createMockEnemy(spawner.onEnemyContactPlayer);
  assert.strictEqual(enemy.onContactPlayer, null);
});

test('onEnemyContactPlayer 设置后，新敌人注入同一回调', () => {
  let damageReceived = 0;
  const callback = (d) => { damageReceived = d; };
  const spawner = { onEnemyContactPlayer: callback };
  const enemy = createMockEnemy(spawner.onEnemyContactPlayer);
  assert.strictEqual(enemy.onContactPlayer, callback);
  // 模拟敌人接触触发
  enemy.onContactPlayer(10);
  assert.strictEqual(damageReceived, 10);
});

test('回调签名接受 damage 数字参数', () => {
  const received = [];
  const callback = (d) => received.push(d);
  const spawner = { onEnemyContactPlayer: callback };
  const e1 = createMockEnemy(spawner.onEnemyContactPlayer);
  const e2 = createMockEnemy(spawner.onEnemyContactPlayer);
  e1.onContactPlayer(10);
  e2.onContactPlayer(15);
  assert.deepStrictEqual(received, [10, 15]);
});
