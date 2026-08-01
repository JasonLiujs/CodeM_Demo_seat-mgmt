/**
 * audio/ 目录占位：音频系统模块（音效、背景音乐）。
 *
 * 后续「音效系统」需求在此目录下实现：
 * - 9 种音效：开火、换弹、命中、敌人死亡、玩家受伤、波次开始、波次结束、空弹提示、游戏结束
 * - 背景音乐：抗战主题循环 BGM
 *
 * 对外接口约定：
 * - AudioManager 类管理所有音效加载与播放
 * - audio.play(name)：播放指定音效
 * - audio.playBGM()：播放背景音乐
 * - audio.stopBGM()：停止背景音乐
 * - audio.setVolume(name, volume)：调节音量
 * - audio.dispose()：释放资源
 */
export {};
