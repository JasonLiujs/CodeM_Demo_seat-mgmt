/**
 * SeatTooltip — 工位悬停详情 tooltip（受控）
 * 需求 7080593490：展示编号/分配人/区域/类型；reserved 额外展示预约人+时段
 */

import type { SeatWithAssignee } from '@seat-mgmt/shared';
import { SeatStatus } from '@seat-mgmt/shared';
import { STATUS_LABELS } from './constants';

/** SeatTooltip Props */
type SeatTooltipProps = {
  /** 当前悬停工位，null 时不渲染 */
  seat: SeatWithAssignee | null;
};

/**
 * SeatTooltip — 受控 tooltip 组件
 * 定位固定在工位框右下方（绝对定位由父容器决定时跟随鼠标）
 * 本组件只负责内容渲染；定位由 FloorPlanViewer 通过包裹层处理
 */
export function SeatTooltip({ seat }: SeatTooltipProps): React.JSX.Element | null {
  if (!seat) return null;

  const isReserved = seat.status === SeatStatus.RESERVED;

  return (
    <div
      role="tooltip"
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px] pointer-events-none"
      style={{ left: seat.x + seat.w + 6, top: seat.y }}
    >
      <div className="font-semibold text-gray-800 mb-1.5">{seat.code}</div>
      <dl className="space-y-0.5 text-gray-600">
        <div className="flex justify-between gap-2">
          <dt>状态</dt>
          <dd className="text-gray-800 font-medium">{STATUS_LABELS[seat.status]}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>区域</dt>
          <dd className="text-gray-800">{seat.area}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>类型</dt>
          <dd className="text-gray-800">{seat.type}</dd>
        </div>
        {seat.assigneeName && (
          <div className="flex justify-between gap-2">
            <dt>{isReserved ? '预约人' : '分配人'}</dt>
            <dd className="text-gray-800">{seat.assigneeName}</dd>
          </div>
        )}
        {isReserved && seat.assigneeEmpNo && (
          <div className="flex justify-between gap-2">
            <dt>工号</dt>
            <dd className="text-gray-800">{seat.assigneeEmpNo}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
