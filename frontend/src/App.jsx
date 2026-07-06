import React, { useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- KOMPONEN SIDEBAR & LAYOUT ---
import Sidebar from './pages/Sidebar'; 
import AdminSidebar from './pages/admin/AdminSidebar'; 

// --- HALAMAN PUBLIK ---
import Login from './pages/Login';
import Register from './pages/RegisterFace';

// --- HALAMAN MAHASISWA ---
import Dashboard from './pages/Dashboard';
import Statistik from './pages/Statistik';
import Riwayat from './pages/Riwayat';
import FAQ from './pages/FAQ';
import Profile from './pages/Profile';

// --- HALAMAN ADMIN ---
import DashboardHome from './pages/admin/DashboardHome';
import MonitoringKehadiran from './pages/admin/MonitoringKehadiran';
import ManajemenMahasiswa from './pages/admin/ManajemenMahasiswa';
import KelolaAbsensi from './pages/admin/KelolaAbsensi';
import AdminProfile from './pages/admin/AdminProfile';

const StudentLayout = ({ children }) => (
  <div className="min-h-screen bg-[#F8F4FF] flex flex-col md:flex-row p-4 pb-24 md:pb-4 font-poppins text-black">
    <Sidebar />
    <main className="flex-1 md:ml-8 overflow-y-auto">{children}</main>
  </div>
);

const AdminLayout = ({ children }) => (
  <div className="min-h-screen bg-[#F8F4FF] flex flex-col md:flex-row p-4 pb-24 md:pb-4 font-poppins text-black">
    <AdminSidebar />
    <main className="flex-1 md:ml-8 overflow-y-auto">{children}</main>
  </div>
);

// --- KOMPONEN UTAMA ---
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. INTERCEPTOR REQUEST: Otomatis nempel token ke setiap request
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('mahasiswa_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 2. INTERCEPTOR RESPONSE: Auto-logout jika token expired (401)
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '1rem', background: '#fff', color: '#000',
            fontSize: '11px', fontWeight: '900', textTransform: 'uppercase',
            letterSpacing: '0.05em', border: '1px solid #f3f4f6',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px 24px'
          },
          success: { iconTheme: { primary: '#9333ea', secondary: '#fff' } },
        }}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-wajah" element={<Register />} />

        {/* --- GROUP RUTE ADMIN --- */}
        <Route path="/admin/dashboard" element={<AdminLayout><DashboardHome /></AdminLayout>} />
        <Route path="/admin/monitoring" element={<AdminLayout><MonitoringKehadiran /></AdminLayout>} />
        <Route path="/admin/mahasiswa" element={<AdminLayout><ManajemenMahasiswa /></AdminLayout>} />
        <Route path="/admin/settings" element={<AdminLayout><KelolaAbsensi /></AdminLayout>} />
        <Route path="/admin/profile" element={<AdminLayout><AdminProfile /></AdminLayout>} />

        {/* --- GROUP RUTE MAHASISWA --- */}
        <Route path="/dashboard" element={<StudentLayout><Dashboard /></StudentLayout>} />
        <Route path="/statistik" element={<StudentLayout><Statistik /></StudentLayout>} />
        <Route path="/riwayat" element={<StudentLayout><Riwayat /></StudentLayout>} />
        <Route path="/faq" element={<StudentLayout><FAQ /></StudentLayout>} />
        <Route path="/profile" element={<StudentLayout><Profile /></StudentLayout>} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;