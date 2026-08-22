/**
 * FloorPlanViewer — 只读 SVG 平面图查看器主组件
 * 需求 7080593490：工位按状态着色，悬停 tooltip，搜索高亮，筛选，5s 轮询刷新
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type {
  SeatWithAssignee,
  SeatStatus,
  FloorPlanResponse,
  Department,
  EmployeeWithDepartment,
  PaginatedResponse,
} from '@seat-mgmt/shared';
import { floorPlanApi } from '../../api/seat-api';
import { apiGet } from '../../api/client';
import { useSeatPolling } from './use-seat-polling';
import { SeatShape } from './SeatShape';
import { SeatTooltip } from './SeatTooltip';
import type { SeatFilters } from './FilterPanel';
import styles from './FloorPlanViewer.module.css';

/**
 * FloorPlanViewer 完整 Props（扩展自 shared.FloorPlanViewerProps）
 * shared 仅定义 { floorPlanId, highlightSeatId?, highlightDepartment?, searchQuery?, filterStatus? }，
 * 本组件增加轮询、筛选、点击等能力，不回写 shared 以免破坏编辑器依赖。
 */
export interface FloorPlanViewerProps {
  /** 平面图 ID */
  floorPlanId: number;
  /** 外部传入的搜索查询（来自 SearchBar） */
  searchQuery?: string;
  /** 外部传入的筛选条件（来自 FilterPanel） */
  filters?: SeatFilters;
  /** 点击工位回调（跳转详情） */
  onSeatClick?: (seat: SeatWithAssignee) => void;
  /** 轮询间隔（毫秒），默认 5000 */
  pollingInterval?: number;
}

/** 默认平面图尺寸（未加载到底图时） */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * FloorPlanViewer — 只读平面图查看器
 * 组合 useSeatPolling + SeatShape + SeatTooltip，本地应用 search/filter 过滤
 */
export function FloorPlanViewer({
  floorPlanId,
  searchQuery = '',
  filters = {},
  onSeatClick,
  pollingInterval,
}: FloorPlanViewerProps): React.JSX.Element {
  const [hoveredSeat, setHoveredSeat] = useState<SeatWithAssignee | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlanResponse | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);

  // 加载平面图底图信息
  useEffect(() => {
    let cancelled = false;
    void floorPlanApi
      .listFloorPlans()
      .then((plans) => {
        if (cancelled) return;
        setFloorPlan(plans.find((p) => p.id === floorPlanId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setFloorPlan(null);
      });
    return () => {
      cancelled = true;
    };
  }, [floorPlanId]);

  // 加载部门与员工列表（用于部门筛选降级方案：按姓名→部门映射）
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiGet<Department[]>('/departments'),
      apiGet<PaginatedResponse<EmployeeWithDepartment>>('/employees?pageSize=500'),
    ])
      .then(([depts, empResult]) => {
        if (cancelled) return;
        setDepartments(depts);
        setEmployees(empResult.data);
      })
      .catch(() => {
        // 降级：部门/员工加载失败不影响核心查看功能
        if (!cancelled) {
          setDepartments([]);
          setEmployees([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { seats, isLoading, error } = useSeatPolling(floorPlanId, pollingInterval);

  /** 姓名→部门名映射（降级方案：SeatWithAssignee 无 department 字段） */
  const nameToDepartment = useMemo(() => {
    const map = new Map<string, string>();
    const deptMap = new Map<number, string>();
    departments.forEach((d) => deptMap.set(d.id, d.name));
    employees.forEach((e) => {
      if (e.name) {
        const deptName = e.departmentId ? (deptMap.get(e.departmentId) ?? '') : '';
        map.set(e.name, deptName);
      }
    });
    return map;
  }, [departments, employees]);

  /** 应用搜索 + 筛选 */
  const { filteredSeats, highlightIds } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchedBySearch = new Set<number>();

    const result = seats.filter((seat) => {
      // 搜索：按姓名匹配（assigneeName 包含 query），命中加入高亮集合
      if (query) {
        const name = seat.assigneeName?.toLowerCase() ?? '';
        if (name.includes(query)) {
          matchedBySearch.add(seat.id);
        }
      }

      // 部门筛选（降级：按 assigneeName → 部门名匹配）
      if (filters.department) {
        const seatDept = seat.assigneeName ? (nameToDepartment.get(seat.assigneeName) ?? '') : '';
        if (seatDept !== filters.department) return false;
      }

      // 区域筛选
      if (filters.area && seat.area !== filters.area) return false;

      // 状态筛选
      if (filters.status && seat.status !== filters.status) return false;

      return true;
    });

    return { filteredSeats: result, highlightIds: matchedBySearch };
  }, [seats, searchQuery, filters, nameToDepartment]);

  const handleSeatClick = useCallback(
    (seat: SeatWithAssignee) => {
      onSeatClick?.(seat);
    },
    [onSeatClick],
  );

  const width = floorPlan?.width ?? DEFAULT_WIDTH;
  const height = floorPlan?.height ?? DEFAULT_HEIGHT;
  const imageUrl = floorPlan?.imageUrl ?? '';

  return (
    <div className={`relative ${styles.viewerContainer}`}>
      {/* 加载/错误状态 */}
      {isLoading && seats.length === 0 && (
        <div className="text-center text-gray-400 py-4 text-sm">加载工位中...</div>
      )}
      {error && seats.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-gray-200 rounded bg-gray-50 select-none"
        role="img"
        aria-label="工位平面图"
      >
        {/* 底图 */}
        {imageUrl && (
          <image
            href={imageUrl}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        )}

        {/* 工位（只读：pointer-events 由 SeatShape 内 g 控制，仅 hover/click） */}
        {filteredSeats.map((seat) => (
          <SeatShape
            key={seat.id}
            seat={seat}
            highlighted={highlightIds.has(seat.id)}
            onHover={setHoveredSeat}
            onClick={handleSeatClick}
          />
        ))}
      </svg>

      {/* 悬停 tooltip */}
      <SeatTooltip seat={hoveredSeat} />

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <LegendItem color="#22c55e" label="空闲" />
        <LegendItem color="#3b82f6" label="已分配" />
        <LegendItem color="#eab308" label="已预约" />
        <LegendItem color="#9ca3af" label="维护中" />
      </div>
    </div>
  );
}

/** 图例单项 */
function LegendItem({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ backgroundColor: color, opacity: 0.55, border: `1.5px solid ${color}` }}
      />
      {label}
    </span>
  );
}

/** 导出 SeatStatus 类型供外部使用 */
export type { SeatStatus };
