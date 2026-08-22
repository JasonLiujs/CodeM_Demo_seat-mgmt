/**
 * FloorPlanEditor 内部类型定义
 * 需求 7078968348：SVG 平面图编辑器交互状态
 */

/** 交互模式 */
export enum InteractionMode {
  /** 空闲：无操作进行中 */
  IDLE = 'idle',
  /** 绘制新工位中 */
  DRAWING = 'drawing',
  /** 移动选中工位中 */
  MOVING = 'moving',
  /** 调整大小中 */
  RESIZING = 'resizing',
}

/** 调整大小的把手位置（8 个方向角点+边中点） */
export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

/** 拖拽绘制状态 */
export interface DrawState {
  /** 绘制起点（SVG viewBox 坐标） */
  startX: number;
  /** 绘制起点（SVG viewBox 坐标） */
  startY: number;
  /** 当前鼠标位置（SVG viewBox 坐标） */
  currentX: number;
  /** 当前鼠标位置（SVG viewBox 坐标） */
  currentY: number;
}

/** 移动状态 */
export interface MoveState {
  /** 拖拽开始时工位的 x */
  originX: number;
  /** 拖拽开始时工位的 y */
  originY: number;
  /** 拖拽开始时鼠标 x（SVG 坐标） */
  startX: number;
  /** 拖拽开始时鼠标 y（SVG 坐标） */
  startY: number;
}

/** 调整大小状态 */
export interface ResizeState {
  /** 原始工位 x */
  originX: number;
  /** 原始工位 y */
  originY: number;
  /** 原始工位宽度 */
  originW: number;
  /** 原始工位高度 */
  originH: number;
  /** 拖拽开始时鼠标 x（SVG 坐标） */
  startX: number;
  /** 拖拽开始时鼠标 y（SVG 坐标） */
  startY: number;
  /** 当前把手位置 */
  handle: ResizeHandle;
}

/** 拖拽状态联合类型 */
export type DragState = DrawState | MoveState | ResizeState;

/** 从 DrawState 计算矩形坐标（处理负宽高） */
export function normalizeRect(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): { x: number; y: number; w: number; h: number } {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(currentX - startX);
  const h = Math.abs(currentY - startY);
  return { x, y, w, h };
}

/** 根据 ResizeState 和当前鼠标位置计算调整后的矩形 */
export function computeResizeRect(
  state: ResizeState,
  mouseX: number,
  mouseY: number,
): { x: number; y: number; w: number; h: number } {
  const dx = mouseX - state.startX;
  const dy = mouseY - state.startY;
  let { originX: x, originY: y, originW: w, originH: h } = state;

  switch (state.handle) {
    case 'e':
      w = Math.max(10, state.originW + dx);
      break;
    case 'w':
      w = Math.max(10, state.originW - dx);
      x = state.originX + (state.originW - w);
      break;
    case 's':
      h = Math.max(10, state.originH + dy);
      break;
    case 'n':
      h = Math.max(10, state.originH - dy);
      y = state.originY + (state.originH - h);
      break;
    case 'se':
      w = Math.max(10, state.originW + dx);
      h = Math.max(10, state.originH + dy);
      break;
    case 'ne':
      w = Math.max(10, state.originW + dx);
      h = Math.max(10, state.originH - dy);
      y = state.originY + (state.originH - h);
      break;
    case 'sw':
      w = Math.max(10, state.originW - dx);
      x = state.originX + (state.originW - w);
      h = Math.max(10, state.originH + dy);
      break;
    case 'nw':
      w = Math.max(10, state.originW - dx);
      x = state.originX + (state.originW - w);
      h = Math.max(10, state.originH - dy);
      y = state.originY + (state.originH - h);
      break;
  }

  return { x, y, w, h };
}
