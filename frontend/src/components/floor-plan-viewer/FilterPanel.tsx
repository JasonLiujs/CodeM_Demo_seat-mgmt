/**
 * FilterPanel — 部门/区域/状态下拉筛选
 * 需求 7080593490：按部门、按区域、按状态筛选
 */

import type { SeatStatus } from '@seat-mgmt/shared';
import { STATUS_FILTER_OPTIONS } from './constants';

/** 筛选条件 */
export type SeatFilters = {
  /** 部门（按 assigneeName 降级匹配，空字符串=全部） */
  department?: string;
  /** 区域 */
  area?: string;
  /** 状态 */
  status?: SeatStatus | '';
};

/** FilterPanel Props */
type FilterPanelProps = {
  /** 筛选变化回调 */
  onFilterChange: (filters: SeatFilters) => void;
  /** 当前筛选值 */
  filters: SeatFilters;
  /** 可选区域列表（从工位数据聚合） */
  areaOptions: string[];
  /** 可选部门列表（从员工数据聚合，降级方案下为 assigneeName 维度） */
  departmentOptions: string[];
};

/**
 * FilterPanel — 三个下拉筛选器
 * 部门筛选：由于 SeatWithAssignee 无 department 字段，降级为按 assigneeName 匹配；
 * 此处 departmentOptions 由父组件从员工 API 获取部门名称后传入
 */
export function FilterPanel({
  onFilterChange,
  filters,
  areaOptions,
  departmentOptions,
}: FilterPanelProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">部门</label>
        <select
          aria-label="按部门筛选"
          value={filters.department ?? ''}
          onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">全部部门</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">区域</label>
        <select
          aria-label="按区域筛选"
          value={filters.area ?? ''}
          onChange={(e) => onFilterChange({ ...filters, area: e.target.value })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">全部区域</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">状态</label>
        <select
          aria-label="按状态筛选"
          value={filters.status ?? ''}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value as SeatStatus | '' })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
