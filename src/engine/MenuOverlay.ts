/**
 * MenuOverlay 主菜单与结算面板：DOM 覆盖层，管理游戏开始前与死亡后的界面。
 *
 * 职责：
 * - 主菜单：标题 + 开始游戏按钮，点击后请求 Pointer Lock 进入游戏
 * - 结算面板：存活波次、击杀数、重新开始按钮，点击后重置游戏
 * - 通过回调与 Game 解耦：onStart / onRestart
 *
 * 对外接口约定：
 * - new MenuOverlay()：创建并挂载所有 DOM 元素（默认显示主菜单）
 * - menu.showMainMenu()：显示主菜单
 * - menu.showGameOver(wave, kills)：显示结算面板，填入存活波次与击杀数
 * - menu.hide()：隐藏所有覆盖层（进入游戏时调用）
 * - menu.onStart：点击「开始游戏」回调
 * - menu.onRestart：点击「重新开始」回调
 * - menu.dispose()：移除所有 DOM 元素与事件监听
 *
 * 后续需求接入方式：
 * - Game 构造时创建 MenuOverlay，把 onStart/onRestart 指向游戏流程控制
 * - GameState.onGameOver 时调用 menu.showGameOver(wave, kills)
 */
import type { GameStateSnapshot } from './GameState.js';

/** 主菜单根容器 DOM ID。 */
const MENU_ROOT_ID = 'menu-root';
/** 主菜单面板 ID。 */
const MENU_MAIN_ID = 'menu-main';
/** 开始游戏按钮 ID。 */
const MENU_START_BTN_ID = 'menu-start-btn';
/** 结算面板 ID。 */
const MENU_GAMEOVER_PANEL_ID = 'menu-gameover-panel';
/** 结算面板存活波次文本 ID。 */
const MENU_GO_WAVE_ID = 'menu-go-wave';
/** 结算面板击杀数文本 ID。 */
const MENU_GO_KILLS_ID = 'menu-go-kills';
/** 重新开始按钮 ID。 */
const MENU_RESTART_BTN_ID = 'menu-restart-btn';

/**
 * 主菜单与结算面板覆盖层。
 *
 * 使用方式：
 *   const menu = new MenuOverlay();
 *   menu.onStart = () => game.startGame();
 *   menu.onRestart = () => game.restart();
 */
export class MenuOverlay {
  /** 根容器。 */
  private readonly root: HTMLDivElement;
  /** 主菜单面板。 */
  private readonly mainPanel: HTMLDivElement;
  /** 开始游戏按钮。 */
  private readonly startBtn: HTMLButtonElement;
  /** 结算面板。 */
  private readonly gameOverPanel: HTMLDivElement;
  /** 结算面板存活波次文本。 */
  private readonly goWaveText: HTMLDivElement;
  /** 结算面板击杀数文本。 */
  private readonly goKillsText: HTMLDivElement;
  /** 重新开始按钮。 */
  private readonly restartBtn: HTMLButtonElement;

