/**
 * PropertyPanel 组件测试
 * 需求 7078968348：验证属性面板渲染与交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertyPanel } from './PropertyPanel';
import { SeatType, SeatStatus, type Seat } from '@seat-mgmt/shared';

// mock window.confirm
beforeEach(() => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.clearAllMocks();
});

const mockSeat: Seat = {
  id: 1,
  code: 'A-001',
  area: 'A区',
  type: SeatType.STANDARD,
  x: 100,
  y: 100,
  w: 60,
  h: 60,
  floorPlanId: 1,
  status: SeatStatus.AVAILABLE,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PropertyPanel', () => {
  it('seat 为 null 时显示空状态提示', () => {
    render(<PropertyPanel seat={null} onChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('点击工位框以编辑属性')).toBeInTheDocument();
  });

  it('seat 非空时显示编辑表单', () => {
    render(<PropertyPanel seat={mockSeat} onChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByDisplayValue('A-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A区')).toBeInTheDocument();
  });

  it('编辑工位编号触发 onChange', () => {
    const onChange = vi.fn();
    render(<PropertyPanel seat={mockSeat} onChange={onChange} onDelete={vi.fn()} />);
    const input = screen.getByDisplayValue('A-001');
    fireEvent.change(input, { target: { value: 'A-002' } });
    expect(onChange).toHaveBeenCalledWith({ code: 'A-002' });
  });

  it('编辑区域触发 onChange', () => {
    const onChange = vi.fn();
    render(<PropertyPanel seat={mockSeat} onChange={onChange} onDelete={vi.fn()} />);
    const input = screen.getByDisplayValue('A区');
    fireEvent.change(input, { target: { value: 'B区' } });
    expect(onChange).toHaveBeenCalledWith({ area: 'B区' });
  });

  it('点击删除按钮触发 onDelete', () => {
    const onDelete = vi.fn();
    render(<PropertyPanel seat={mockSeat} onChange={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('删除工位'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('seat 变化时同步本地状态', async () => {
    const { rerender } = render(<PropertyPanel seat={mockSeat} onChange={vi.fn()} onDelete={vi.fn()} />);
    const updatedSeat = { ...mockSeat, code: 'B-999', area: 'C区' };
    rerender(<PropertyPanel seat={updatedSeat} onChange={vi.fn()} onDelete={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('B-999')).toBeInTheDocument();
      expect(screen.getByDisplayValue('C区')).toBeInTheDocument();
    });
  });
});
