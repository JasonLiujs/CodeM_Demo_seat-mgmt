/**
 * 数据库连接管理
 * 使用 better-sqlite3 嵌入式 SQLite，零运维
 * 延迟初始化：首次调用 getDb() 时才读取环境变量并创建实例，
 * 确保 beforeAll 设置 process.env.DB_PATH 后才连接测试库。
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { appConfig } from '../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 默认数据库文件路径 */
const DEFAULT_DB_PATH = join(__dirname, '..', '..', 'data', 'seat-mgmt.db');

/** SQLite 数据库实例（惰性单例） */
let dbInstance: Database.Database | null = null;

/** 获取数据库实例（首次调用时初始化） */
export function getDb(): Database.Database {
  if (dbInstance !== null) {
    return dbInstance;
  }

  // 优先从环境变量读取（支持测试时动态切换 DB_PATH），回退到 appConfig
  const dbPath = process.env.DB_PATH || appConfig.dbPath || DEFAULT_DB_PATH;

  // 确保数据目录存在
  const dbDir = dirname(dbPath);
  mkdirSync(dbDir, { recursive: true });

  dbInstance = new Database(dbPath);

  // 启用 WAL 模式提升并发读性能
  dbInstance.pragma('journal_mode = WAL');
  // 启用外键约束
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

/** 获取数据库文件路径（供测试和调试使用） */
export function getDbPath(): string {
  return appConfig.dbPath || DEFAULT_DB_PATH;
}

/** 关闭数据库连接（供测试和优雅关闭使用） */
export function closeDb(): void {
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
}
