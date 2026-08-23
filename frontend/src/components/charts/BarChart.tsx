/**
 * SVG 柱状图组件
 * 轻量手绘，不依赖 recharts
 */

type BarDatum = {
  label: string;
  value: number;
};

type Props = {
  data: BarDatum[];
  /** 图表高度 */
  height?: number;
  /** 柱状颜色 */
  color?: string;
  /** y 轴标题 */
  valueLabel?: string;
};

/** 柱状图 */
export function BarChart({ data, height = 260, color = '#3b82f6', valueLabel = '' }: Props) {
  const width = 560;
  const padding = { top: 20, right: 20, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  // 取整到合适的刻度
  const yMax = Math.ceil(maxValue * 1.1);
  const barCount = data.length;
  const barWidth = barCount > 0 ? (chartW / barCount) * 0.6 : 0;
  const barGap = barCount > 0 ? chartW / barCount : 0;

  // y 轴刻度（4 等分）
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="柱状图">
      {/* y 轴刻度线 */}
      {yTicks.map((tick) => {
        const y = padding.top + chartH - (tick / yMax) * chartH;
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6b7280">
              {tick}
            </text>
          </g>
        );
      })}

      {/* 柱子 */}
      {data.map((d, i) => {
        const barH = (d.value / yMax) * chartH;
        const x = padding.left + barGap * i + (barGap - barWidth) / 2;
        const y = padding.top + chartH - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={barH} fill={color} rx={4} />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={11}
              fill="#374151"
              fontWeight={600}
            >
              {d.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={padding.top + chartH + 18}
              textAnchor="middle"
              fontSize={11}
              fill="#6b7280"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* x 轴 */}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={width - padding.right}
        y2={padding.top + chartH}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      {/* y 轴标题 */}
      {valueLabel && (
        <text
          x={14}
          y={padding.top + chartH / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#6b7280"
          transform={`rotate(-90, 14, ${padding.top + chartH / 2})`}
        >
          {valueLabel}
        </text>
      )}
    </svg>
  );
}
