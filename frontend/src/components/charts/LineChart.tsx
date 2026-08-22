/**
 * SVG 折线图组件
 * 轻量手绘，不依赖 recharts
 */

type LineDatum = {
  label: string;
  value: number;
};

type Props = {
  data: LineDatum[];
  /** 图表高度 */
  height?: number;
  /** 线条颜色 */
  color?: string;
  /** y 轴标题 */
  valueLabel?: string;
};

/** 折线图 */
export function LineChart({
  data,
  height = 260,
  color = '#10b981',
  valueLabel = '',
}: Props) {
  const width = 560;
  const padding = { top: 20, right: 20, bottom: 40, left: 48 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const yMax = Math.ceil(maxValue * 1.1);

  const pointCount = data.length;
  // x 坐标：均匀分布，单点时居中
  const xStep = pointCount > 1 ? chartW / (pointCount - 1) : 0;
  const points = data.map((d, i) => {
    const x = pointCount > 1 ? padding.left + xStep * i : padding.left + chartW / 2;
    const y = padding.top + chartH - (d.value / yMax) * chartH;
    return { x, y, ...d };
  });

  // y 轴刻度（4 等分）
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));

  // 折线路径
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // 填充区域路径
  const areaD =
    points.length > 0
      ? `M ${points[0].x} ${padding.top + chartH} ` +
        points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x} ${padding.top + chartH} Z`
      : '';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="折线图">
      <defs>
        <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

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

      {/* 填充区域 */}
      {areaD && <path d={areaD} fill="url(#lineChartGradient)" />}

      {/* 折线 */}
      {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth={2} />}

      {/* 数据点 */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
          {pointCount <= 15 && (
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#374151"
              fontWeight={600}
            >
              {p.value}
            </text>
          )}
        </g>
      ))}

      {/* x 轴标签（稀疏显示避免重叠） */}
      {points.map((p, i) => {
        // 数据多时每隔几个显示一次
        const interval = Math.max(1, Math.ceil(pointCount / 8));
        if (i % interval !== 0 && i !== pointCount - 1) return null;
        return (
          <text
            key={i}
            x={p.x}
            y={padding.top + chartH + 18}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
          >
            {p.label}
          </text>
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
