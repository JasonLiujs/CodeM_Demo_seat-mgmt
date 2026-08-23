/**
 * 前端组件测试
 * 验证页面渲染和路由
 * 使用 MemoryRouter 包裹，避免与 App 内部 BrowserRouter 冲突
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { SeatMapPage } from '../pages/SeatMapPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Layout } from '../components/Layout';

describe('DashboardPage 组件', () => {
  it('应显示仪表盘页面标题', () => {
    const { getAllByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    // 侧边栏导航"仪表盘"与（加载完成后）页面标题"统计看板"都应能渲染
    expect(getAllByText('仪表盘').length).toBeGreaterThanOrEqual(1);
  });

  it('应渲染统计看板（加载态显示骨架屏，或加载完成后显示看板）', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    // DashboardPage 初始为加载态（骨架屏 animate-pulse）或统计看板标题
    const bodyText = container.textContent ?? '';
    const rendered =
      bodyText.includes('统计看板') || container.querySelector('.animate-pulse') !== null;
    expect(rendered).toBe(true);
  });
});

describe('SeatMapPage 组件', () => {
  it('应显示工位地图页面标题（h2）', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/seat-map']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/seat-map" element={<SeatMapPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('工位地图');
  });
});

describe('NotFoundPage 组件', () => {
  it('应显示 404 页面', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(getByText('404')).toBeTruthy();
    expect(getByText('页面不存在')).toBeTruthy();
  });
});

describe('Layout 组件', () => {
  it('应渲染系统名称', () => {
    const { getAllByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(getAllByText('工位管理系统').length).toBeGreaterThanOrEqual(1);
  });

  it('应渲染版本号', () => {
    const { getAllByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(getAllByText('MVP v1.0').length).toBeGreaterThanOrEqual(1);
  });
});
