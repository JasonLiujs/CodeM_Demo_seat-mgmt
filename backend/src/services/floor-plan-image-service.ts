import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFloorPlanSvg } from '../db/floor-plan-svg.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_FLOOR_PLAN_FILENAME = 'floor-plan-main.svg';
export const DEFAULT_FLOOR_PLAN_URL = `/uploads/${DEFAULT_FLOOR_PLAN_FILENAME}`;

/**
 * 恢复代码内置的默认平面图。
 *
 * 容器发布会替换根文件系统，因此即使 SQLite 仍保存 imageUrl，uploads 文件也可能不存在。
 * 每次服务启动重写该确定性 SVG，保证数据库引用始终有对应文件。
 */
export function ensureDefaultFloorPlanImage(
  uploadsDir: string = join(__dirname, '..', '..', 'uploads'),
): string {
  mkdirSync(uploadsDir, { recursive: true });
  const imagePath = join(uploadsDir, DEFAULT_FLOOR_PLAN_FILENAME);
  writeFileSync(imagePath, buildFloorPlanSvg(), 'utf-8');
  return imagePath;
}
