/**
 * HUD 界面：DOM 覆盖层，实时显示血量条、波次、弹药、击杀数与准星。
 *
 * 职责：
 * - 左下：血量条（随 HP 变化，HP 低时变红）
 * - 右上：当前波次
 * - 右下：弹药数 / 击杀数
 * - 屏幕中心：准星
 * - GameOver 覆盖层
 * - 通过 GameState.onStateChange 订阅状态刷新
 *
 * 对外接口约定：
 * - new HUD()：创建并挂载所有 DOM 元素
 * - hud.update(snapshot)：用 GameState 快照刷新界面
 * - hud.showGameOver()：显示 GameOver 覆盖层
 * - hud.hideGameOver()：隐藏 GameOver 覆盖层
 * - hud.dispose()：移除所有 DOM 元素
 *
 * 后续需求接入方式：
 * - Game 构造时创建 HUD，把 gameState.onStateChange 指向 hud.update
 * - GameOver 时调用 hud.showGameOver()
 */
import type { GameStateSnapshot } from './GameState.js';

/** 根容器 DOM ID。 */
const HUD_ROOT_ID = 'hud-root';
/** 血量条容器 ID。 */
const HUD_HP_ID = 'hud-hp';
/** 血量条填充 ID。 */
const HUD_HP_FILL_ID = 'hud-hp-fill';
/** 血量文本 ID。 */
const HUD_HP_TEXT_ID = 'hud-hp-text';
/** 波次文本 ID。 */
const HUD_WAVE_ID = 'hud-wave';
/** 弹药文本 ID。 */
const HUD_AMMO_ID = 'hud-ammo';
/** 击杀文本 ID。 */
const HUD_KILLS_ID = 'hud-kills';
/** 换弹提示 ID。 */
const HUD_RELOAD_ID = 'hud-reload-hint';
/** GameOver 覆盖层 ID。 */
const HUD_GAMEOVER_ID = 'hud-gameover';
/** 准星 ID。 */
const HUD_CROSSHAIR_ID = 'hud-crosshair';

/** HP 低于此百分比时血量条变红。 */
const LOW_HP_THRESHOLD = 0.3;

/**
 * HUD 覆盖层：用 DOM 元素显示游戏状态。
 *
 * 使用方式：
 *   const hud = new HUD();
 *   gameState.onStateChange = (snap) => hud.update(snap);
 *   // GameOver: hud.showGameOver();
 */
export class HUD {
  /** 根容器。 */
  private readonly root: HTMLDivElement;
  /** 血量条填充。 */
  private readonly hpFill: HTMLDivElement;
  /** 血量文本。 */
  private readonly hpText: HTMLDivElement;
  /** 波次文本。 */
  private readonly waveText: HTMLDivElement;
  /** 弹药文本。 */
  private readonly ammoText: HTMLDivElement;
  /** 击杀文本。 */
  private readonly killsText: HTMLDivElement;
  /** 换弹提示。 */
  private readonly reloadHint: HTMLDivElement;
  /** GameOver 覆盖层。 */
  private readonly gameOverEl: HTMLDivElement;

  /** 已创建的元素列表（dispose 用）。 */
  private readonly elements: HTMLElement[] = [];

  constructor() {
    this.root = this.createDiv(HUD_ROOT_ID, [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:100',
      'font-family:monospace',
    ]);

    // 准星
    this.elements.push(this.createCrosshair());

    // 左下血量条
    const hpContainer = this.createDiv(HUD_HP_ID, [
      'position:fixed',
      'bottom:20px',
      'left:20px',
      'width:200px',
      'height:24px',
      'background:rgba(0,0,0,0.5)',
      'border:2px solid rgba(255,255,255,0.6)',
      'border-radius:4px',
      'overflow:hidden',
    ]);
    this.hpFill = this.createDiv(HUD_HP_FILL_ID, [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'background:rgba(0,200,80,0.85)',
      'transition:width 0.15s ease, background 0.3s ease',
    ]);
    hpContainer.appendChild(this.hpFill);
    this.hpText = this.createDiv(HUD_HP_TEXT_ID, [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'color:#fff',
      'font-size:14px',
      'font-weight:bold',
      'text-shadow:1px 1px 2px #000',
    ]);
    hpContainer.appendChild(this.hpText);
    this.elements.push(hpContainer);

    // 右上波次
    const waveContainer = this.createDiv('hud-wave-container', [
      'position:fixed',
      'top:20px',
      'right:20px',
      'color:#fff',
      'font-size:20px',
      'font-weight:bold',
      'text-shadow:1px 1px 2px #000',
    ]);
    this.waveText = this.createDiv(HUD_WAVE_ID, []);
    this.waveText.textContent = '波次: 0';
    waveContainer.appendChild(this.waveText);
    this.elements.push(waveContainer);

    // 右下弹药 + 击杀
    const ammoContainer = this.createDiv('hud-ammo-container', [
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'color:#fff',
      'font-size:18px',
      'text-align:right',
      'text-shadow:1px 1px 2px #000',
    ]);
    this.ammoText = this.createDiv(HUD_AMMO_ID, []);
    this.ammoText.textContent = '弹药: 0 / 0';
    ammoContainer.appendChild(this.ammoText);
    this.killsText = this.createDiv(HUD_KILLS_ID, []);
    this.killsText.textContent = '击杀: 0';
    this.killsText.style.marginTop = '4px';
    ammoContainer.appendChild(this.killsText);
    this.elements.push(ammoContainer);

    // 换弹提示（默认隐藏）
    this.reloadHint = this.createDiv(HUD_RELOAD_ID, [
      'position:fixed',
      'top:60%',
      'left:50%',
      'transform:translateX(-50%)',
      'color:#ff6600',
      'font-size:18px',
      'background:rgba(0,0,0,0.5)',
      'padding:4px 12px',
      'border-radius:4px',
      'display:none',
    ]);
    this.reloadHint.textContent = '换弹中...';
    this.elements.push(this.reloadHint);

    // GameOver 覆盖层（默认隐藏）
    this.gameOverEl = this.createDiv(HUD_GAMEOVER_ID, [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'background:rgba(0,0,0,0.75)',
      'display:none',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'color:#ff4444',
      'font-size:48px',
      'font-weight:bold',
      'text-shadow:2px 2px 4px #000',
    ]);
    this.gameOverEl.textContent = 'GAME OVER';
    this.elements.push(this.gameOverEl);

    document.body.appendChild(this.root);
  }

