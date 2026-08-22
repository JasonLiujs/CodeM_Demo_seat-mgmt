/**
 * 工位分配管理页面测试
 * 需求 7079581339：验证四个 Tab 渲染 + 分配表单交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SeatAssignmentPage } from './SeatAssignmentPage';

// Mock API 模块
vi.mock('../../api/assignment-api', () => ({
  assignmentApi: {
    assign: vi.fn().mockResolvedValue({ id: 1, seatId: 1, employeeId: 1 }),
    transfer: vi.fn().mockResolvedValue({ id: 2, seatId: 2, employeeId: 1 }),
    batchAssign: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    unassign: vi.fn().mockResolvedValue(undefined),
    listAssignments: vi.fn().mockResolvedValue([]),
  },
  changeLogApi: {
    listChangeLogs: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    }),
  },
}));

vi.mock('../../api/seat-api', () => ({
  seatApi: {
    listSeats: vi.fn().mockResolvedValue({
      data: [
        { id: 1, code: 'A-001', area: 'A区', type: 'standard', status: 'available' },
        { id: 2, code: 'A-002', area: 'A区', type: 'standard', status: 'available' },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    }),
  },
}));

vi.mock('../../api/client', () => ({
  apiGet: vi.fn().mockImplementation((url: string) => {
    if (url.startsWith('/departments')) {
      return Promise.resolve([
        { id: 1, name: '研发部' },
        { id: 2, name: '产品部' },
      ]);
    }
    // 员工列表返回分页结构
    return Promise.resolve({
      data: [
        { id: 1, empNo: 'EMP001', name: '张伟', departmentName: '研发部', departmentId: 1 },
        { id: 2, empNo: 'EMP002', name: '李娜', departmentName: '研发部', departmentId: 1 },
      ],
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
  }),
}));

import { assignmentApi, changeLogApi } from '../../api/assignment-api';
import { seatApi } from '../../api/seat-api';
import { apiGet } from '../../api/client';

function renderPage() {
  return render(
    <MemoryRouter>
      <SeatAssignmentPage />
    </MemoryRouter>,
  );
}

describe('SeatAssignmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染页面标题和四个 Tab', async () => {
    renderPage();

    expect(screen.getByText('工位分配管理')).toBeInTheDocument();
    expect(screen.getByText('分配管理')).toBeInTheDocument();
    expect(screen.getByText('工位变更')).toBeInTheDocument();
    expect(screen.getByText('批量分配')).toBeInTheDocument();
    expect(screen.getByText('变更历史')).toBeInTheDocument();
  });

  it('默认显示分配管理 Tab', () => {
    renderPage();
    expect(screen.getByText('分配工位给员工')).toBeInTheDocument();
  });

  it('点击 Tab 可切换到工位变更', async () => {
    renderPage();
    fireEvent.click(screen.getByText('工位变更'));
    expect(screen.getByText('将员工从当前工位转移到新的空闲工位')).toBeInTheDocument();
  });

  it('点击 Tab 可切换到批量分配', () => {
    renderPage();
    // Tab 中有两个"批量分配"文本（导航+内容标题），用 getByRole 定位 Tab 按钮
    const batchTab = screen.getByRole('button', { name: '批量分配' });
    fireEvent.click(batchTab);
  expect(screen.getByText('+ 添加一行')).toBeInTheDocument();
  });

  it('点击 Tab 可切换到变更历史', async () => {
    renderPage();
    fireEvent.click(screen.getByText('变更历史'));
    await waitFor(() => {
      expect(changeLogApi.listChangeLogs).toHaveBeenCalled();
    });
  });

  it('分配管理 Tab 应加载空闲工位和员工列表', async () => {
    renderPage();

    await waitFor(() => {
      expect(seatApi.listSeats).toHaveBeenCalledWith({ status: 'available', pageSize: 100 });
    });
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/employees?pageSize=100');
    });
  });

  it('未选择工位和员工时确认分配按钮应 disabled', async () => {
    renderPage();
    // 等待初始数据加载完成
    await waitFor(() => {
    const button = screen.getByText('确认分配');
    expect(button).toBeDisabled();
  });
  expect(assignmentApi.assign).not.toHaveBeenCalled();
    });

  it('批量分配 Tab 应能添加和删除行', () => {
    renderPage();
    const batchTab = screen.getByRole('button', { name: '批量分配' });
fireEvent.click(batchTab);

    // 初始有1行，添加后应有2行（2个删除按钮）
    const addButton = screen.getByText('+ 添加一行');
fireEvent.click(addButton);

    // 应有2行（通过删除按钮数量判断）
    let removeButtons = screen.getAllByText('✕');
expect(removeButtons).toHaveLength(2);

    // 删除第一行
    fireEvent.click(removeButtons[0]);
    removeButtons = screen.queryAllByText('✕');
  // 只剩1行时没有删除按钮
    expect(removeButtons).toHaveLength(0);
  });
});
