/**
 * 表格骨架屏组件
 * 接收列数和行数，渲染表格形态的骨架占位
 */

type TableSkeletonProps = {
  /** 列数 */
  columns: number;
  /** 行数，默认 5 */
  rows?: number;
};

/** 表格骨架 */
export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <tbody className="divide-y divide-gray-100" aria-busy="true">
      {Array.from({ length: rows }, (_, rowIdx) => (
        <tr key={rowIdx}>
          {Array.from({ length: columns }, (_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
