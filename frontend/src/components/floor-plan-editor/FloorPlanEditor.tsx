/**
 * FloorPlanEditor — 交互式 SVG 平面图编辑器
 * 需求 7078968348：底图加载、拖拽绘制工位框、选中移动/调整大小/删除、按区域着色
 * // @generated-by: kimi-k3 | hash:1ba7cac0e635 | ts:2026-08-22T10:42:38Z
 * 后处理后重写为 React SVG DOM 组件（原 K3 产物误用 Three.js 框架，已纠正为 SVG 实现）
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { SeatWithAssignee, CreateSeatDto, UpdateSeatDto } from '@seat-mgmt/shared';
import { SeatType, SeatStatus } from '@seat-mgmt/shared';
import {
  InteractionMode,
  normalizeRect,
  computeResizeRect,
  type DragState,
  type MoveState,
  type ResizeState,
  type ResizeHandle,
} from './types';

/** 区域→颜色映射表 */
const AREA_COLORS: Record<string, string> = {
  A: '#3b82f6',
  B: '#22c55e',
  C: '#f59e0b',
  D: '#ef4444',
  E: '#8b5cf6',
};

/** 按 area 名称生成颜色 */
function getAreaColor(area: string): string {
  const key = area.charAt(0).toUpperCase();
  return AREA_COLORS[key] ?? '#6b7280';
}

/** 填充色加透明度 */
function getFillColor(area: string): string {
  const base = getAreaColor(area);
  return base + '33';
}

/** 把手尺寸 */
const HANDLE_SIZE = 8;

/** 8 个 resize 把手位置 */
const HANDLES: Array<{
  handle: ResizeHandle;
  cursor: string;
  getX: (w: number) => number;
  getY: (h: number) => number;
}> = [
  { handle: 'nw', cursor: 'nwse-resize', getX: () => 0, getY: () => 0 },
  { handle: 'n', cursor: 'ns-resize', getX: (w) => w / 2, getY: () => 0 },
  { handle: 'ne', cursor: 'nesw-resize', getX: (w) => w, getY: () => 0 },
  { handle: 'e', cursor: 'ew-resize', getX: (w) => w, getY: (h) => h / 2 },
  { handle: 'se', cursor: 'nwse-resize', getX: (w) => w, getY: (h) => h },
  { handle: 's', cursor: 'ns-resize', getX: (w) => w / 2, getY: (h) => h },
  { handle: 'sw', cursor: 'nesw-resize', getX: () => 0, getY: (h) => h },
  { handle: 'w', cursor: 'ew-resize', getX: () => 0, getY: (h) => h / 2 },
];

/**
 * FloorPlanEditor 组件完整 Props（扩展自 shared.FloorPlanEditorProps）
 * shared 接口仅定义 { floorPlanId, onSeatCreate, onSeatUpdate, onSeatDelete }，
 * 本组件需要额外传入 seats/imageUrl/width/height/selectedSeatId/onSelectSeat，
 * 因此本地声明完整接口。floorPlanId 在此保留以供未来场景使用（如多底图切换）。
 */
interface FloorPlanEditorFullProps {
  floorPlanId: number;
  seats: SeatWithAssignee[];
  imageUrl: string;
  width: number;
  height: number;
  selectedSeatId: number | null;
  onSelectSeat: (seat: SeatWithAssignee | null) => void;
  onSeatCreate: (data: CreateSeatDto) => void;
  onSeatUpdate: (id: number, data: UpdateSeatDto) => void;
  onSeatDelete: (id: number) => void;
}

/**
 * FloorPlanEditor — SVG 交互式平面图编辑器
 * 支持：底图加载、拖拽绘制工位框、选中移动/resize/删除、按区域着色
 */
