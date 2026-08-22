/**
 * shared 模块入口
 * 导出所有共享类型定义
 *
 * 注意：此模块以 TypeScript 源码形式被前后端直接引用
 * （通过 npm workspace symlink），不经过编译输出 .js，
 * 因此 import 路径不带 .js 扩展名。
 */
export * from './types/index';
export * from './types/pagination';
