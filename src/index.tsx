import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ArchiveProvider } from './context/ArchiveContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ArchiveProvider>
      <App />
    </ArchiveProvider>
  </React.StrictMode>
);
