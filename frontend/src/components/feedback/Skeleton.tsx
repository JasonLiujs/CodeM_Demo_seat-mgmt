/**
 * 通用骨架屏组件
 * 基础 animate-pulse 占位块，可组合使用
 */

type SkeletonProps = {
  /** 额外 className */
  className?: string;
};

/** 通用骨架屏 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}
