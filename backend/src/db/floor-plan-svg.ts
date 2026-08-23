/**
 * 写字楼平面图 SVG 底图生成器
 *
 * 生成一张 1200x800 的写字楼平面底图（走廊 + 开放办公区 + 会议室 + 经理室 + 门窗），
 * 作为 FloorPlanViewer 的 image_url 底图。坐标系与 seed 中工位 x/y/w/h 完全对齐：
 *
 * 布局（单位=视图坐标）：
 *   - 外墙：整个 1200x800，四周留 20 边距
 *   - 走廊：横向贯穿 y=560~640（连接左右两个办公区与电梯厅）
 *   - A 区（开放办公）：x=40~560, y=60~540，工位阵列落位其中
 *   - B 区（开放办公）：x=640~1160, y=60~540
 *   - 会议室 M-101：x=880~1160, y=560~780（走廊下方右侧）
 *   - 经理室 P-001/P-002：x=640~860, y=560~780（走廊下方左侧）
 *   - 电梯厅：x=560~640, y=560~640（走廊中部）
 *   - 门窗：各房间在走廊侧开门，外墙下方开窗
 */

/** 平面图视图宽度（与 floor_plans.width 对齐） */
export const FLOOR_PLAN_WIDTH = 1200;
/** 平面图视图高度（与 floor_plans.height 对齐） */
export const FLOOR_PLAN_HEIGHT = 800;

const W = FLOOR_PLAN_WIDTH;
const H = FLOOR_PLAN_HEIGHT;

/** 生成写字楼平面图 SVG 字符串 */
export function buildFloorPlanSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- 整体背景 -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#f7f5f0"/>

  <!-- 外墙（粗线） -->
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="#efece6" stroke="#4a4a4a" stroke-width="6"/>

  <!-- ================= A 区（开放办公，左上） ================= -->
  <rect x="40" y="60" width="520" height="400" fill="#fbfaf7" stroke="#8a8a8a" stroke-width="2"/>
  <text x="60" y="50" font-family="system-ui,sans-serif" font-size="18" fill="#666" font-weight="600">A 区 · 开放办公</text>

  <!-- A 区工位隔间参考线（淡，仅为底图纹理；实际工位由数据层渲染） -->
  <g stroke="#e3ded4" stroke-width="1">
    ${gridLines(60, 90, 480, 340, 96, 85)}
  </g>

  <!-- ================= B 区（开放办公，右上） ================= -->
  <rect x="640" y="60" width="520" height="400" fill="#fbfaf7" stroke="#8a8a8a" stroke-width="2"/>
  <text x="660" y="50" font-family="system-ui,sans-serif" font-size="18" fill="#666" font-weight="600">B 区 · 开放办公</text>
  <g stroke="#e3ded4" stroke-width="1">
    ${gridLines(660, 90, 480, 340, 96, 85)}
  </g>

  <!-- ================= 走廊（横向贯穿） ================= -->
  <rect x="20" y="480" width="${W - 40}" height="70" fill="#e9e4da" stroke="#8a8a8a" stroke-width="1.5"/>
  <text x="${W / 2 - 30}" y="520" font-family="system-ui,sans-serif" font-size="15" fill="#9a938a">走 廊</text>

  <!-- 走廊地砖线 -->
  <g stroke="#ddd6c9" stroke-width="1">
    ${vLines(40, 1160, 480, 550, 60)}
  </g>

  <!-- A 区通往走廊的门 -->
  ${door(280, 460, 60)}
  <!-- B 区通往走廊的门 -->
  ${door(880, 460, 60)}

  <!-- ================= 经理室（走廊下方左侧） ================= -->
  <rect x="640" y="570" width="105" height="180" fill="#f4f1ea" stroke="#8a8a8a" stroke-width="2"/>
  <text x="668" y="665" font-family="system-ui,sans-serif" font-size="13" fill="#888">经理室</text>
  ${door(692, 570, 40)}

  <rect x="745" y="570" width="105" height="180" fill="#f4f1ea" stroke="#8a8a8a" stroke-width="2"/>
  <text x="773" y="665" font-family="system-ui,sans-serif" font-size="13" fill="#888">经理室</text>
  ${door(797, 570, 40)}

  <!-- ================= 会议室（走廊下方右侧） ================= -->
  <rect x="870" y="570" width="290" height="180" fill="#eef2f5" stroke="#8a8a8a" stroke-width="2"/>
  <text x="985" y="640" font-family="system-ui,sans-serif" font-size="14" fill="#7a8896" font-weight="600">会议室 M-101</text>
  <!-- 会议桌 -->
  <rect x="955" y="650" width="120" height="50" rx="6" fill="#d8dfe6" stroke="#9fb0bd" stroke-width="1.5"/>
  ${door(1015, 570, 40)}

  <!-- ================= 电梯厅（走廊中部隔断） ================= -->
  <rect x="560" y="480" width="80" height="70" fill="#e2ded6" stroke="#8a8a8a" stroke-width="1.5"/>
  <text x="578" y="520" font-family="system-ui,sans-serif" font-size="12" fill="#8a8378">电梯</text>

  <!-- 外墙窗户（下方） -->
  <g fill="#bcd4e6" stroke="#8aa8bf" stroke-width="1">
    ${windows(80, H - 26, 5, 90, 8)}
    ${windows(680, H - 26, 5, 90, 8)}
  </g>

  <!-- 比例尺 -->
  <g font-family="system-ui,sans-serif" font-size="11" fill="#a09a90">
    <line x1="40" y1="${H - 12}" x2="140" y2="${H - 12}" stroke="#a09a90" stroke-width="2"/>
    <text x="44" y="${H - 16}">0</text>
    <text x="126" y="${H - 16}">5m</text>
  </g>
</svg>`;
}

/** 生成网格参考线（隔间纹理） */
function gridLines(x: number, y: number, w: number, h: number, cellW: number, cellH: number): string {
  const parts: string[] = [];
  for (let gx = x; gx <= x + w; gx += cellW) {
    parts.push(`<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}"/>`);
  }
  for (let gy = y; gy <= y + h; gy += cellH) {
    parts.push(`<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}"/>`);
  }
  return parts.join('\n    ');
}

/** 走廊竖向地砖线 */
function vLines(x1: number, x2: number, y1: number, y2: number, step: number): string {
  const parts: string[] = [];
  for (let x = x1; x <= x2; x += step) {
    parts.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`);
  }
  return parts.join('\n    ');
}

/** 一扇门（墙缺口 + 门扇弧线） */
function door(cx: number, wallY: number, w: number): string {
  const x1 = cx - w / 2;
  return `
  <g>
    <rect x="${x1}" y="${wallY - 3}" width="${w}" height="6" fill="#f7f5f0"/>
    <path d="M ${x1} ${wallY} A ${w} ${w} 0 0 1 ${x1 + w} ${wallY - w}" fill="none" stroke="#9a938a" stroke-width="1.2" stroke-dasharray="3,2"/>
    <line x1="${x1}" y1="${wallY}" x2="${x1}" y2="${wallY - w}" stroke="#6b655c" stroke-width="2"/>
  </g>`;
}

/** 一排外墙窗 */
function windows(x: number, y: number, count: number, w: number, gap: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`<rect x="${x + i * (w + gap)}" y="${y}" width="${w}" height="6" rx="2"/>`);
  }
  return parts.join('\n    ');
}
