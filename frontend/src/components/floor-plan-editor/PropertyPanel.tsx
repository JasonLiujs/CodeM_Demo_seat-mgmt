/**
 * 工位属性编辑面板
 * 需求 7078968348：右侧面板编辑工位属性（编号、区域、类型），变更同步到后端
 */

import { useEffect, useState } from 'react';
import type { PropertyPanelProps } from '@seat-mgmt/shared';
import { SeatType, SeatStatus } from '@seat-mgmt/shared';
import type { SeatType as SeatTypeValue, SeatStatus as SeatStatusValue } from '@seat-mgmt/shared';

/** 工位类型选项 */
const seatTypeOptions: Array<{ value: SeatTypeValue; label: string }> = [
  { value: SeatType.STANDARD, label: '标准工位' },
  { value: SeatType.STANDING, label: '站立工位' },
  { value: SeatType.MEETING, label: '会议室' },
  { value: SeatType.PRIVATE, label: '独立间' },
];

/** 工位状态选项 */
const seatStatusOptions: Array<{ value: SeatStatusValue; label: string }> = [
  { value: SeatStatus.AVAILABLE, label: '空闲' },
  { value: SeatStatus.OCCUPIED, label: '占用' },
  { value: SeatStatus.RESERVED, label: '已预订' },
  { value: SeatStatus.MAINTENANCE, label: '维护中' },
];

/**
 * PropertyPanel — 工位属性编辑面板
 * 当 seat 为 null 时显示提示信息；非空时显示编辑表单
 */
export function PropertyPanel({ seat, onChange, onDelete }: PropertyPanelProps) {
  const [code, setCode] = useState('');
  const [area, setArea] = useState('');
  const [type, setType] = useState<SeatTypeValue>(SeatType.STANDARD);
  const [status, setStatus] = useState<SeatStatusValue>(SeatStatus.AVAILABLE);

  // seat 变化时同步本地状态
  useEffect(() => {
    if (seat) {
      setCode(seat.code);
      setArea(seat.area);
      setType(seat.type);
      setStatus(seat.status);
    }
  }, [seat]);

  // 未选中工位时显示空状态
  if (!seat) {
    return (
      <aside className="w-80 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">工位属性</h3>
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 border border-dashed border-gray-200 rounded">
          点击工位框以编辑属性
        </div>
      </aside>
    );
  }

  /** 编号变更 */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCode(value);
    onChange({ code: value });
  };

  /** 区域变更 */
  const handleAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setArea(value);
    onChange({ area: value });
  };

  /** 类型变更 */
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SeatTypeValue;
    setType(value);
    onChange({ type: value });
  };

  /** 状态变更 */
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SeatStatusValue;
    setStatus(value);
    onChange({ status: value });
  };

  /** 删除工位 */
  const handleDelete = () => {
    if (window.confirm(`确认删除工位 ${seat.code}？`)) {
      onDelete(seat.id);
    }
  };

  return (
    <aside className="w-80 bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">工位属性</h3>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          删除工位
        </button>
      </div>

      <div className="space-y-3">
        {/* 工位 ID（只读） */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
          <input
            type="text"
            value={seat.id}
            disabled
            className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded text-gray-400"
          />
        </div>

        {/* 工位编号 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">工位编号</label>
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 区域 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">区域</label>
          <input
            type="text"
            value={area}
            onChange={handleAreaChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 类型 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">类型</label>
          <select
            value={type}
            onChange={handleTypeChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {seatTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
          <select
            value={status}
            onChange={handleStatusChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {seatStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 位置信息（只读） */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-1">位置与尺寸</label>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <span>X: {Math.round(seat.x)}</span>
            <span>Y: {Math.round(seat.y)}</span>
            <span>W: {Math.round(seat.w)}</span>
            <span>H: {Math.round(seat.h)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
