/**
 * 工位地图页面 — SVG 交互式渲染占位（脚手架）
 */

export function SeatMapPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">工位地图</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <svg viewBox="0 0 800 500" className="w-full h-auto border border-gray-200 rounded">
          <text x="400" y="250" textAnchor="middle" className="fill-gray-400 text-sm">
            平面图渲染区域（后续需求实现 SVG 交互式工位图）
          </text>
        </svg>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        FloorPlanViewer / FloorPlanEditor 组件将在后续需求中接入。
      </p>
    </div>
  );
}
