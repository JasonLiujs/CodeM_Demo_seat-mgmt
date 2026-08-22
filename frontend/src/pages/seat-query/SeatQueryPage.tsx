/**
 * 工位查询页面 — 员工查询自己工位 / 搜索同事 / 按部门筛选
 * 需求 7079669334：输入工号高亮自己工位、姓名搜索、部门筛选、无结果提示
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FloorPlanViewer,
  SearchBar,
  FilterPanel,
  type SeatFilters,
} from '../../components/floor-plan-viewer';
import { seatQueryApi } from '../../api/seat-query-api';
import { floorPlanApi } from '../../api/seat-api';
import { apiGet } from '../../api/client';
import type {
  EmployeeSeatResult,
  FloorPlanResponse,
  Department,
} from '@seat-mgmt/shared';

/** 工位查询页面 */
export function SeatQueryPage(): React.JSX.Element {
  // 工号查询
  const [empNoInput, setEmpNoInput] = useState('');
  const [queryResult, setQueryResult] = useState<EmployeeSeatResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // 高亮的工位 ID（工号查询命中后）
  const [highlightSeatId, setHighlightSeatId] = useState<number | undefined>(undefined);

  // 当前选中的平面图
  const [floorPlans, setFloorPlans] = useState<FloorPlanResponse[]>([]);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 搜索与筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SeatFilters>({});

  // 无结果提示（搜索或筛选后平面图上无匹配工位）
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  /** 是否显示「无结果」提示：有搜索/筛选条件且筛选后工位数为 0 */
  const noResult =
    filteredCount === 0 &&
    (searchQuery.trim() !== '' ||
      filters.department !== undefined ||
      filters.area !== undefined ||
      (filters.status !== undefined && filters.status !== ''));

  /** 加载平面图列表 */
  useEffect(() => {
    let cancelled = false;
    void floorPlanApi
      .listFloorPlans()
      .then((plans) => {
        if (cancelled) return;
        setFloorPlans(plans);
        if (plans.length > 0) {
          setSelectedFloorPlanId(plans[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setFloorPlans([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 加载部门列表（用于部门筛选下拉） */
  useEffect(() => {
    let cancelled = false;
    void apiGet<Department[]>('/departments')
      .then((depts) => {
        if (!cancelled) setDepartments(depts);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 工号查询 */
  const handleQuery = useCallback(async () => {
    const empNo = empNoInput.trim();
    if (!empNo) {
      setQueryError('请输入工号');
      return;
    }
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    setHighlightSeatId(undefined);
    try {
      const result = await seatQueryApi.getEmployeeSeat(empNo);
      setQueryResult(result);
      if (result.seat) {
        setHighlightSeatId(result.seat.id);
        // 自动切换到工位所在平面图
        if (result.seat.floorPlanId) {
          setSelectedFloorPlanId(result.seat.floorPlanId);
        }
      } else {
        setQueryError(`员工 ${result.employeeName}（${empNo}）暂无分配工位`);
      }
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setQueryLoading(false);
    }
  }, [empNoInput]);

  /** 部门选项 */
  const departmentOptions = useMemo(
    () => departments.map((d) => d.name).sort(),
    [departments],
  );

  /** 区域选项（从平面图维度提供占位，FloorPlanViewer 内部从 seats 聚合） */
  const areaOptions = useMemo(() => [], []);

  /** 当前平面图 */
  const currentFloorPlan = floorPlans.find((p) => p.id === selectedFloorPlanId) ?? null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">工位查询</h2>

      {/* 工号查询区 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">工号</label>
            <input
              type="text"
              value={empNoInput}
              onChange={(e) => setEmpNoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleQuery();
              }}
              placeholder="输入工号查询自己工位"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleQuery()}
            disabled={queryLoading}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {queryLoading ? '查询中...' : '查询工位'}
          </button>

          {/* 平面图选择 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">平面图</label>
            <select
              value={selectedFloorPlanId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFloorPlanId(val ? Number(val) : null);
                setHighlightSeatId(undefined);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[200px]"
            >
              <option value="">— 请选择 —</option>
              {floorPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 工号查询结果 */}
        {queryResult && queryResult.seat && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            查询成功：<strong>{queryResult.employeeName}</strong>（{queryResult.empNo}）
            {queryResult.departmentName && ` · 部门：${queryResult.departmentName}`}
            {` · 工位：${queryResult.seat.code}（${queryResult.seat.area}）`}
          </div>
        )}
        {queryError && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            {queryError}
          </div>
        )}
      </div>

      {/* 搜索 + 筛选区 */}
      {currentFloorPlan && (
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
          <SearchBar onSearchChange={setSearchQuery} placeholder="按姓名搜索同事工位..." />
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            areaOptions={areaOptions}
            departmentOptions={departmentOptions}
          />
        </div>
      )}

      {/* 无结果提示 */}
      {noResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          未找到匹配的工位，请尝试调整搜索或筛选条件。
        </div>
      )}

      {/* 平面图查看器 */}
      {currentFloorPlan ? (
        <div className="bg-white rounded-lg shadow p-4">
          <FloorPlanViewer
            floorPlanId={currentFloorPlan.id}
            searchQuery={searchQuery}
            filters={filters}
            highlightSeatId={highlightSeatId}
          onFilteredCountChange={setFilteredCount}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-center h-96 text-gray-400 text-sm border border-dashed border-gray-200 rounded">
            请选择平面图
          </div>
        </div>
      )}
    </div>
  );
}
