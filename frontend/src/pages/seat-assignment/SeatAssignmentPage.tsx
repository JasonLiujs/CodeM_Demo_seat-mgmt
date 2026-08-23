/**
 * 工位分配管理页面
 * 需求 7079581339：Tab 切换：分配管理 / 工位变更 / 批量分配 / 变更历史
 */

import { useState, useEffect, useCallback } from 'react';
import { assignmentApi, changeLogApi } from '../../api/assignment-api';
import { seatApi } from '../../api/seat-api';
import { apiGet } from '../../api/client';
import {
  SeatStatus,
} from '@seat-mgmt/shared';
import type {
  Seat,
  EmployeeWithDepartment,
  Department,
  ChangeLogWithDetail,
  ChangeLogAction,
  PaginatedResponse,
} from '@seat-mgmt/shared';
import { Skeleton } from '../../components/feedback';

/** Tab 类型 */
type TabType = 'assign' | 'transfer' | 'batch' | 'history';

/** 变更日志操作类型中文标签 */
const actionLabels: Record<string, string> = {
  assign: '分配',
  unassign: '取消分配',
  transfer: '工位变更',
  batch_assign: '批量分配',
  book: '预订',
  cancel_booking: '取消预订',
  create_seat: '创建工位',
  update_seat: '更新工位',
  delete_seat: '删除工位',
  import: '导入',
};

/** 操作类型标签颜色 */
const actionColors: Record<string, string> = {
  assign: 'bg-green-100 text-green-800',
  unassign: 'bg-orange-100 text-orange-800',
  transfer: 'bg-blue-100 text-blue-800',
  batch_assign: 'bg-purple-100 text-purple-800',
  book: 'bg-yellow-100 text-yellow-800',
  cancel_booking: 'bg-red-100 text-red-800',
  create_seat: 'bg-gray-100 text-gray-800',
  update_seat: 'bg-gray-100 text-gray-800',
  delete_seat: 'bg-red-100 text-red-800',
  import: 'bg-indigo-100 text-indigo-800',
};

