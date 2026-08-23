/**
 * 临时工位预约管理页面
 * 需求 7079562886：选空闲临时工位→选日期和时段→确认预约。我的预约列表（当前/历史）。取消预约按钮。日历视图展示工位预约时段。
 */

import { useState, useEffect, useCallback } from 'react';
import { bookingApi } from '../../api/booking-api';
import { seatApi } from '../../api/seat-api';
import type { BookingWithDetail, SeatWithAssignee } from '@seat-mgmt/shared';
import { SeatStatus, BookingStatus } from '@seat-mgmt/shared';
import { TableSkeleton, EmptyState } from '../../components/feedback';

/** 日期格式化为 YYYY-MM-DD */
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 日期时间格式化为可读字符串 */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = formatDate(d);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} ${time}`;
}

/** 预约状态中文标签 */
const statusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成',
  expired: '已过期',
};

/** 预约状态颜色 */
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-500',
};

/** Tab 切换 */
type Tab = 'create' | 'current' | 'history';

/** 日历视图选中日期 */
type CalendarView = 'list' | 'calendar';

/** 预约管理页面 */
export function SeatBookingPage() {
  const [tab, setTab] = useState<Tab>('create');
  const [calendarView, setCalendarView] = useState<CalendarView>('list');

  // --- 创建预约状态 ---
  const [seats, setSeats] = useState<SeatWithAssignee[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState(formatDate(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [employeeId, setEmployeeId] = useState<number>(1);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // 表单校验错误（内联提示）
  const [formErrors, setFormErrors] = useState<{
    seat?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  // --- 预约列表状态 ---
  const [currentBookings, setCurrentBookings] = useState<BookingWithDetail[]>([]);
  const [historyBookings, setHistoryBookings] = useState<BookingWithDetail[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 日历视图数据
  const [calendarDate, setCalendarDate] = useState(formatDate(new Date()));
  const [calendarBookings, setCalendarBookings] = useState<BookingWithDetail[]>([]);

  /** 加载空闲临时工位 */
  const loadAvailableSeats = useCallback(async () => {
    try {
      const result = await seatApi.listSeats({ status: SeatStatus.AVAILABLE, pageSize: 100 });
      setSeats(result.data);
    } catch (err) {
      console.error('加载工位列表失败:', err);
    }
  }, []);

  /** 加载当前预约（active） */
  const loadCurrentBookings = useCallback(async (p: number) => {
    setLoadingList(true);
    setListError(null);
    try {
      const result = await bookingApi.listBookings({
        page: p,
        pageSize: 20,
      });
      // 当前预约 = pending/confirmed
      const active = result.data.filter(
        (b) => b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED,
      );
      setCurrentBookings(active);
      setHistoryBookings(
        result.data.filter(
          (b) =>
            b.status === BookingStatus.CANCELLED ||
            b.status === BookingStatus.COMPLETED ||
            b.status === BookingStatus.EXPIRED,
        ),
      );
      setTotalPages(result.totalPages);
      setPage(p);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '加载预约列表失败');
    } finally {
      setLoadingList(false);
    }
  }, []);

  /** 加载日历视图某日预约 */
  const loadCalendarBookings = useCallback(async (date: string) => {
    setLoadingList(true);
    setListError(null);
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const result = await bookingApi.listBookings({
        startDate: date,
        endDate: nextDay.toISOString(),
        pageSize: 100,
      });
      setCalendarBookings(result.data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '加载日历数据失败');
    } finally {
      setLoadingList(false);
    }
  }, []);

  /** 创建预约 */
  const handleCreateBooking = async () => {
    // 内联校验
    const errors: { seat?: string; startTime?: string; endTime?: string } = {};
    if (!selectedSeatId) {
      errors.seat = '请选择工位';
    }
    if (!startTime) {
      errors.startTime = '请选择开始时间';
    }
    if (!endTime) {
      errors.endTime = '请选择结束时间';
    }
    if (startTime && endTime && endTime <= startTime) {
      errors.endTime = '结束时间必须晚于开始时间';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setCreating(true);
    setCreateMsg(null);
    try {
      const startISO = new Date(`${bookingDate}T${startTime}:00`).toISOString();
      const endISO = new Date(`${bookingDate}T${endTime}:00`).toISOString();

      await bookingApi.createBooking({
        seatId: selectedSeatId as number,
        employeeId,
        startTime: startISO,
        endTime: endISO,
      });
      setCreateMsg({ type: 'success', text: '预约成功' });
      // 刷新工位列表（已预约的工位状态变为 reserved）
      await loadAvailableSeats();
      setSelectedSeatId(null);
    } catch (err) {
      setCreateMsg({ type: 'error', text: err instanceof Error ? err.message : '预约失败' });
    } finally {
      setCreating(false);
    }
  };

  /** 取消预约 */
  const handleCancel = async (id: number) => {
    if (!confirm(`确认取消预约 ${id}？`)) return;
    try {
      await bookingApi.cancelBooking(id, 'user');
      await loadCurrentBookings(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消失败');
    }
  };

  // 初始加载
  useEffect(() => {
    loadAvailableSeats();
  }, [loadAvailableSeats]);

  useEffect(() => {
    if (tab === 'current' || tab === 'history') {
      loadCurrentBookings(1);
    }
  }, [tab, loadCurrentBookings]);

  useEffect(() => {
    if (calendarView === 'calendar') {
      loadCalendarBookings(calendarDate);
    }
  }, [calendarView, calendarDate, loadCalendarBookings]);

  return (
    <div className="space-y-6">
      {/* 标题和切换 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">临时工位预约</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCalendarView(calendarView === 'list' ? 'calendar' : 'list')}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {calendarView === 'list' ? '日历视图' : '列表视图'}
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            { key: 'create', label: '创建预约' },
            { key: 'current', label: '我的预约' },
            { key: 'history', label: '历史预约' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 创建预约 Tab */}
      {tab === 'create' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-700">预约临时工位</h3>

          {/* 选工位 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择空闲临时工位</label>
            <select
              value={selectedSeatId ?? ''}
              onChange={(e) => {
                setSelectedSeatId(Number(e.target.value) || null);
                setFormErrors((prev) => ({ ...prev, seat: undefined }));
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                formErrors.seat ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">— 请选择工位 —</option>
              {seats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}（{s.area} · {s.type}）
                </option>
              ))}
            </select>
            {formErrors.seat && <p className="text-sm text-red-500 mt-1">{formErrors.seat}</p>}
            {seats.length === 0 && <p className="text-sm text-gray-400 mt-1">暂无空闲临时工位</p>}
          </div>

          {/* 员工 ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">员工 ID</label>
            <input
              type="number"
              min={1}
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 日期选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={bookingDate}
              min={formatDate(new Date())}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 时段选择 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setFormErrors((prev) => ({ ...prev, startTime: undefined, endTime: undefined }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  formErrors.startTime ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formErrors.startTime && (
                <p className="text-sm text-red-500 mt-1">{formErrors.startTime}</p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setFormErrors((prev) => ({ ...prev, endTime: undefined }));
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  formErrors.endTime ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formErrors.endTime && (
                <p className="text-sm text-red-500 mt-1">{formErrors.endTime}</p>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleCreateBooking}
            disabled={creating || !selectedSeatId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '预约中...' : '确认预约'}
          </button>

          {/* 消息提示 */}
          {createMsg && (
            <div
              className={`px-4 py-2 rounded-lg text-sm ${
                createMsg.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {createMsg.text}
            </div>
          )}
        </div>
      )}

      {/* 当前预约 / 历史预约 Tab */}
      {(tab === 'current' || tab === 'history') && (
        <div className="space-y-4">
          {calendarView === 'calendar' && tab === 'current' && (
            <CalendarView
              date={calendarDate}
              onDateChange={setCalendarDate}
              bookings={calendarBookings}
              onCancel={handleCancel}
            />
          )}

          {calendarView === 'list' && (
            <>
              {loadingList && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          工位
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          员工
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          开始
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          结束
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          状态
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <TableSkeleton columns={7} />
                  </table>
                </div>
              )}
              {listError && <p className="text-red-600">{listError}</p>}

              {!loadingList && !listError && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          工位
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          员工
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          开始
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          结束
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          状态
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(tab === 'current' ? currentBookings : historyBookings).map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{b.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {b.seatCode ?? `#${b.seatId}`}
                            {b.seatArea && (
                              <span className="text-gray-400 ml-1">({b.seatArea})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {b.employeeName ?? `#${b.employeeId}`}
                            {b.employeeEmpNo && (
                              <span className="text-gray-400 ml-1">({b.employeeEmpNo})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(b.startTime)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDateTime(b.endTime)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] ?? ''}`}
                            >
                              {statusLabels[b.status] ?? b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {(b.status === BookingStatus.PENDING ||
                              b.status === BookingStatus.CONFIRMED) && (
                              <button
                                onClick={() => handleCancel(b.id)}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                取消
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(tab === 'current' ? currentBookings : historyBookings).length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              message={`暂无${tab === 'current' ? '当前' : '历史'}预约`}
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => loadCurrentBookings(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => loadCurrentBookings(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 日历视图组件 — 展示某日工位预约时段 */
function CalendarView({
  date,
  onDateChange,
  bookings,
  onCancel,
}: {
  date: string;
  onDateChange: (d: string) => void;
  bookings: BookingWithDetail[];
  onCancel: (id: number) => void;
}) {
  /** 生成 8:00-20:00 时间轴 */
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  /** 将 ISO 时间转为当日小时偏移 */
  function getTimeOffset(iso: string): number {
    const d = new Date(iso);
    return d.getHours() + d.getMinutes() / 60;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">日历视图</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {bookings.length === 0 ? (
        <p className="text-center text-gray-400 py-8">该日暂无预约</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const startOffset = getTimeOffset(b.startTime) - 8;
            const endOffset = getTimeOffset(b.endTime) - 8;
            const leftPct = (startOffset / 12) * 100;
            const widthPct = ((endOffset - startOffset) / 12) * 100;
            const isActive =
              b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED;

            return (
              <div key={b.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {b.seatCode ?? `工位 #${b.seatId}`}
                    {b.seatArea && <span className="text-gray-400 ml-1">({b.seatArea})</span>}
                    <span className="ml-2 text-gray-500">
                      — {b.employeeName ?? `员工 #${b.employeeId}`}
                    </span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[b.status] ?? ''}`}>
                    {statusLabels[b.status] ?? b.status}
                  </span>
                </div>
                {/* 时间轴 */}
                <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                  {/* 小时刻度 */}
                  <div className="absolute inset-0 flex">
                    {hours.map((h) => (
                      <div key={h} className="flex-1 border-l border-gray-200 first:border-l-0" />
                    ))}
                  </div>
                  {/* 预约时段 */}
                  <div
                    className={`absolute top-0 bottom-0 rounded flex items-center px-2 text-xs text-white font-medium ${
                      isActive ? 'bg-blue-500' : 'bg-gray-400'
                    }`}
                    style={{
                      left: `${Math.max(0, leftPct)}%`,
                      width: `${Math.max(2, widthPct)}%`,
                    }}
                  >
                    {formatDateTime(b.startTime).slice(11)} - {formatDateTime(b.endTime).slice(11)}
                  </div>
                </div>
                {isActive && (
                  <button
                    onClick={() => onCancel(b.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    取消预约
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
