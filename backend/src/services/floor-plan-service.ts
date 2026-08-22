/**
 * 平面图服务层
 * 需求 7080518042：平面图列表 + 底图上传
 */

import { getDb } from '../db/connection.js';
import type { FloorPlanResponse } from '@seat-mgmt/shared';

/** 将数据库行映射为 FloorPlan 实体 */
interface FloorPlanRow {
  id: number;
  name: string;
  image_url: string;
  width: number;
  height: number;
  created_at: string;
}

/** 行映射到响应 */
function mapRow(row: FloorPlanRow): FloorPlanResponse {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

/**
 * 平面图服务 — 列表查询 + 底图上传
 */
export class FloorPlanService {
  /**
   * 查询所有平面图
   * @returns 平面图列表
   */
  listFloorPlans(): FloorPlanResponse[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM floor_plans ORDER BY id ASC').all() as FloorPlanRow[];
    return rows.map(mapRow);
  }

  /**
   * 创建平面图（上传底图后调用）
   * @param name 平面图名称
   * @param imageUrl 底图 URL
   * @param width 宽度
   * @param height 高度
   * @returns 新创建的平面图
   */
  createFloorPlan(name: string, imageUrl: string, width: number, height: number): FloorPlanResponse {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO floor_plans (name, image_url, width, height)
      VALUES (?, ?, ?, ?)
    `).run(name, imageUrl, width, height);

    const row = db.prepare('SELECT * FROM floor_plans WHERE id = ?').get(result.lastInsertRowid) as FloorPlanRow;
    return mapRow(row);
  }
}

/** 平面图服务单例 */
export const floorPlanService = new FloorPlanService();
