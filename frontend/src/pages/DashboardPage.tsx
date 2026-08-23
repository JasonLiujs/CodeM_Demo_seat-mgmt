/**
 * 统计看板页面
 * 需求 7080572472：实时利用率看板
 * 顶部数字卡片 + 按区域柱状图 + 30天趋势折线图 + 部门饼图
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  StatsOverview,
  StatsByArea,
  StatsByDepartment,
  StatsTrendPoint,
} from '@seat-mgmt/shared';
import { apiGet } from '../api/client';
import { BarChart, LineChart, PieChart } from '../components/charts';
import { Skeleton } from '../components/feedback';

/** 统计看板页面 */
export function DashboardPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [byArea, setByArea] = useState<StatsByArea[]>([]);
  const [trends, setTrends] = useState<StatsTrendPoint[]>([]);
  const [departments, setDepartments] = useState<StatsByDepartment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, areas, tr, depts] = await Promise.all([
        apiGet<StatsOverview>('/stats/overview'),
        apiGet<StatsByArea[]>('/stats/by-area'),
        apiGet<StatsTrendPoint[]>('/stats/trends?days=30'),
        apiGet<StatsByDepartment[]>('/stats/departments'),
      ]);
      setOverview(ov);
      setByArea(areas);
      setTrends(tr);
      setDepartments(depts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 利用率百分比
  const utilizationRate =
    overview && overview.totalSeats > 0
      ? Math.round((overview.occupiedSeats / overview.totalSeats) * 100)
      : 0;

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">统计看板</h2>
        {/* 顶部数字卡片骨架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-24 mt-2" />
            </div>
          ))}
        </div>
        {/* 图表区域骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">统计看板</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
        <button
          onClick={loadStats}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">统计看板</h2>
          <p className="text-sm text-gray-500 mt-1">实时工位利用率、区域统计、历史趋势与部门分布</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* 顶部数字卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">总工位</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{overview?.totalSeats ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">已分配</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{overview?.occupiedSeats ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">空闲</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{overview?.availableSeats ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">利用率</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{utilizationRate}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 rounded-full h-2 transition-all"
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 次级数字卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">预约中</p>
          <p className="text-xl font-semibold text-amber-600 mt-1">
            {overview?.reservedSeats ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">维护中</p>
          <p className="text-xl font-semibold text-red-500 mt-1">
            {overview?.maintenanceSeats ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">员工总数</p>
          <p className="text-xl font-semibold text-gray-700 mt-1">
            {overview?.totalEmployees ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">活跃预订</p>
          <p className="text-xl font-semibold text-indigo-600 mt-1">
            {overview?.activeBookings ?? 0}
          </p>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 按区域利用率柱状图 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">按区域统计</h3>
          <BarChart
            data={byArea.map((a) => ({
              label: a.area,
              value: a.occupied,
            }))}
            color="#3b82f6"
            valueLabel="已分配"
          />
        </div>

        {/* 部门分布饼图 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">部门分布</h3>
          <PieChart
            data={departments.map((d) => ({
              label: d.departmentName,
              value: d.totalEmployees,
            }))}
          />
        </div>
      </div>

      {/* 近 30 天利用率趋势折线图 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">近 30 天利用率趋势</h3>
        <LineChart
          data={trends.map((t) => ({
            label: t.date.slice(5), // MM-DD
            value: t.assigned,
          }))}
          color="#10b981"
          valueLabel="已分配"
        />
      </div>
    </div>
  );
}