  /** 点击「开始游戏」回调。 */
  onStart: (() => void) | null = null;
  /** 点击「重新开始」回调。 */
  onRestart: (() => void) | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = MENU_ROOT_ID;
    this.root.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'pointer-events:none',
      'z-index:200',
      'font-family:monospace',
    ].join(';');

    // 主菜单面板
    this.mainPanel = document.createElement('div');
    this.mainPanel.id = MENU_MAIN_ID;
    this.mainPanel.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.85)',
      'pointer-events:auto',
    ].join(';');

    const title = document.createElement('h1');
    title.textContent = '枪战生存';
    title.style.cssText = [
      'color:#fff',
      'font-size:64px',
      'font-weight:bold',
      'margin-bottom:40px',
      'text-shadow:2px 2px 8px #000',
      'letter-spacing:8px',
    ].join(';');
    this.mainPanel.appendChild(title);

    this.startBtn = document.createElement('button');
    this.startBtn.id = MENU_START_BTN_ID;
    this.startBtn.textContent = '开始游戏';
    this.startBtn.style.cssText = [
      'padding:16px 48px',
      'font-size:24px',
      'font-family:monospace',
      'font-weight:bold',
      'color:#fff',
      'background:rgba(0,150,80,0.8)',
      'border:2px solid rgba(255,255,255,0.6)',
      'border-radius:8px',
      'cursor:pointer',
      'transition:background 0.2s ease',
    ].join(';');
    this.startBtn.addEventListener('mouseenter', () => {
      this.startBtn.style.background = 'rgba(0,200,100,0.9)';
    });
    this.startBtn.addEventListener('mouseleave', () => {
      this.startBtn.style.background = 'rgba(0,150,80,0.8)';
    });
    this.startBtn.addEventListener('click', () => this.onStart?.());
    this.mainPanel.appendChild(this.startBtn);

    this.root.appendChild(this.mainPanel);

    // 结算面板（默认隐藏）
    this.gameOverPanel = document.createElement('div');
    this.gameOverPanel.id = MENU_GAMEOVER_PANEL_ID;
    this.gameOverPanel.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      'width:100%',
      'height:100%',
      'display:none',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.85)',
      'pointer-events:auto',
    ].join(';');

    const goTitle = document.createElement('h1');
    goTitle.textContent = '你死了';
    goTitle.style.cssText = [
      'color:#ff4444',
      'font-size:56px',
      'font-weight:bold',
      'margin-bottom:32px',
      'text-shadow:2px 2px 8px #000',
    ].join(';');
    this.gameOverPanel.appendChild(goTitle);

    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = [
      'display:flex',
      'gap:60px',
      'margin-bottom:40px',
    ].join(';');

    const waveBlock = document.createElement('div');
    waveBlock.style.cssText = ['text-align:center'].join(';');
    const waveLabel = document.createElement('div');
    waveLabel.textContent = '存活波次';
    waveLabel.style.cssText = ['color:#aaa', 'font-size:18px', 'margin-bottom:8px'].join(';');
    this.goWaveText = document.createElement('div');
    this.goWaveText.id = MENU_GO_WAVE_ID;
    this.goWaveText.textContent = '0';
    this.goWaveText.style.cssText = ['color:#fff', 'font-size:40px', 'font-weight:bold'].join(';');
    waveBlock.appendChild(waveLabel);
    waveBlock.appendChild(this.goWaveText);
    statsContainer.appendChild(waveBlock);

    const killsBlock = document.createElement('div');
    killsBlock.style.cssText = ['text-align:center'].join(';');
    const killsLabel = document.createElement('div');
    killsLabel.textContent = '击杀数';
    killsLabel.style.cssText = ['color:#aaa', 'font-size:18px', 'margin-bottom:8px'].join(';');
    this.goKillsText = document.createElement('div');
    this.goKillsText.id = MENU_GO_KILLS_ID;
    this.goKillsText.textContent = '0';
    this.goKillsText.style.cssText = ['color:#fff', 'font-size:40px', 'font-weight:bold'].join(';');
    killsBlock.appendChild(killsLabel);
    killsBlock.appendChild(this.goKillsText);
    statsContainer.appendChild(killsBlock);

    this.gameOverPanel.appendChild(statsContainer);

    this.restartBtn = document.createElement('button');
    this.restartBtn.id = MENU_RESTART_BTN_ID;
    this.restartBtn.textContent = '重新开始';
    this.restartBtn.style.cssText = [
      'padding:16px 48px',
      'font-size:24px',
      'font-family:monospace',
      'font-weight:bold',
      'color:#fff',
      'background:rgba(0,150,80,0.8)',
      'border:2px solid rgba(255,255,255,0.6)',
      'border-radius:8px',
      'cursor:pointer',
      'transition:background 0.2s ease',
    ].join(';');
    this.restartBtn.addEventListener('mouseenter', () => {
      this.restartBtn.style.background = 'rgba(0,200,100,0.9)';
    });
    this.restartBtn.addEventListener('mouseleave', () => {
      this.restartBtn.style.background = 'rgba(0,150,80,0.8)';
    });
    this.restartBtn.addEventListener('click', () => this.onRestart?.());
    this.gameOverPanel.appendChild(this.restartBtn);

    this.root.appendChild(this.gameOverPanel);

    document.body.appendChild(this.root);
  }

  /** 显示主菜单（隐藏结算面板）。 */
  showMainMenu(): void {
    this.mainPanel.style.display = 'flex';
    this.gameOverPanel.style.display = 'none';
  }

  /**
   * 显示结算面板，填入存活波次与击杀数（隐藏主菜单）。
   * @param snapshot 游戏状态快照，从中读取 wave 与 kills
   */
  showGameOver(snapshot: GameStateSnapshot): void {
    this.mainPanel.style.display = 'none';
    this.gameOverPanel.style.display = 'flex';
    this.goWaveText.textContent = String(snapshot.wave);
    this.goKillsText.textContent = String(snapshot.kills);
  }

  /** 隐藏所有覆盖层（进入游戏时调用）。 */
  hide(): void {
    this.mainPanel.style.display = 'none';
    this.gameOverPanel.style.display = 'none';
  }

  /** 移除所有 DOM 元素。 */
  dispose(): void {
    this.root.remove();
  }
}

/** 导出常量供测试与后续模块使用。 */
export {
  MENU_ROOT_ID,
  MENU_MAIN_ID,
  MENU_START_BTN_ID,
  MENU_GAMEOVER_PANEL_ID,
  MENU_GO_WAVE_ID,
  MENU_GO_KILLS_ID,
  MENU_RESTART_BTN_ID,
};
