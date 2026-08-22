/**
 * 仪表盘页面 — 显示系统概览（脚手架占位）
 */

export function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">仪表盘</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">工位总数</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">空闲工位</p>
          <p className="text-3xl font-bold text-green-600 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">已分配工位</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">—</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">员工总数</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">—</p>
        </div>
      </div>
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-sm text-blue-700">
          脚手架已就绪。后续需求将在此页面展示统计数据和图表。
        </p>
      </div>
    </div>
  );
}
