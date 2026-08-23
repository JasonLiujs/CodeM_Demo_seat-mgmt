/**
 * 全局布局组件 — 响应式侧边栏导航 + 面包屑 + 内容区域
 * xl(1280px+)：固定 w-64 侧边栏 + main p-6
 * md(768px+)及小屏：可折叠抽屉 + 顶部 hamburger 按钮
 */

import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Breadcrumb } from './layout/Breadcrumb';

/** 导航项 */
const navItems = [
  { to: '/dashboard', label: '仪表盘' },
  { to: '/seat-map', label: '工位地图' },
  { to: '/seat-management', label: '工位管理' },
  { to: '/seat-query', label: '工位查询' },
  { to: '/seat-booking', label: '工位预约' },
  { to: '/seat-assignment', label: '工位分配' },
  { to: '/employee-management', label: '员工管理' },
  { to: '/change-history', label: '变更历史' },
];

/** 布局组件 */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* xl 桌面端：固定侧边栏 */}
      <aside className="hidden xl:flex w-64 bg-slate-800 text-white flex-col flex-shrink-0">
        <div className="px-6 py-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">工位管理系统</h1>
          <p className="text-xs text-slate-400 mt-1">MVP v1.0</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* md 及以下：抽屉式侧边栏 */}
      {sidebarOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* 抽屉侧边栏 */}
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-800 text-white flex flex-col z-50 xl:hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">工位管理系统</h1>
                <p className="text-xs text-slate-400 mt-1">MVP v1.0</p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
                aria-label="关闭侧边栏"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏：md 及以下显示 hamburger 按钮 */}
        <header className="xl:hidden bg-slate-800 text-white px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:text-slate-300 text-2xl leading-none"
            aria-label="打开侧边栏"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold">工位管理系统</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
