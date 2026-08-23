/**
 * 工位管理页面 — 表格 + 筛选 + 分页
 * 需求 7080518042：前端工位管理页面基础
 */

import { useState, useEffect, useCallback } from 'react';
import { seatApi } from '../../api/seat-api';
import type { SeatWithAssignee, SeatStatus, SeatType } from '@seat-mgmt/shared';
import { TableSkeleton, EmptyState } from '../../components/feedback';
import { useToast } from '../../components/toast/useToast';

/** 筛选条件 */
interface FilterState {
  area: string;
  type: SeatType | '';
  status: SeatStatus | '';
}

/** 工位状态标签颜色映射 */
const statusColors: Record<SeatStatus, string> = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-blue-100 text-blue-800',
  reserved: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-red-100 text-red-800',
};

/** 工位状态中文标签 */
const statusLabels: Record<SeatStatus, string> = {
  available: '空闲',
  occupied: '已占用',
  reserved: '已预约',
  maintenance: '维护中',
};

/** 工位类型中文标签 */
const typeLabels: Record<SeatType, string> = {
  standard: '标准',
  standing: '站立',
  meeting: '会议',
  private: '独立',
};

export function SeatManagementPage() {
  const { showSuccess } = useToast();
  const [seats, setSeats] = useState<SeatWithAssignee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    area: '',
    type: '',
    status: '',
  });

  /** 加载工位列表 */
  const loadSeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await seatApi.listSeats({
        area: filter.area || undefined,
        type: (filter.type || undefined) as SeatType | undefined,
        status: (filter.status || undefined) as SeatStatus | undefined,
        page,
        pageSize,
      });
      setSeats(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize]);

  useEffect(() => {
    void loadSeats();
  }, [loadSeats]);

  /** 处理筛选 */
  const handleFilter = () => {
    setPage(1);
    void loadSeats();
  };

  /** 重置筛选 */
  const handleReset = () => {
    setFilter({ area: '', type: '', status: '' });
    setPage(1);
  };

  /** 删除工位 */
  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该工位？')) return;
    try {
      await seatApi.deleteSeat(id);
      showSuccess('删除成功');
      void loadSeats();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">工位管理</h2>

      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">区域</label>
            <input
              type="text"
              value={filter.area}
              onChange={(e) => setFilter({ ...filter, area: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              placeholder="如 A区"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">类型</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value as SeatType | '' })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">全部</option>
              <option value="standard">标准</option>
              <option value="standing">站立</option>
              <option value="meeting">会议</option>
              <option value="private">独立</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">状态</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as SeatStatus | '' })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">全部</option>
              <option value="available">空闲</option>
              <option value="occupied">已占用</option>
              <option value="reserved">已预约</option>
              <option value="maintenance">维护中</option>
            </select>
          </div>
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
          >
            筛选
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-300"
          >
            重置
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 工位表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                编码
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                区域
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                分配人
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton columns={7} />
            ) : seats.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="暂无工位数据" />
                </td>
              </tr>
            ) : (
              seats.map((seat) => (
                <tr key={seat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{seat.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{seat.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{seat.area}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{typeLabels[seat.type]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${statusColors[seat.status]}`}
                    >
                      {statusLabels[seat.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {seat.assigneeName ? `${seat.assigneeName}（${seat.assigneeEmpNo}）` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(seat.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="px-4 py-3 flex items-center justify-between border-t">
          <p className="text-sm text-gray-600">
            共 {total} 条，第 {page}/{totalPages} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
