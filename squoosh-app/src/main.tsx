import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nProvider } from './i18n/useI18n';
import { detectLocale } from './i18n';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found.');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <I18nProvider initialLocale={detectLocale()}>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
