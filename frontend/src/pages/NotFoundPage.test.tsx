/**
 * NotFoundPage 单元测试
 * 验证 404 页面渲染和返回首页按钮
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('应显示 404 标题和「页面不存在」', () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <Routes>
          <Route path="/nonexistent" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('404')).toBeTruthy();
    expect(screen.getByText('页面不存在')).toBeTruthy();
  });

  it('应渲染返回首页按钮', () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent']}>
        <Routes>
          <Route path="/nonexistent" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('返回首页')).toBeTruthy();
  });
});
