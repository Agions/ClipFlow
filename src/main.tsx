import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';
import './styles/cinema-theme.css';
import './styles/index.less';
import './assets/theme.less';

// 防止控制台出现错误消息
window.addEventListener('error', (e) => {
  // 忽略与@tauri-apps/api相关的错误
  if (e.message && (e.message.includes('@tauri-apps/api') || e.message.includes('Tauri'))) {
    e.preventDefault();
    logger.warn('Tauri API错误已被捕获:', e.message);
  }
});

// 创建根元素
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到根元素');
}

const root = ReactDOM.createRoot(rootElement);
const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode;

root.render(
  <RootWrapper>
    <App />
  </RootWrapper>
); 
