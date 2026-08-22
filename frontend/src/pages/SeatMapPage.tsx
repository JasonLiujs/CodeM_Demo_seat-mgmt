/**
 * 工位地图页面 — 集成 SVG 平面图编辑器
 * 需求 7078968348：底图选择/上传 + FloorPlanEditor + 属性面板
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FloorPlanEditor, PropertyPanel } from '../components/floor-plan-editor';
import { seatApi, floorPlanApi } from '../api/seat-api';
import {
  SeatType,
  SeatStatus,
} from '@seat-mgmt/shared';
import type {
  SeatWithAssignee,
  CreateSeatDto,
  UpdateSeatDto,
  FloorPlanResponse,
} from '@seat-mgmt/shared';

/** 工位计数器前缀（用于自动编号） */
const SEAT_CODE_PREFIX = 'SEAT-';

export function SeatMapPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlanResponse[]>([]);
  const [selectedFloorPlanId, setSelectedFloorPlanId] = useState<number | null>(null);
  const [seats, setSeats] = useState<SeatWithAssignee[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SeatWithAssignee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 上传相关状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  /** 加载平面图列表 */
  const loadFloorPlans = useCallback(async () => {
    try {
      const plans = await floorPlanApi.listFloorPlans();
      setFloorPlans(plans);
      // 自动选中第一个
      if (plans.length > 0 && selectedFloorPlanId === null) {
        setSelectedFloorPlanId(plans[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载平面图失败');
    }
  }, [selectedFloorPlanId]);

  /** 加载工位列表（按当前平面图筛选） */
  const loadSeats = useCallback(async () => {
    if (selectedFloorPlanId === null) {
      setSeats([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await seatApi.listSeats({
        floorPlanId: selectedFloorPlanId,
        page: 1,
        pageSize: 100,
      });
      setSeats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载工位失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFloorPlanId]);

  // 初始化加载平面图列表
  useEffect(() => {
    void loadFloorPlans();
  }, [loadFloorPlans]);

  // 平面图变化时加载工位
  useEffect(() => {
    void loadSeats();
  }, [loadSeats]);

  // 选中工位时同步选中对象
  useEffect(() => {
    if (selectedSeat) {
      const updated = seats.find((s) => s.id === selectedSeat.id);
      setSelectedSeat(updated ?? null);
    }
  }, [seats]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 生成下一个工位编号 */
  const generateSeatCode = useCallback(() => {
    const maxNum = seats.reduce((max, s) => {
      const match = s.code.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    return `${SEAT_CODE_PREFIX}${String(maxNum + 1).padStart(3, '0')}`;
  }, [seats]);

  /** 创建工位回调（拖拽绘制完成时触发） */
  const handleSeatCreate = useCallback(
    async (data: CreateSeatDto) => {
      try {
        const newSeat = await seatApi.createSeat({
          ...data,
          floorPlanId: selectedFloorPlanId,
          code: data.code || generateSeatCode(),
          area: data.area || '未分配区域',
          type: data.type || SeatType.STANDARD,
          status: data.status || SeatStatus.AVAILABLE,
        });
        setSeats((prev) => [...prev, newSeat]);
        setSelectedSeat(newSeat);
      } catch (err) {
        setError(err instanceof Error ? err.message : '创建工位失败');
      }
    },
    [selectedFloorPlanId, generateSeatCode],
  );

  /** 更新工位回调（移动/调整大小/属性编辑时触发） */
  const handleSeatUpdate = useCallback(
    async (id: number, data: UpdateSeatDto) => {
      // 先乐观更新本地状态
      setSeats((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
      );
      // 同步选中工位
      setSelectedSeat((prev) =>
        prev && prev.id === id ? { ...prev, ...data } : prev,
      );
      try {
        const updated = await seatApi.updateSeat(id, data);
        setSeats((prev) => prev.map((s) => (s.id === id ? updated : s)));
        setSelectedSeat(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新工位失败');
        // 失败时重新加载
        void loadSeats();
      }
    },
    [loadSeats],
  );

  /** 删除工位回调 */
  const handleSeatDelete = useCallback(
    async (id: number) => {
      // 乐观删除
      setSeats((prev) => prev.filter((s) => s.id !== id));
      setSelectedSeat(null);
      try {
        await seatApi.deleteSeat(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除工位失败');
        void loadSeats();
      }
    },
    [loadSeats],
  );

  /** 上传底图 */
  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('请选择图片文件');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const plan = await floorPlanApi.uploadFloorPlan(
        file,
        uploadName || file.name.replace(/\.[^.]+$/, ''),
      );
      setFloorPlans((prev) => [...prev, plan]);
      setSelectedFloorPlanId(plan.id);
      setUploadName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  /** 当前选中的平面图对象 */
  const currentFloorPlan = floorPlans.find((p) => p.id === selectedFloorPlanId) ?? null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">工位地图</h2>

      {/* 顶部工具栏：底图选择 + 上传 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 底图选择 */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">选择底图</label>
            <select
              value={selectedFloorPlanId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedFloorPlanId(val ? Number(val) : null);
                setSelectedSeat(null);
              }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm min-w-[200px]"
            >
              <option value="">— 请选择 —</option>
              {floorPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
            </select>
          </div>

          {/* 上传新底图 */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">底图名称</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="自动取文件名"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">图片文件</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="text-sm"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '上传中...' : '上传底图'}
            </button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 编辑器 + 属性面板 */}
      <div className="flex gap-4">
        {currentFloorPlan ? (
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            {loading && (
              <div className="text-center text-gray-400 py-4 text-sm">加载工位中...</div>
            )}
            <FloorPlanEditor
              floorPlanId={currentFloorPlan.id}
              seats={seats}
              imageUrl={currentFloorPlan.imageUrl}
              width={currentFloorPlan.width}
              height={currentFloorPlan.height}
              selectedSeatId={selectedSeat?.id ?? null}
              onSelectSeat={(seat) => setSelectedSeat(seat)}
              onSeatCreate={handleSeatCreate}
              onSeatUpdate={handleSeatUpdate}
              onSeatDelete={handleSeatDelete}
            />
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-center h-96 text-gray-400 text-sm border border-dashed border-gray-200 rounded">
              请选择或上传底图
            </div>
          </div>
        )}

        <PropertyPanel
          seat={selectedSeat}
          onChange={(data) => {
            if (selectedSeat) {
              void handleSeatUpdate(selectedSeat.id, data);
            }
          }}
          onDelete={(id) => void handleSeatDelete(id)}
        />
      </div>
    </div>
  );
}
