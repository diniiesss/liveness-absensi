import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Interceptor global untuk mengubah hardcode localhost:5000 ke URL backend produksi
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('http://localhost:5000')) {
    const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    config.url = config.url.replace('http://localhost:5000', apiURL);
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

