/**
 * 工位管理页面测试
 * 需求 7080518042：验证页面渲染与交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeatManagementPage } from './SeatManagementPage';
import { SeatType, SeatStatus, type PaginatedResponse, type Seat } from '@seat-mgmt/shared';

// 模拟 seatApi
vi.mock('../../api/seat-api', () => ({
  seatApi: {
    listSeats: vi.fn(),
    deleteSeat: vi.fn(),
  },
}));

import { seatApi } from '../../api/seat-api';

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

const mockPaginated: PaginatedResponse<Seat> = {
  data: [mockSeat],
  total: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(seatApi.listSeats).mockResolvedValue(mockPaginated);
  vi.mocked(seatApi.deleteSeat).mockResolvedValue(undefined);
});

describe('SeatManagementPage', () => {
  it('应渲染页面标题和表格表头', async () => {
    render(<SeatManagementPage />);
    expect(screen.getByText('工位管理')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('编码')).toBeInTheDocument();
    });
  });

  it('应加载并显示工位数据', async () => {
    render(<SeatManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('A-001')).toBeInTheDocument();
    });
    expect(seatApi.listSeats).toHaveBeenCalled();
  });

  it('应显示分页信息', async () => {
    render(<SeatManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/共 1 条/)).toBeInTheDocument();
    });
  });

  it('点击删除应调用 deleteSeat', async () => {
    render(<SeatManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('删除')).toBeInTheDocument();
    });

    // 模拟 confirm 返回 true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.click(screen.getByText('删除'));
    await waitFor(() => {
      expect(seatApi.deleteSeat).toHaveBeenCalledWith(1);
    });
  });

  it('筛选按钮应触发查询', async () => {
    render(<SeatManagementPage />);
    await waitFor(() => {
      expect(seatApi.listSeats).toHaveBeenCalled();
    });

    const filterButton = screen.getByText('筛选');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(seatApi.listSeats).toHaveBeenCalledTimes(2);
    });
  });
});
