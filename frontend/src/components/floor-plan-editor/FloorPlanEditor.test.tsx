/**
 * FloorPlanEditor 组件测试
 * 需求 7078968348：验证 SVG 编辑器渲染与拖拽绘制交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloorPlanEditor } from './FloorPlanEditor';
import { SeatType, SeatStatus, type Seat } from '@seat-mgmt/shared';

const mockSeats: Seat[] = [
  {
    id: 1,
    code: 'A-001',
    area: 'A区',
    type: SeatType.STANDARD,
    x: 100,
    y: 100,
    w: 80,
    h: 60,
    floorPlanId: 1,
    status: SeatStatus.AVAILABLE,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    code: 'B-001',
    area: 'B区',
    type: SeatType.MEETING,
    x: 300,
    y: 200,
    w: 100,
    h: 80,
    floorPlanId: 1,
    status: SeatStatus.OCCUPIED,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockProps = {
  floorPlanId: 1,
  seats: mockSeats,
  imageUrl: '/test-floor-plan.png',
  width: 800,
  height: 600,
  selectedSeatId: null,
  onSelectSeat: vi.fn(),
  onSeatCreate: vi.fn(),
  onSeatUpdate: vi.fn(),
  onSeatDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FloorPlanEditor', () => {
  it('渲染 SVG 容器与底图 image', () => {
    const { container } = render(<FloorPlanEditor {...mockProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const image = container.querySelector('image');
    expect(image).toBeTruthy();
  });

  it('渲染所有工位矩形', () => {
    const { container } = render(<FloorPlanEditor {...mockProps} />);
    // 工位 rect + 底图 image rect + 可能的把手
    const rects = container.querySelectorAll('rect[data-seat-id]');
    expect(rects.length).toBe(2);
  });

  it('渲染工位编号文字标签', () => {
    render(<FloorPlanEditor {...mockProps} />);
    expect(screen.getByText('A-001')).toBeInTheDocument();
    expect(screen.getByText('B-001')).toBeInTheDocument();
  });

  it('点击工位触发 onSelectSeat', () => {
    const { container } = render(<FloorPlanEditor {...mockProps} />);
    const seatRect = container.querySelector('rect[data-seat-id="1"]') as SVGRectElement;
    expect(seatRect).toBeTruthy();
    fireEvent.click(seatRect);
    expect(mockProps.onSelectSeat).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('selectedSeatId 非空时渲染选中状态与调整把手', () => {
    const { container } = render(
      <FloorPlanEditor {...mockProps} selectedSeatId={1} />,
    );
    // 选中状态应有调整把手 rect
    const handles = container.querySelectorAll('rect[data-handle]');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('渲染操作提示文字', () => {
    render(<FloorPlanEditor {...mockProps} />);
    // 提示拖拽绘制
    const hint = screen.getByText(/拖拽/i);
    expect(hint).toBeInTheDocument();
  });
});
