/**
 * 应用入口：中立空模板。
 *
 * 这里只做最小初始化（挂载点 + 渲染循环占位）。
 * 具体项目需求在 src/ 下按需新增模块并在此处接入。
 */

const app = document.getElementById('app');

if (app) {
  const el = document.createElement('p');
  el.textContent = 'CodeM Demo — 空模板已就绪';
  el.style.cssText =
    'color:#9aa;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;font-family:system-ui,sans-serif;';
  app.appendChild(el);
}
