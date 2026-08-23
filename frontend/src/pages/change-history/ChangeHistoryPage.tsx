/**
 * 变更历史页面 — 分配变更历史查询与 CSV 导出
 * 需求 7078969349：按时间/部门/操作类型筛选，表格展示，导出 CSV
 */

import { useState, useEffect, useCallback } from 'react';
import { changeLogApi } from '../../api/change-log-api';
import { apiGet } from '../../api/client';
import type {
  ChangeLogWithDetail,
  ChangeLogAction,
  Department,
  PaginatedResponse,
} from '@seat-mgmt/shared';
import { TableSkeleton, EmptyState } from '../../components/feedback';

/** 操作类型选项 */
const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'assign', label: '分配' },
  { value: 'unassign', label: '取消分配' },
  { value: 'transfer', label: '转移' },
  { value: 'batch_assign', label: '批量分配' },
  { value: 'create_seat', label: '创建工位' },
  { value: 'update_seat', label: '更新工位' },
  { value: 'delete_seat', label: '删除工位' },
  { value: 'book', label: '预约' },
  { value: 'cancel_booking', label: '取消预约' },
  { value: 'import', label: '导入' },
];

/** 操作类型中文标签映射 */
const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

/** 操作类型颜色 */
const ACTION_COLORS: Record<string, string> = {
  assign: 'bg-blue-100 text-blue-800',
  unassign: 'bg-gray-100 text-gray-600',
  transfer: 'bg-amber-100 text-amber-800',
  batch_assign: 'bg-indigo-100 text-indigo-800',
  create_seat: 'bg-green-100 text-green-800',
  update_seat: 'bg-yellow-100 text-yellow-800',
  delete_seat: 'bg-red-100 text-red-800',
  book: 'bg-purple-100 text-purple-800',
  cancel_booking: 'bg-gray-100 text-gray-600',
  import: 'bg-teal-100 text-teal-800',
};

/** 筛选条件 */
interface ChangeLogFilters {
  action: string;
  departmentId: string;
  startDate: string;
  endDate: string;
}

/** 变更历史页面 */
export function ChangeHistoryPage() {
  const [filters, setFilters] = useState<ChangeLogFilters>({
    action: '',
    departmentId: '',
    startDate: '',
    endDate: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<ChangeLogFilters>(filters);

  const [data, setData] = useState<PaginatedResponse<ChangeLogWithDetail> | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  /** 加载部门列表（筛选下拉用） */
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

  /** 加载变更日志列表 */
  const loadChangeLogs = useCallback(async (p: number, currentFilters: ChangeLogFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await changeLogApi.listChangeLogs({
        action: (currentFilters.action || undefined) as ChangeLogAction | undefined,
        departmentId: currentFilters.departmentId ? Number(currentFilters.departmentId) : undefined,
        startDate: currentFilters.startDate || undefined,
        endDate: currentFilters.endDate || undefined,
        page: p,
        pageSize,
      });
      setData(result);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载变更历史失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 初始加载 */
  useEffect(() => {
    void loadChangeLogs(1, appliedFilters);
  }, [loadChangeLogs, appliedFilters]);

  /** 点击查询按钮 */
  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  /** 重置筛选 */
  const handleReset = () => {
    const emptyFilters: ChangeLogFilters = {
      action: '',
      departmentId: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  /** 导出 CSV */
  const handleExport = async () => {
    setExporting(true);
    try {
      changeLogApi.exportChangeLogs({
        action: (appliedFilters.action || undefined) as ChangeLogAction | undefined,
        departmentId: appliedFilters.departmentId ? Number(appliedFilters.departmentId) : undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
      });
    } finally {
      // window.open 是同步触发，短暂延迟后恢复按钮
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">变更历史</h2>
          <p className="text-sm text-gray-500 mt-1">
            查看分配变更记录，支持按时间、部门、操作类型筛选并导出 CSV
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || (data?.total ?? 0) === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? '导出中...' : '导出 CSV'}
        </button>
      </div>

      {/* 筛选条件 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 操作类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">全部</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 部门 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">全部</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 开始日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* 结束日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            查询
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && !data ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工位</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">员工</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">部门</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">原因</th>
              </tr>
            </thead>
            <TableSkeleton columns={8} />
          </table>
        ) : data && data.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    操作类型
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工位</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">员工</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">部门</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">原因</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((log) => {
                  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
                  const actionColor = ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600';
                  // 工位显示：transfer 显示新旧工位，其他显示当前工位
                  let seatDisplay = log.seatCode ?? (log.seatId != null ? `#${log.seatId}` : '—');
                  if (log.action === 'transfer') {
                    const oldSeat =
                      log.oldSeatCode ?? (log.oldSeatId != null ? `#${log.oldSeatId}` : '?');
                    const newSeat =
                      log.newSeatCode ?? (log.newSeatId != null ? `#${log.newSeatId}` : '?');
                    seatDisplay = `${oldSeat} → ${newSeat}`;
                  }
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{log.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.createdAt}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${actionColor}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{log.operator || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{seatDisplay}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {log.employeeName != null ? (
                          <>
                            {log.employeeName}
                            {log.employeeEmpNo && (
                              <span className="text-gray-400 ml-1">({log.employeeEmpNo})</span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.employeeDepartmentName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{log.reason ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="暂无变更记录" icon="📋" />
        )}
      </div>

      {/* 分页 */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => void loadChangeLogs(page - 1, appliedFilters)}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            {page} / {data.totalPages}（共 {data.total} 条）
          </span>
          <button
            onClick={() => void loadChangeLogs(page + 1, appliedFilters)}
            disabled={page >= data.totalPages || loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
