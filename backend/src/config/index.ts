/**
 * 应用配置
 * 从环境变量读取，所有配置集中管理
 */

/** 应用配置对象 */
export const appConfig = {
  /** 服务端口（从 PORT 读取，默认 8080，CI 部署契约要求） */
  port: Number(process.env.PORT || 8080),
  /** 前端开发服务器地址（用于 CORS） */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  /** 是否开发模式 */
  isDev: process.env.NODE_ENV !== 'production',
  /** 数据库路径 */
  dbPath: process.env.DB_PATH,
} as const;
