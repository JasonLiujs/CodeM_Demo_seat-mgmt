/**
 * floor-plan-editor 组件统一导出
 * 需求 7078968348：SVG 平面图编辑器
 */

export { FloorPlanEditor } from './FloorPlanEditor';
export { PropertyPanel } from './PropertyPanel';
export {
  InteractionMode,
  normalizeRect,
  computeResizeRect,
} from './types';
export type {
  ResizeHandle,
  DrawState,
  MoveState,
  ResizeState,
  DragState,
} from './types';
