/**
 * 平面图 REST API 路由
 * 需求 7080518042：GET/POST /api/floor-plans
 */

import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { floorPlanService } from '../services/floor-plan-service.js';
import { createFloorPlanSchema } from '../schemas/floor-plan-schema.js';
import { AppError } from '../middleware/error.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** uploads 目录路径（相对于编译后 dist/routes/ 上溯三级到 backend/uploads/） */
const uploadsDir = join(__dirname, '..', '..', 'uploads');

// 确保 uploads 目录存在
mkdirSync(uploadsDir, { recursive: true });

/** multer 配置 — 存储到 backend/uploads/ 目录 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // 生成唯一文件名：时间戳-随机数.扩展名
    const ext = file.originalname.split('.').pop() || 'png';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, filename);
  },
});

/** multer 实例 — 限制文件类型和大小 */
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, '只支持 PNG/JPG 图片格式', 'INVALID_FILE_TYPE'));
    }
  },
});

export const floorPlansRouter = Router();

/**
 * GET /api/floor-plans — 查询所有平面图
 */
floorPlansRouter.get('/', (_req, res, next) => {
  try {
    const result = floorPlanService.listFloorPlans();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/floor-plans — 上传平面图底图
 * multipart/form-data: field "image" (PNG/JPG), field "name", optional "width"/"height"
 */
floorPlansRouter.post('/', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, '请上传底图文件（字段名 image）', 'FILE_REQUIRED');
    }

    const parsed = createFloorPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, `参数校验失败: ${parsed.error.message}`, 'VALIDATION_ERROR');
    }

    const { name, width, height } = parsed.data;
    // 生成 URL 路径（静态托管 /uploads 目录）
    const imageUrl = `/uploads/${req.file.filename}`;

    const floorPlan = floorPlanService.createFloorPlan(name, imageUrl, width, height);
    res.status(201).json({ success: true, data: floorPlan });
  } catch (err) {
    next(err);
  }
});
