/**
 * useSeatPolling hook 测试
 * 需求 7080593490：首次立即请求、5s 推进触发第二次、卸载 clearInterval
 *
 * 策略：不 fake 定时器，改用极短轮询间隔（100ms）+ 真实等待来验证轮询与卸载清理，
 * 避免 fake timer 与 async fetch 微任务互相死锁。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SeatWithAssignee } from '@seat-mgmt/shared';
import { SeatType, SeatStatus } from '@seat-mgmt/shared';

const mockSeat: SeatWithAssignee = {
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
  assigneeName: null,
  assigneeEmpNo: null,
};

const mockResponse = {
  data: [mockSeat],
  total: 1,
  page: 1,
  pageSize: 500,
  totalPages: 1,
};

// 用 vi.hoisted 声明 mock，使其在 vi.mock 工厂提升后仍可访问
const { listSeatsMock } = vi.hoisted(() => ({
  listSeatsMock: vi.fn(),
}));

vi.mock('../../api/seat-api', () => ({
  seatApi: {
    listSeats: listSeatsMock,
  },
}));

// 导入必须在 mock 之后
import { useSeatPolling } from './use-seat-polling';

describe('useSeatPolling', () => {
  beforeEach(() => {
    vi.useRealTimers();
    listSeatsMock.mockReset();
    listSeatsMock.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('首次立即请求工位列表', async () => {
    const { result } = renderHook(() => useSeatPolling(1, 5000));

    await waitFor(() => {
      expect(listSeatsMock).toHaveBeenCalledTimes(1);
    });
    expect(listSeatsMock).toHaveBeenCalledWith({ floorPlanId: 1, pageSize: 500 });

    await waitFor(() => {
      expect(result.current.seats).toEqual([mockSeat]);
    });
    expect(result.current.error).toBeNull();
  });

  it('间隔到达后触发第二次请求', async () => {
    // 用 100ms 间隔快速验证轮询
    renderHook(() => useSeatPolling(1, 100));

    await waitFor(() => {
      expect(listSeatsMock).toHaveBeenCalledTimes(1);
    });

    // 等待第二次轮询触发
    await waitFor(() => {
      expect(listSeatsMock).toHaveBeenCalledTimes(2);
    });
  });

  it('卸载后 clearInterval 不再请求', async () => {
    const { unmount } = renderHook(() => useSeatPolling(1, 100));

    await waitFor(() => {
      expect(listSeatsMock).toHaveBeenCalledTimes(1);
    });

    unmount();

    // 等待足够长时间，确认没有第二次请求
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(listSeatsMock).toHaveBeenCalledTimes(1);
  });

  it('floorPlanId 为 null 时清空 seats 不请求', async () => {
    const { result } = renderHook(() => useSeatPolling(null, 5000));

    // null 分支同步返回，不发起请求；等待一个微任务排空
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(listSeatsMock).not.toHaveBeenCalled();
    expect(result.current.seats).toEqual([]);
  });

  it('请求失败时置 error 不中断后续轮询', async () => {
    listSeatsMock
      .mockReset()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSeatPolling(1, 100));

    // 首次失败 → error
    await waitFor(() => {
      expect(result.current.error).toBe('网络错误');
    });

    // 第二次（轮询）成功
    await waitFor(() => {
      expect(listSeatsMock).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(result.current.seats).toEqual([mockSeat]);
    });
  });
});
