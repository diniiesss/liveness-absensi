import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Map, 
  Users, 
  Settings, 
  User, 
  LogOut, 
  AlertCircle 
} from "lucide-react";
import toast from 'react-hot-toast';
import logoImage from "../../components/logo.webp";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // --- NAVIGASI KHUSUS ADMIN ---
  const menu = [
    { icon: <LayoutGrid size={24} />, path: "/admin/dashboard", label: "Dashboard" },
    { icon: <Map size={24} />, path: "/admin/monitoring", label: "Monitoring Kehadiran" },
    { icon: <Users size={24} />, path: "/admin/mahasiswa", label: "Manajemen Mahasiswa" },
    { icon: <Settings size={24} />, path: "/admin/settings", label: "Kelola Absensi" },
    { icon: <User size={24} />, path: "/admin/profile", label: "Profile Admin" },
  ];

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Berhasil keluar dari panel admin");
    navigate('/login');
  };

  return (
    <div className={`flex flex-col md:items-center w-full md:w-auto md:sticky md:h-[calc(100vh-2rem)] md:top-4 ${showLogoutModal ? 'z-[9999]' : 'z-50'}`}>
      
      {/* 1. LOGO ADMIN BOX (DISEMBUNYIKAN DI MOBILE, MUNCUL DI DESKTOP) */}
      <div className="hidden md:flex w-16 h-16 items-center justify-center mb-6 transition-transform hover:scale-105 p-1 self-center">
         <img 
          src={logoImage} 
          alt="Logo Kampus" 
          className="w-full h-full object-contain"/>
      </div>

      {/* 2. SIDEBAR PILL (KOTAK PUTIH MELAYANG) */}
      <aside className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto w-auto md:w-20 bg-[#52426b] rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-row md:flex-col items-center px-2 md:px-0 py-2 md:py-8 justify-between md:flex-1 z-50 border border-purple-900/10 md:border-gray-50">
        
        {/* Navigasi */}
        <div className="flex flex-row md:flex-col items-center justify-around w-full md:w-auto md:space-y-8">
          {menu.map((item, index) => (
            <NavLink 
              key={index} 
              to={item.path}
              className={({ isActive }) => `
                relative group p-2 md:p-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-0.5 active:scale-95
                ${isActive 
                  ? 'bg-[#e4d6f7] text-[#52426b] scale-105 md:scale-110 shadow-sm' : 'text-[#e4d6f7] hover:text-black'}
                ${index === 0 ? 'md:mb-12' : ''} /* Jarak ekstra setelah Dashboard khusus desktop */
              `}
            >
              <div className="scale-90 md:scale-100">{item.icon}</div>

              {/* Label untuk Mobile (Muncul di bawah ikon secara permanen) */}
              <span className="text-[8px] md:hidden font-bold uppercase tracking-tighter text-center max-w-[56px] truncate">
                {item.label === "Monitoring Kehadiran" ? "Kehadiran" : 
                 item.label === "Manajemen Mahasiswa" ? "Mahasiswa" : 
                 item.label === "Kelola Absensi" ? "Presensi" : 
                 item.label === "Profile Admin" ? "Profil" : item.label}
              </span>

              {/* Tooltip (Hanya di desktop) */}
              <span className="hidden md:block absolute left-16 top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 
                bg-[#e4d6f7] text-[#52426b] text-m font-medium rounded-lg 
                opacity-0 translate-x-[-10px] pointer-events-none transition-all duration-300 
                group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap shadow-lg z-[60]">
                {item.label}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#e4d6f7] rotate-45"></div>
              </span>
            </NavLink>
          ))}
          
          {/* Tombol Logout untuk Mobile */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="md:hidden relative group p-2 flex flex-col items-center justify-center gap-0.5 text-[#e4d6f7] hover:text-red-500 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="scale-90"><LogOut size={24} /></div>
            <span className="text-[8px] font-bold uppercase tracking-tighter">Keluar</span>
          </button>
        </div>

        {/* Tombol Logout (Bawah - Hanya desktop) */}
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="hidden md:block relative group p-3 text-[#e4d6f7] hover:text-red-500 transition-all duration-300 hover:scale-110"
        >
          <LogOut size={24} />
          
          <span className="absolute left-16 top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 
            bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg
            opacity-0 translate-x-[-10px] pointer-events-none transition-all duration-300 
            group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap shadow-xl z-[60]">
            Keluar
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
          </span>
        </button>
      </aside>

      {/* --- MODAL KONFIRMASI LOGOUT --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#f2e6ff] rounded-[3rem] p-10 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-50 h-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-[#3a2e4b] tracking-tight uppercase mb-2">Yakin ingin keluar?</h3>
              <p className="text-gray-400 text-sm font-medium mb-12 leading-relaxed">
                Anda akan keluar dari sesi manajemen sistem absensi biometrik Gunadarma.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleLogout}
                  className="w-full bg-[#52426b] text-[#e4d6f3] font-black py-4 rounded-2xl shadow-xl hover:bg-gray-900 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Ya, Keluar Sekarang
                </button>
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full bg-white text-gray-400 font-bold py-4 rounded-2xl hover:text-black hover:bg-red-500 transition-all text-xs uppercase tracking-widest"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSidebar;