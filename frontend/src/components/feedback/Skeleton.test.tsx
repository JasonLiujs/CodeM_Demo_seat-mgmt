/**
 * Skeleton 单元测试
 * 验证骨架屏渲染和 className 传递
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('应渲染骨架屏元素', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-gray-200');
    expect(el.className).toContain('rounded');
  });

  it('应传递自定义 className', () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('w-32');
  });
});
