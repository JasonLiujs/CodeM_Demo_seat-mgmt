/**
 * 工位状态可视化平面图查看器 — 常量定义
 * 需求 7080593490：状态→颜色映射、状态标签文案
 */

import { SeatStatus } from '@seat-mgmt/shared';

/**
 * 工位状态→展示颜色映射
 * available→绿、occupied→蓝、reserved→黄、maintenance→灰
 */
export const STATUS_COLORS: Record<SeatStatus, string> = {
  [SeatStatus.AVAILABLE]: '#22c55e',
  [SeatStatus.OCCUPIED]: '#3b82f6',
  [SeatStatus.RESERVED]: '#eab308',
  [SeatStatus.MAINTENANCE]: '#9ca3af',
};

/**
 * 工位状态→标签文案映射
 */
export const STATUS_LABELS: Record<SeatStatus, string> = {
  [SeatStatus.AVAILABLE]: '空闲',
  [SeatStatus.OCCUPIED]: '已分配',
  [SeatStatus.RESERVED]: '已预约',
  [SeatStatus.MAINTENANCE]: '维护中',
};

/** 状态筛选下拉选项（含"全部"空值） */
export const STATUS_FILTER_OPTIONS: Array<{ value: SeatStatus | ''; label: string }> = [
  { value: '', label: '全部状态' },
  { value: SeatStatus.AVAILABLE, label: '空闲' },
  { value: SeatStatus.OCCUPIED, label: '已分配' },
  { value: SeatStatus.RESERVED, label: '已预约' },
  { value: SeatStatus.MAINTENANCE, label: '维护中' },
];

/** 搜索输入防抖延迟（毫秒） */
export const SEARCH_DEBOUNCE_MS = 300;

/** 轮询默认间隔（毫秒） */
export const DEFAULT_POLLING_INTERVAL = 5000;

/** 轮询单次请求的最大工位数（须 ≤ 后端 /api/seats 的 pageSize 上限 100） */
export const POLLING_PAGE_SIZE = 100;
