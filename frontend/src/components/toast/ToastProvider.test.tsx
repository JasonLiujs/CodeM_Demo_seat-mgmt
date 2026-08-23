/**
 * ToastProvider 单元测试
 * 验证 toast 渲染、点击 dismiss
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useToastStore } from '../../store/toast-store';
import { ToastProvider } from './ToastProvider';

describe('ToastProvider', () => {
  beforeEach(() => {
    // 清空 toast 队列
    useToastStore.getState().clearToasts();
    cleanup();
  });

  it('无 toast 时不渲染容器', () => {
    const { container } = render(<ToastProvider />);
    expect(container.firstChild).toBeNull();
  });

  it('添加 error toast 后应渲染消息文本', () => {
    useToastStore.getState().addToast('error', '操作失败');
    render(<ToastProvider />);
    expect(screen.getByText('操作失败')).toBeTruthy();
  });

  it('添加 success toast 后应渲染消息文本', () => {
    useToastStore.getState().addToast('success', '保存成功');
    render(<ToastProvider />);
    expect(screen.getByText('保存成功')).toBeTruthy();
  });

  it('点击关闭按钮应 dismiss 对应 toast', () => {
    useToastStore.getState().addToast('info', '提示信息');
    render(<ToastProvider />);
    const closeBtn = screen.getByLabelText('关闭');
    fireEvent.click(closeBtn);
    // toast 被移除后消息文本不再存在
    expect(screen.queryByText('提示信息')).toBeNull();
  });
});