export function FloorPlanEditor({
  floorPlanId: _floorPlanId,
  seats,
  imageUrl,
  width,
  height,
  selectedSeatId,
  onSelectSeat,
  onSeatCreate,
  onSeatUpdate,
  onSeatDelete,
}: FloorPlanEditorFullProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.IDLE);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  // 拖拽期间的本地视觉位置（B3 修复：mousemove 仅更新本地状态，mouseup 时才提交后端）
  const [dragPreview, setDragPreview] = useState<{
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  /** 客户端坐标 → SVG viewBox 坐标 */
  const clientToSvg = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [width, height],
  );

  /** SVG mousedown：空白区开始绘制，工位区开始移动/resize */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // 阻止默认行为（如文本选择）
      e.preventDefault();

      const target = e.target as SVGElement;
      const seatId = target.getAttribute('data-seat-id');
      // 安全：data-handle 属性仅由本组件 HANDLES 枚举值写入，运行时必为 ResizeHandle 之一
      const handleType = target.getAttribute('data-handle') as ResizeHandle | null;

      const pt = clientToSvg(e.clientX, e.clientY);

      if (handleType && selectedSeatId !== null) {
        // 开始 resize
        const seat = seats.find((s) => s.id === selectedSeatId);
        if (!seat) return;
        const state: ResizeState = {
          originX: seat.x,
          originY: seat.y,
          originW: seat.w,
          originH: seat.h,
          startX: pt.x,
          startY: pt.y,
          handle: handleType,
        };
        setDragState(state);
        setMode(InteractionMode.RESIZING);
        setDragPreview({ id: seat.id, x: seat.x, y: seat.y, w: seat.w, h: seat.h });
        return;
      }

      if (seatId) {
        // 点击工位 → 选中并准备移动（W1 修复：先选中再进入移动模式）
        const seat = seats.find((s) => s.id === Number(seatId));
        if (!seat) return;
        onSelectSeat(seat);
        const state: MoveState = {
          originX: seat.x,
          originY: seat.y,
          startX: pt.x,
          startY: pt.y,
        };
        setDragState(state);
        setMode(InteractionMode.MOVING);
        setDragPreview({ id: seat.id, x: seat.x, y: seat.y, w: seat.w, h: seat.h });
        return;
      }

      // 空白处 → 开始绘制
      setDrawRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
      setMode(InteractionMode.DRAWING);
      setDragState({ startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y });
    },
    [clientToSvg, seats, selectedSeatId, onSelectSeat],
  );

  /** SVG mousemove：实时更新绘制/移动/resize（B3 修复：仅更新本地视觉状态，不提交后端） */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (mode === InteractionMode.IDLE) return;
      e.preventDefault();

      const pt = clientToSvg(e.clientX, e.clientY);

      if (mode === InteractionMode.DRAWING && dragState && 'currentX' in dragState) {
        const newRect = normalizeRect(dragState.startX, dragState.startY, pt.x, pt.y);
        setDrawRect(newRect);
      } else if (
        mode === InteractionMode.MOVING &&
        dragState &&
        'originX' in dragState &&
        'startX' in dragState
      ) {
        const moveState = dragState as MoveState;
        const dx = pt.x - moveState.startX;
        const dy = pt.y - moveState.startY;
        const newX = Math.max(0, moveState.originX + dx);
        const newY = Math.max(0, moveState.originY + dy);
        // 仅更新本地视觉预览，不触发后端请求
        setDragPreview((prev) => (prev ? { ...prev, x: newX, y: newY } : null));
      } else if (mode === InteractionMode.RESIZING && dragState && 'originW' in dragState) {
        const resizeState = dragState as ResizeState;
        const newRect = computeResizeRect(resizeState, pt.x, pt.y);
        // 仅更新本地视觉预览，不触发后端请求
        setDragPreview((prev) =>
          prev
            ? {
                ...prev,
                x: Math.max(0, newRect.x),
                y: Math.max(0, newRect.y),
                w: Math.max(10, newRect.w),
                h: Math.max(10, newRect.h),
              }
            : null,
        );
      }
    },
    [mode, dragState, clientToSvg],
  );

  /** SVG mouseup：完成绘制/移动/resize（B3 修复：移动/resize 在 mouseup 时一次性提交后端） */
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();

      if (mode === InteractionMode.DRAWING && drawRect) {
        // 完成绘制 — 宽高超 10px 才创建
        if (drawRect.w >= 10 && drawRect.h >= 10) {
          onSeatCreate({
            code: '',
            area: '未分配',
            type: SeatType.STANDARD,
            x: drawRect.x,
            y: drawRect.y,
            w: drawRect.w,
            h: drawRect.h,
            status: SeatStatus.AVAILABLE,
          });
        }
        setDrawRect(null);
      } else if (mode === InteractionMode.MOVING && dragPreview) {
        // 移动结束，一次性提交后端
        onSeatUpdate(dragPreview.id, { x: dragPreview.x, y: dragPreview.y });
      } else if (mode === InteractionMode.RESIZING && dragPreview) {
        // resize 结束，一次性提交后端
        onSeatUpdate(dragPreview.id, {
          x: dragPreview.x,
          y: dragPreview.y,
          w: dragPreview.w,
          h: dragPreview.h,
        });
      }

      setMode(InteractionMode.IDLE);
      setDragState(null);
      setDragPreview(null);
    },
    [mode, drawRect, dragPreview, onSeatCreate, onSeatUpdate],
  );

  /** 点击工位选中 */
  const handleSeatClick = useCallback(
    (e: React.MouseEvent, seat: SeatWithAssignee) => {
      e.stopPropagation();
      onSelectSeat(seat);
    },
    [onSelectSeat],
  );

  /** SVG 背景点击：取消选中 */
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // 只有直接点 SVG 背景才取消
      if (e.target === e.currentTarget) {
        onSelectSeat(null);
      }
    },
    [onSelectSeat],
  );

  /** Delete 键删除选中工位（B2 修复：实际调用 onSeatDelete） */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSeatId !== null) {
        // 只在没有 input/select/textarea 聚焦时触发
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'SELECT' ||
            active.tagName === 'TEXTAREA')
        ) {
          return;
        }
        e.preventDefault();
        // 先调 onSeatDelete 删除工位，再取消选中
        onSeatDelete(selectedSeatId);
        onSelectSeat(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeatId, onSeatDelete, onSelectSeat]);

  const selectedSeat = seats.find((s) => s.id === selectedSeatId) ?? null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-gray-200 rounded bg-gray-50 select-none"
        style={{ cursor: mode === InteractionMode.DRAWING ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackgroundClick}
        onMouseLeave={() => {
          // S3 修复：mouseleave 时直接取消操作，不当作 mouseup 提交（避免越界坐标）
          if (mode !== InteractionMode.IDLE) {
            setMode(InteractionMode.IDLE);
            setDragState(null);
            setDrawRect(null);
            setDragPreview(null);
          }
        }}
      >
        {/* 底图 */}
        <image
          href={imageUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="none"
        />

        {/* 已有工位 — 拖拽预览时使用 dragPreview 坐标 */}
        {seats.map((seat) => {
          const isSelected = seat.id === selectedSeatId;
          // 拖拽中显示预览位置
          const preview = dragPreview && dragPreview.id === seat.id ? dragPreview : null;
          const displayX = preview ? preview.x : seat.x;
          const displayY = preview ? preview.y : seat.y;
          const displayW = preview ? preview.w : seat.w;
          const displayH = preview ? preview.h : seat.h;
          return (
            <g key={seat.id}>
              <rect
                data-seat-id={seat.id}
                x={displayX}
                y={displayY}
                width={displayW}
                height={displayH}
                fill={getFillColor(seat.area)}
                stroke={isSelected ? '#1e40af' : getAreaColor(seat.area)}
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ cursor: 'move' }}
                onClick={(e) => handleSeatClick(e, seat)}
              />
              <text
                x={displayX + displayW / 2}
                y={displayY + displayH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-700 text-xs font-medium pointer-events-none select-none"
                style={{ fontSize: '12px' }}
              >
                {seat.code}
              </text>
            </g>
          );
        })}

        {/* 选中工位的 resize 把手 — 拖拽预览时使用预览坐标 */}
        {(() => {
          const handleSeat =
            selectedSeat && dragPreview && dragPreview.id === selectedSeat.id
              ? dragPreview
              : selectedSeat;
          if (!handleSeat) return null;
          return (
            <g pointerEvents="all">
              {HANDLES.map((h) => {
                const hx = handleSeat.x + h.getX(handleSeat.w);
                const hy = handleSeat.y + h.getY(handleSeat.h);
                return (
                  <rect
                    key={h.handle}
                    data-handle={h.handle}
                    x={hx - HANDLE_SIZE / 2}
                    y={hy - HANDLE_SIZE / 2}
                    width={HANDLE_SIZE}
                    height={HANDLE_SIZE}
                    fill="white"
                    stroke="#1e40af"
                    strokeWidth={1.5}
                    rx={1}
                    style={{ cursor: h.cursor }}
                  />
                );
              })}
            </g>
          );
        })()}

        {/* 绘制中的临时矩形 */}
        {drawRect && drawRect.w >= 1 && drawRect.h >= 1 && (
          <rect
            x={drawRect.x}
            y={drawRect.y}
            width={drawRect.w}
            height={drawRect.h}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* 操作提示 */}
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
        拖拽空白区绘制工位 · 点击选中 · 拖拽移动 · 角点调整大小 · Delete 删除
      </div>
    </div>
  );
}
