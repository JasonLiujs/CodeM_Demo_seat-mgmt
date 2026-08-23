/**
 * SeatShape — 单个工位 SVG 元素（只读查看器）
 * 需求 7080593490：按 seat.status 着色，hover 显示 tooltip，click 触发回调
 */

import { memo } from 'react';
import type { SeatWithAssignee } from '@seat-mgmt/shared';
import { SeatStatus } from '@seat-mgmt/shared';
import { STATUS_COLORS } from './constants';

/** SeatShape Props */
type SeatShapeProps = {
  /** 工位数据 */
  seat: SeatWithAssignee;
  /** 是否高亮闪烁（搜索命中） */
  highlighted: boolean;
  /** 鼠标进入工位 → 显示 tooltip */
  onHover: (seat: SeatWithAssignee | null) => void;
  /** 点击工位 → 跳转详情 */
  onClick: (seat: SeatWithAssignee) => void;
};

/** 工位框内文本字号 */
const TEXT_FONT_SIZE = 11;
/** 工位框最小宽高（小于此不渲染内部文本） */
const MIN_SIZE_FOR_TEXT = 36;

/**
 * SeatShape — 单个工位 rect + 文本标签
 * 只读模式：pointer-events 仅响应 hover/click，不触发拖拽
 */
function SeatShapeImpl({ seat, highlighted, onHover, onClick }: SeatShapeProps): React.JSX.Element {
  const color = STATUS_COLORS[seat.status] ?? STATUS_COLORS[SeatStatus.MAINTENANCE];
  const showAssignee = seat.status === SeatStatus.OCCUPIED && seat.assigneeName;
  const showReservation = seat.status === SeatStatus.RESERVED && seat.assigneeName;

  const labelText = showAssignee
    ? (seat.assigneeName ?? '')
    : showReservation
      ? (seat.assigneeName ?? '')
      : seat.code;

  return (
    <g
      data-seat-id={seat.id}
      onMouseEnter={() => onHover(seat)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(seat)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={seat.x}
        y={seat.y}
        width={seat.w}
        height={seat.h}
        fill={color}
        fillOpacity={highlighted ? 0.9 : 0.55}
        stroke={color}
        strokeWidth={highlighted ? 2.5 : 1.5}
        rx={2}
        style={highlighted ? { animation: 'highlight-flash 1.2s infinite ease-in-out' } : undefined}
      />
      {seat.w >= MIN_SIZE_FOR_TEXT && seat.h >= MIN_SIZE_FOR_TEXT && (
        <text
          x={seat.x + seat.w / 2}
          y={seat.y + seat.h / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: `${TEXT_FONT_SIZE}px`, pointerEvents: 'none', userSelect: 'none' }}
          fill="#ffffff"
          fontWeight={600}
        >
          {labelText}
        </text>
      )}
    </g>
  );
}

/** memo 优化：seat 引用不变时跳过重渲染 */
export const SeatShape = memo(SeatShapeImpl);
