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

// Interceptor global penanganan token expired (401) -> Auto Logout & Redirect
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || "";
      const isAuthApi = url.includes('/login') || url.includes('/register') || url.includes('/check-npm') || url.includes('/check-face');
      
      if (!isAuthApi) {
        // Hapus token dari localStorage
        localStorage.removeItem('mahasiswa_token');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('npm');
        localStorage.removeItem('admin_email');
        
        // Redirect otomatis ke halaman login utama dengan query param untuk menampilkan toast
        if (window.location.pathname !== '/login') {
          if (!window.sessionAlertShown) {
            window.sessionAlertShown = true;
          }
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