export function SeatAssignmentPage() {
  const [activeTab, setActiveTab] = useState<TabType>('assign');

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">工位分配管理</h2>
        <p className="text-sm text-gray-500 mt-1">分配、变更、批量分配工位，查看变更历史</p>
      </div>

      {/* Tab 导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([
            { key: 'assign', label: '分配管理' },
            { key: 'transfer', label: '工位变更' },
            { key: 'batch', label: '批量分配' },
            { key: 'history', label: '变更历史' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'assign' && <AssignTab />}
      {activeTab === 'transfer' && <TransferTab />}
      {activeTab === 'batch' && <BatchTab />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
}

// ============================================================================
// 分配管理 Tab
// ============================================================================

function AssignTab() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<number | ''>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [assignedBy, setAssignedBy] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ seat?: string; employee?: string }>({});

  /** 加载空闲工位和员工列表 */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [seatResult, empResult] = await Promise.all([
        seatApi.listSeats({ status: SeatStatus.AVAILABLE, pageSize: 100 }),
        apiGet<PaginatedResponse<EmployeeWithDepartment>>('/employees?pageSize=100'),
      ]);
      setSeats(seatResult.data);
      setEmployees(empResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** 执行分配 */
  const handleAssign = async () => {
    // 内联校验
      const errors: { seat?: string; employee?: string } = {};
      if (!selectedSeatId) {
    errors.seat = '请选择工位';
    }
    if (!selectedEmployeeId) {
    errors.employee = '请选择员工';
    }
      setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
        return;
        }
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
      await assignmentApi.assign({
    seatId: Number(selectedSeatId),
      employeeId: Number(selectedEmployeeId),
    assignedBy,
      });
    setSuccess('工位分配成功');
  setSelectedSeatId('');
      setSelectedEmployeeId('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '分配失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
<Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          </div>
            ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">分配工位给员工</h3>

            {/* 选择工位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择工位（仅显示空闲）</label>
                <select
              value={selectedSeatId}
            onChange={(e) => {
          setSelectedSeatId(e.target.value ? Number(e.target.value) : '');
        setFormErrors((prev) => ({ ...prev, seat: undefined }));
}}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        formErrors.seat ? 'border-red-400' : 'border-gray-300'
          }`}
          >
            <option value="">请选择工位</option>
            {seats.map((seat) => (
            <option key={seat.id} value={seat.id}>
          {seat.code} — {seat.area} ({seat.type})
            </option>
            ))}
              </select>
                {formErrors.seat && (
              <p className="text-sm text-red-500 mt-1">{formErrors.seat}</p>
            )}
          </div>

{/* 选择员工 */}
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">选择员工</label>
          <select
          value={selectedEmployeeId}
            onChange={(e) => {
            setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '');
            setFormErrors((prev) => ({ ...prev, employee: undefined }));
            }}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        formErrors.employee ? 'border-red-400' : 'border-gray-300'
}`}
        >
        <option value="">请选择员工</option>
          {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
          {emp.empNo} — {emp.name}{emp.departmentName ? ` (${emp.departmentName})` : ''}
        </option>
          ))}
        </select>
      {formErrors.employee && (
            <p className="text-sm text-red-500 mt-1">{formErrors.employee}</p>
          )}
        </div>

        {/* 操作人 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
          <input
            type="text"
            value={assignedBy}
            onChange={(e) => setAssignedBy(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleAssign}
          disabled={loading || !selectedSeatId || !selectedEmployeeId}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '分配中...' : '确认分配'}
        </button>
      </div>
      )}
    </div>
  );
}

// ============================================================================
// 工位变更 Tab
// ============================================================================

function TransferTab() {
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [selectedSeatId, setSelectedSeatId] = useState<number | ''>('');
  const [operator, setOperator] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [empResult, seatResult] = await Promise.all([
        apiGet<PaginatedResponse<EmployeeWithDepartment>>('/employees?pageSize=100'),
        seatApi.listSeats({ status: SeatStatus.AVAILABLE, pageSize: 100 }),
      ]);
      setEmployees(empResult.data);
      setSeats(seatResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleTransfer = async () => {
    if (!selectedEmployeeId || !selectedSeatId) {
      setError('请选择员工和新工位');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await assignmentApi.transfer({
        employeeId: Number(selectedEmployeeId),
        newSeatId: Number(selectedSeatId),
        operator,
      });
      setSuccess('工位变更成功');
      setSelectedEmployeeId('');
      setSelectedSeatId('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '变更失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">工位变更</h3>
        <p className="text-sm text-gray-500">将员工从当前工位转移到新的空闲工位</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择员工</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : '')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择员工</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.empNo} — {emp.name}{emp.departmentName ? ` (${emp.departmentName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择新工位（仅显示空闲）</label>
          <select
            value={selectedSeatId}
            onChange={(e) => setSelectedSeatId(e.target.value ? Number(e.target.value) : '')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择工位</option>
            {seats.map((seat) => (
              <option key={seat.id} value={seat.id}>
                {seat.code} — {seat.area}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleTransfer}
          disabled={loading || !selectedEmployeeId || !selectedSeatId}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '变更中...' : '确认变更'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 批量分配 Tab
// ============================================================================

interface BatchPair {
  seatId: number | '';
  employeeId: number | '';
}

function BatchTab() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);
  const [pairs, setPairs] = useState<BatchPair[]>([{ seatId: '', employeeId: '' }]);
  const [assignedBy, setAssignedBy] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pairErrors, setPairErrors] = useState<Array<{ seat?: string; employee?: string }>>([{}]);

  const loadData = useCallback(async () => {
    try {
      const [seatResult, empResult] = await Promise.all([
        seatApi.listSeats({ status: SeatStatus.AVAILABLE, pageSize: 100 }),
        apiGet<PaginatedResponse<EmployeeWithDepartment>>('/employees?pageSize=100'),
      ]);
      setSeats(seatResult.data);
      setEmployees(empResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** 添加一行 */
  const addPair = () => {
    setPairs([...pairs, { seatId: '', employeeId: '' }]);
  setPairErrors([...pairErrors, {}]);
};

  /** 删除一行 */
    const removePair = (index: number) => {
  setPairs(pairs.filter((_, i) => i !== index));
setPairErrors(pairErrors.filter((_, i) => i !== index));
  };

    /** 更新某行 */
    const updatePair = (index: number, field: keyof BatchPair, value: string) => {
    const updated = [...pairs];
  updated[index] = { ...updated[index], [field]: value ? Number(value) : '' };
setPairs(updated);
  // 清除该行该字段的校验错误
  setPairErrors((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], [field]: undefined };
      return next;
      });
    };

    /** 执行批量分配 */
    const handleBatchAssign = async () => {
      // 内联校验：每一行如果有任意一个字段填了，另一个也必须填
      const errors = pairs.map((p) => {
        const e: { seat?: string; employee?: string } = {};
        if (p.seatId && !p.employeeId) {
          e.employee = '请选择员工';
        }
        if (p.employeeId && !p.seatId) {
          e.seat = '请选择工位';
        }
        return e;
      });
      setPairErrors(errors);
      const validPairs = pairs.filter((p) => p.seatId && p.employeeId);
      if (validPairs.length === 0) {
        setError('请至少添加一组有效的工位-员工配对');
        return;
      }
      // 如果有任何行的校验错误，阻止提交
      if (errors.some((e) => Object.keys(e).length > 0)) {
        return;
      }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await assignmentApi.batchAssign({
        pairs: validPairs.map((p) => ({
          seatId: Number(p.seatId),
          employeeId: Number(p.employeeId),
        })),
        assignedBy,
      });
      setSuccess(`批量分配成功，共分配 ${result.length} 个工位`);
      setPairs([{ seatId: '', employeeId: '' }]);
      setPairErrors([{}]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量分配失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">批量分配</h3>
          <button
            onClick={addPair}
            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            + 添加一行
          </button>
        </div>

        {/* 配对列表 */}
        <div className="space-y-3">
          {pairs.map((pair, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-8">{index + 1}.</span>
              <div className="flex-1">
                <select
                value={pair.seatId}
                onChange={(e) => updatePair(index, 'seatId', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                pairErrors[index]?.seat ? 'border-red-400' : 'border-gray-300'
                }`}
                  >
                    <option value="">选择工位</option>
                  {seats.map((seat) => (
                <option key={seat.id} value={seat.id}>
              {seat.code} — {seat.area}
              </option>
              ))}
                </select>
                {pairErrors[index]?.seat && (
                <p className="text-xs text-red-500 mt-1">{pairErrors[index].seat}</p>
              )}
                </div>
                <span className="text-gray-400">→</span>
                  <div className="flex-1">
                    <select
                  value={pair.employeeId}
                onChange={(e) => updatePair(index, 'employeeId', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              pairErrors[index]?.employee ? 'border-red-400' : 'border-gray-300'
                }`}
                  >
                  <option value="">选择员工</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                {emp.empNo} — {emp.name}
              </option>
            ))}
          </select>
                {pairErrors[index]?.employee && (
                  <p className="text-xs text-red-500 mt-1">{pairErrors[index].employee}</p>
                )}
              </div>
              {pairs.length > 1 && (
                <button
                  onClick={() => removePair(index)}
                  className="text-red-600 hover:text-red-800 text-sm px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
          <input
            type="text"
            value={assignedBy}
            onChange={(e) => setAssignedBy(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleBatchAssign}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '分配中...' : '确认批量分配'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 变更历史 Tab
// ============================================================================

function HistoryTab() {
  const [logs, setLogs] = useState<ChangeLogWithDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 筛选状态
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterDept, setFilterDept] = useState<number | ''>('');
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterSeat, setFilterSeat] = useState<string>('');

  const pageSize = 20;

  /** 加载部门列表 */
  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<Department[]>('/departments');
        setDepartments(data);
      } catch {
        // 忽略部门加载错误
      }
    })();
  }, []);

  /** 加载变更日志 */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await changeLogApi.listChangeLogs({
        action: (filterAction || undefined) as ChangeLogAction | undefined,
        departmentId: filterDept || undefined,
        employeeId: filterEmployee ? Number(filterEmployee) : undefined,
        seatId: filterSeat ? Number(filterSeat) : undefined,
        page,
        pageSize,
      });
      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载变更历史失败');
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDept, filterEmployee, filterSeat, page]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">操作类型</label>
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">全部</option>
              <option value="assign">分配</option>
              <option value="unassign">取消分配</option>
              <option value="transfer">工位变更</option>
              <option value="batch_assign">批量分配</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">部门</label>
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">全部</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">员工 ID</label>
            <input
              type="text"
              value={filterEmployee}
              onChange={(e) => { setFilterEmployee(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28"
              placeholder="如 1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">工位 ID</label>
            <input
              type="text"
              value={filterSeat}
              onChange={(e) => { setFilterSeat(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28"
              placeholder="如 1"
            />
          </div>
          <button
            onClick={() => void loadLogs()}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700"
          >
            筛选
          </button>
        </div>
      </div>

      {/* 变更日志表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">员工</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">工位变更</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">原因</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无变更记录</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{log.id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {log.employeeName ? `${log.employeeName} (${log.employeeEmpNo})` : '-'}
                    {log.employeeDepartmentName && (
                      <span className="text-gray-400 text-xs ml-1">[{log.employeeDepartmentName}]</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.oldSeatCode && log.newSeatCode
                      ? `${log.oldSeatCode} → ${log.newSeatCode}`
                      : log.newSeatCode || log.seatCode || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={log.reason || ''}>
                    {log.reason || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.createdAt}</td>
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
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
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
