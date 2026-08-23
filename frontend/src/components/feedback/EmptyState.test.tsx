/**
 * EmptyState 单元测试
 * 验证默认消息、自定义消息、图标、操作按钮
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('默认应显示「暂无数据」', () => {
    render(<EmptyState />);
    expect(screen.getByText('暂无数据')).toBeTruthy();
  });

  it('应显示自定义消息', () => {
    render(<EmptyState message="暂无工位数据" />);
    expect(screen.getByText('暂无工位数据')).toBeTruthy();
  });

  it('应渲染自定义图标', () => {
    render(<EmptyState message="空" icon={<span data-testid="icon">📋</span>} />);
    expect(screen.getByTestId('icon')).toBeTruthy();
  });

  it('应渲染操作按钮', () => {
    render(<EmptyState message="空" action={<button data-testid="action-btn">添加</button>} />);
    expect(screen.getByTestId('action-btn')).toBeTruthy();
  });
});
