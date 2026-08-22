/**
 * 前端入口 — React 挂载点
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('根元素 #root 不存在');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
