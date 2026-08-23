/**
 * 员工管理页面
 * 需求 7080732492：员工列表（表格+搜索+筛选部门）+ CSV 上传组件
 */

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import type {
  EmployeeWithDepartment,
  Department,
  CsvImportResult,
  PaginatedResponse,
} from '@seat-mgmt/shared';
import { apiGet, apiPut, apiDelete } from '../../api/client';
import { TableSkeleton, EmptyState } from '../../components/feedback';

/** 员工管理页面 */
export function EmployeeManagementPage() {
  // 列表状态
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // 筛选状态
  const [searchName, setSearchName] = useState('');
  const [filterDept, setFilterDept] = useState<number | ''>('');

  // 加载与错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  // 加载部门列表
  const loadDepartments = useCallback(async () => {
    try {
      const data = await apiGet<Department[]>('/departments');
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载部门列表失败');
    }
  }, []);

  // 加载员工列表
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (searchName) params.set('name', searchName);
      if (filterDept) params.set('departmentId', String(filterDept));

      const result = await apiGet<PaginatedResponse<EmployeeWithDepartment>>(
        `/employees?${params.toString()}`,
      );
      setEmployees(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载员工列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchName, filterDept]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    loadEmployees();
  };

  // 翻页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // CSV 上传
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
      });
      const body = await res.json();
      if (!body.success) {
        throw new Error(body.error?.message || '导入失败');
      }
      setImportResult(body.data as CsvImportResult);
      // 刷新列表
      await loadEmployees();
      await loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV 导入失败');
    } finally {
      setLoading(false);
      // 清空 file input
      e.target.value = '';
    }
  };

  // 删除员工
  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此员工？')) return;
    try {
      await apiDelete<void>(`/employees/${id}`);
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 编辑员工（简单弹窗内联编辑）
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ empNo: '', name: '', departmentId: '' });

  const startEdit = (emp: EmployeeWithDepartment) => {
    setEditingId(emp.id);
    setEditForm({
      empNo: emp.empNo,
      name: emp.name,
      departmentId: emp.departmentId ? String(emp.departmentId) : '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await apiPut(`/employees/${editingId}`, {
        empNo: editForm.empNo,
        name: editForm.name,
        departmentId: editForm.departmentId ? Number(editForm.departmentId) : null,
      });
      setEditingId(null);
      await loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">员工管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理员工信息、部门归属，支持 CSV 批量导入</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 导入结果提示 */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          导入完成：共 {importResult.total} 行，新增 {importResult.inserted} 条，跳过{' '}
          {importResult.skipped} 条
          {importResult.errors.length > 0 && `，错误 ${importResult.errors.length} 条`}
        </div>
      )}

      {/* 搜索与筛选 */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="搜索员工姓名"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterDept}
          onChange={(e) => {
            setFilterDept(e.target.value ? Number(e.target.value) : '');
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部部门</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          搜索
        </button>
      </div>

      {/* CSV 上传 */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <label className="text-sm font-medium text-gray-700">CSV 批量导入：</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
        />
        <span className="text-xs text-gray-400">格式：工号,姓名,部门</span>
      </div>

      {/* 员工列表表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                工号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                姓名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                部门
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                创建时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton columns={6} />
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="暂无员工数据" />
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{emp.id}</td>
                  {editingId === emp.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          value={editForm.empNo}
                          onChange={(e) => setEditForm({ ...editForm, empNo: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.departmentId}
                          onChange={(e) =>
                            setEditForm({ ...editForm, departmentId: e.target.value })
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                        >
                          <option value="">无部门</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{emp.createdAt}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={handleSaveEdit}
                          className="text-green-600 hover:text-green-800 text-sm font-medium mr-2"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          取消
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-gray-800">{emp.empNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{emp.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {emp.departmentName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{emp.createdAt}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => startEdit(emp)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-2"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          删除
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              共 {total} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
