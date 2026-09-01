import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import { logger } from '@/shared/utils/logging';
import './styles/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到根元素');
}

const root = ReactDOM.createRoot(rootElement);

if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason instanceof Error && e.reason.message.includes('@tauri-apps/api')) {
      logger.warn('[fablr] Tauri API unhandled rejection', e.reason.message);
    }
  });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
