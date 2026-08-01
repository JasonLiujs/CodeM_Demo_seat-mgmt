/**
 * effects/ 目录占位：粒子特效模块（枪口火光、弹道轨迹、血花粒子）。
 *
 * 后续「特效系统」需求在此目录下实现：
 * - 枪口火光：Sprite + AdditiveBlending，0.05s 消散
 * - 弹道轨迹：Line + 半透明材质，0.1s 淡出
 * - 血花粒子：BufferGeometry Points，20 粒子，0.3s 消散
 *
 * 对外接口约定：
 * - 每种特效导出一个 Effect 类，接收 THREE.Scene
 * - effect.spawn(position, direction)：触发特效
 * - effect.update(delta)：每帧更新，由 Game.update 调用
 * - effect.dispose()：释放资源
 */
export {};
