/**
 * SVG 饼图组件
 * 轻量手绘，不依赖 recharts
 */

type PieDatum = {
  label: string;
  value: number;
};

type Props = {
  data: PieDatum[];
  /** 调色板 */
  colors?: string[];
};

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

/** 极坐标转笛卡尔 */
function polar(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

/** 饼图 */
export function PieChart({ data, colors = DEFAULT_COLORS }: Props) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const innerR = 0; // 0 = 实心饼图；>0 = 环形

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height: size }}
      >
        暂无数据
      </div>
    );
  }

  let startAngle = -Math.PI / 2; // 从 12 点方向开始
  const slices = data.map((d, i) => {
    const fraction = d.value / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const start = polar(cx, cy, r, startAngle);
    const end = polar(cx, cy, r, endAngle);

    let path: string;
    if (innerR > 0) {
      // 环形
      const startInner = polar(cx, cy, innerR, endAngle);
      const endInner = polar(cx, cy, innerR, startAngle);
      path = [
        `M ${start.x} ${start.y}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        `L ${startInner.x} ${startInner.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
        'Z',
      ].join(' ');
    } else {
      // 实心饼图
      path = [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        'Z',
      ].join(' ');
    }

    const slice = {
      path,
      color: colors[i % colors.length],
      label: d.label,
      value: d.value,
      percent: Math.round(fraction * 100),
    };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="饼图">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}>
            <title>{`${s.label}: ${s.value} (${s.percent}%)`}</title>
          </path>
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 text-sm">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-gray-700">{s.label}</span>
            <span className="text-gray-500">
              {s.value}（{s.percent}%）
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
