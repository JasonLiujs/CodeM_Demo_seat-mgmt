/**
 * App 根组件 — 配置路由
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { SeatMapPage } from './pages/SeatMapPage';
import { SeatManagementPage } from './pages/seat-management/SeatManagementPage';
import { EmployeeManagementPage } from './pages/employee-management/EmployeeManagementPage';
import { SeatAssignmentPage } from './pages/seat-assignment/SeatAssignmentPage';
import { SeatQueryPage } from './pages/seat-query/SeatQueryPage';
import { Layout } from './components/Layout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/seat-map" element={<SeatMapPage />} />
          <Route path="/seat-management" element={<SeatManagementPage />} />
          <Route path="/seat-query" element={<SeatQueryPage />} />
          <Route path="/employee-management" element={<EmployeeManagementPage />} />
          <Route path="/seat-assignment" element={<SeatAssignmentPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
