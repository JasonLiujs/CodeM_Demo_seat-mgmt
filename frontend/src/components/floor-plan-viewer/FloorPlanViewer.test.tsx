/**
 * FloorPlanViewer 组件测试
 * 需求 7080593490：渲染着色断言、tooltip hover、搜索高亮、筛选、点击回调
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeatStatus } from '@seat-mgmt/shared';

// Mock seatApi：listSeats 返回分页结构（内联数据，供组件渲染断言）
vi.mock('../../api/seat-api', () => ({
  seatApi: {
    listSeats: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          code: 'A-001',
          area: 'A区',
          type: 'standard',
          x: 10,
          y: 10,
          w: 80,
          h: 60,
          floorPlanId: 1,
          status: 'available',
          createdAt: '',
          assigneeName: null,
          assigneeEmpNo: null,
        },
        {
          id: 2,
          code: 'A-002',
          area: 'B区',
          type: 'standard',
          x: 120,
          y: 10,
          w: 80,
          h: 60,
          floorPlanId: 1,
          status: 'occupied',
          createdAt: '',
          assigneeName: '张伟',
          assigneeEmpNo: 'EMP001',
        },
        {
          id: 3,
          code: 'A-003',
          area: 'B区',
          type: 'standard',
          x: 230,
          y: 10,
          w: 80,
          h: 60,
          floorPlanId: 1,
          status: 'reserved',
          createdAt: '',
          assigneeName: '李娜',
          assigneeEmpNo: 'EMP002',
        },
      ],
      total: 3,
      page: 1,
      pageSize: 500,
      totalPages: 1,
    }),
  },
  floorPlanApi: {
    listFloorPlans: vi
      .fn()
      .mockResolvedValue([
        { id: 1, name: '一楼', imageUrl: '/floor.png', width: 800, height: 600, createdAt: '' },
      ]),
    uploadFloorPlan: vi.fn(),
  },
}));

// Mock apiGet：部门与员工列表
vi.mock('../../api/client', () => ({
  apiGet: vi.fn().mockImplementation((url: string) => {
    if (url.startsWith('/departments')) {
      return Promise.resolve([{ id: 1, name: '研发部', createdAt: '' }]);
    }
    return Promise.resolve({
      data: [
        {
          id: 1,
          empNo: 'EMP001',
          name: '张伟',
          departmentId: 1,
          departmentName: '研发部',
          seatId: 2,
          createdAt: '',
        },
        {
          id: 2,
          empNo: 'EMP002',
          name: '李娜',
          departmentId: 1,
          departmentName: '研发部',
          seatId: 3,
          createdAt: '',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 500,
      totalPages: 1,
    });
  }),
}));

// 导入必须在 mock 之后（vi.mock 自动提升到文件顶部）
import { FloorPlanViewer } from './FloorPlanViewer';

describe('FloorPlanViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染 SVG 容器与工位 rect', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} />);

    await waitFor(() => {
      const groups = container.querySelectorAll('g[data-seat-id]');
      expect(groups.length).toBe(3);
    });
  });

  it('工位按状态正确着色', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} />);

    await waitFor(() => {
      const rects = container.querySelectorAll('rect');
      // 第一个工位 available → #22c55e
      expect(rects[0].getAttribute('fill')).toBe('#22c55e');
      // 第二个工位 occupied → #3b82f6
      expect(rects[1].getAttribute('fill')).toBe('#3b82f6');
      // 第三个工位 reserved → #eab308
      expect(rects[2].getAttribute('fill')).toBe('#eab308');
    });
  });

  it('occupied 工位显示分配人姓名', async () => {
    render(<FloorPlanViewer floorPlanId={1} />);
    await waitFor(() => {
      expect(screen.getByText('张伟')).toBeInTheDocument();
    });
  });

  it('悬停工位显示 tooltip 详情', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} />);

    await waitFor(() => {
      expect(container.querySelector('g[data-seat-id="1"]')).toBeTruthy();
    });

    const seatGroup = container.querySelector('g[data-seat-id="1"]') as SVGGElement;
    fireEvent.mouseEnter(seatGroup);

    expect(screen.getByRole('tooltip')).toBeTruthy();
    // tooltip 内展示工位编号（工位标签里也有同名文本，用 getAllByText）
    expect(screen.getAllByText('A-001').length).toBeGreaterThanOrEqual(1);
  });

  it('鼠标离开后 tooltip 消失', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} />);

    await waitFor(() => {
      expect(container.querySelector('g[data-seat-id="1"]')).toBeTruthy();
    });

    const seatGroup = container.querySelector('g[data-seat-id="1"]') as SVGGElement;
    fireEvent.mouseEnter(seatGroup);
    expect(screen.getByRole('tooltip')).toBeTruthy();

    fireEvent.mouseLeave(seatGroup);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('搜索命中工位高亮闪烁', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} searchQuery="张伟" />);

    await waitFor(() => {
      const groups = container.querySelectorAll('g[data-seat-id]');
      expect(groups.length).toBe(3);
    });

    // 张伟的工位 id=2，高亮 rect 应有 animation style
    const seat2Rect = container.querySelector('g[data-seat-id="2"] rect') as SVGRectElement;
    expect(seat2Rect.getAttribute('style')).toContain('animation');

    // 非命中工位不应有 animation（style 为 null 或不含 animation）
    const seat1Style =
      container.querySelector('g[data-seat-id="1"] rect')?.getAttribute('style') ?? '';
    expect(seat1Style).not.toContain('animation');
  });

  it('按区域筛选生效', async () => {
    const { container } = render(<FloorPlanViewer floorPlanId={1} filters={{ area: 'B区' }} />);

    await waitFor(() => {
      const groups = container.querySelectorAll('g[data-seat-id]');
      // A区1个被过滤，B区2个保留
      expect(groups.length).toBe(2);
    });
  });

  it('按状态筛选生效', async () => {
    const { container } = render(
      <FloorPlanViewer floorPlanId={1} filters={{ status: SeatStatus.OCCUPIED }} />,
    );

    await waitFor(() => {
      const groups = container.querySelectorAll('g[data-seat-id]');
      expect(groups.length).toBe(1);
    });
  });

  it('点击工位触发 onSeatClick 回调', async () => {
    const onSeatClick = vi.fn();
    const { container } = render(<FloorPlanViewer floorPlanId={1} onSeatClick={onSeatClick} />);

    await waitFor(() => {
      expect(container.querySelector('g[data-seat-id="1"]')).toBeTruthy();
    });

    const seatGroup = container.querySelector('g[data-seat-id="1"]') as SVGGElement;
    fireEvent.click(seatGroup);

    expect(onSeatClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('渲染图例', async () => {
    render(<FloorPlanViewer floorPlanId={1} />);
    await waitFor(() => {
      expect(screen.getByText('空闲')).toBeInTheDocument();
      expect(screen.getByText('已分配')).toBeInTheDocument();
      expect(screen.getByText('已预约')).toBeInTheDocument();
      expect(screen.getByText('维护中')).toBeInTheDocument();
    });
  });
});