  /**
   * 用 GameState 快照刷新 HUD。
   * @param snapshot 状态快照
   */
  update(snapshot: GameStateSnapshot): void {
    // 血量条
    const percent = Math.round(snapshot.hpPercent * 100);
    this.hpFill.style.width = `${percent}%`;
    this.hpText.textContent = `${Math.round(snapshot.hp)} / ${snapshot.maxHp}`;
    if (snapshot.hpPercent <= LOW_HP_THRESHOLD) {
      this.hpFill.style.background = 'rgba(220,40,40,0.9)';
    } else {
      this.hpFill.style.background = 'rgba(0,200,80,0.85)';
    }

    // 波次
    this.waveText.textContent = `波次: ${snapshot.wave}`;

    // 弹药
    if (snapshot.reloading) {
      this.ammoText.textContent = `换弹中 ${Math.round(snapshot.reloadProgress * 100)}%`;
      this.reloadHint.style.display = 'block';
    } else {
      this.ammoText.textContent = `弹药: ${snapshot.magazine} / ${snapshot.magazineSize}`;
      this.reloadHint.style.display = 'none';
    }

    // 击杀
    this.killsText.textContent = `击杀: ${snapshot.kills}`;

    // GameOver
    if (snapshot.gameOver) {
      this.showGameOver();
    }
  }

  /** 显示 GameOver 覆盖层。 */
  showGameOver(): void {
    this.gameOverEl.style.display = 'flex';
  }

  /** 隐藏 GameOver 覆盖层。 */
  hideGameOver(): void {
    this.gameOverEl.style.display = 'none';
  }

  /** 移除所有 DOM 元素。 */
  dispose(): void {
    for (const el of this.elements) {
      el.remove();
    }
    this.root.remove();
  }

  // ===== 内部方法 =====

  /** 创建带样式的 div。 */
  private createDiv(id: string, styles: string[]): HTMLDivElement {
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = styles.join(';');
    this.root.appendChild(el);
    return el;
  }

  /** 创建准星。 */
  private createCrosshair(): HTMLDivElement {
    const el = this.createDiv(HUD_CROSSHAIR_ID, [
      'position:fixed',
      'top:50%',
      'left:50%',
      'width:20px',
      'height:20px',
      'margin-left:-10px',
      'margin-top:-10px',
    ]);
    const lineStyle = 'position:absolute;background:rgba(255,255,255,0.8);';
    el.innerHTML = [
      `<span style="${lineStyle}left:9px;top:0;width:2px;height:8px;"></span>`,
      `<span style="${lineStyle}left:9px;top:12px;width:2px;height:8px;"></span>`,
      `<span style="${lineStyle}left:0;top:9px;width:8px;height:2px;"></span>`,
      `<span style="${lineStyle}left:12px;top:9px;width:8px;height:2px;"></span>`,
    ].join('');
    return el;
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  HUD_ROOT_ID,
  HUD_HP_ID,
  HUD_HP_FILL_ID,
  HUD_HP_TEXT_ID,
  HUD_WAVE_ID,
  HUD_AMMO_ID,
  HUD_KILLS_ID,
  HUD_RELOAD_ID,
  HUD_GAMEOVER_ID,
  HUD_CROSSHAIR_ID,
  LOW_HP_THRESHOLD,
};
