/**
 * SearchBar — 姓名搜索输入框（受控 + 防抖）
 * 需求 7080593490：按姓名搜索同事工位，命中工位高亮闪烁
 */

import { useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from './constants';

/** SearchBar Props */
type SearchBarProps = {
  /** 搜索查询变化回调（已防抖） */
  onSearchChange: (query: string) => void;
  /** 受控占位符 */
  placeholder?: string;
};

/**
 * SearchBar — 受控输入框，本地维护即时值，防抖后向上通知
 */
export function SearchBar({ onSearchChange, placeholder = '按姓名搜索工位...' }: SearchBarProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, onSearchChange]);

  return (
    <input
      type="search"
      role="searchbox"
      aria-label="搜索工位"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  );
}
