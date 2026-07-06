import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { 
  UserCheck, 
  UserX, 
  ClipboardList, 
  Clock, 
  ArrowRight,
  Loader2,
  Edit3
} from "lucide-react";
import toast from 'react-hot-toast';
import logoImage from "../../components/logo.webp";

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalAbsensi: 0,
    hadir: 0,
    tidakHadir: 0
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🔥 STATE BARU: Menampung nama admin dari database
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };

        // 🔥 SINKRONISASI DATABASE: Menambahkan API profile ke dalam Promise.all
        const [resAttendance, resStats, resProfile] = await Promise.all([
          axios.get("http://localhost:5000/api/admin/kehadiran?sessionOnly=true", { headers }),
          axios.get("http://localhost:5000/api/admin/stats", { headers }),
          axios.get("http://localhost:5000/api/admin/profile", { headers }) 
        ]);

        setRecentAttendance(resAttendance.data.slice(0, 6)); 
        
        // Set nama admin dari database pusat
        if (resProfile.data && resProfile.data.username) {
          setAdminName(resProfile.data.username);
        } else {
          setAdminName("Admin");
        }
        
        const h = resStats.data.hadirHariIni || 0;
        const th = resStats.data.tidakHadirHariIni || 0;

        setStats({
          totalAbsensi: resStats.data.totalKehadiran || (h + th),
          hadir: h,
          tidakHadir: th
        });
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        toast.error("Gagal sinkronisasi sesi aktif");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div key="dashboard" className="space-y-10 animate-in fade-in duration-500">
      
      {/* --- SECTION 1: WELCOME HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6">
        <div className="flex items-start gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain mt-1" />
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 leading-none italic uppercase tracking-tighter">
              Hi,  <span className="text-[#52426b]">{adminName || "Loading..."}!</span>
            </h2>
            <div className="mt-3 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic">Sesi Monitoring Aktif</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-10">
        {/* --- SECTION 2: 3 STATS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Peserta Sesi" 
            value={stats.totalAbsensi} 
            icon={ClipboardList} 
            iconBg="bg-[#3a2e4b]" 
            iconColor="text-white"
            desc="Mahasiswa dalam jadwal"
          />
          <StatCard 
            title="Sudah Absen" 
            value={stats.hadir} 
            icon={UserCheck} 
            iconBg="bg-emerald-50" 
            iconColor="text-emerald-600"
            desc="Hadir & Terlambat"
          />
          <StatCard 
            title="Belum Absen" 
            value={stats.tidakHadir} 
            icon={UserX} 
            iconBg="bg-rose-50" 
            iconColor="text-rose-600"
            desc="Tidak Hadir"
          />
        </div>

        {/* --- SECTION 3: TABEL RIWAYAT TERKINI --- */}
        <div className="bg-white rounded-2xl md:rounded-[3.5rem] shadow-sm border border-slate-200 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#52426b]" size={32} />
            </div>
          )}

          <div className="p-8 md:p-12 border-b border-slate-100 flex justify-between items-center bg-slate-50/10">
            <h4 className="text-xl font-black uppercase tracking-tight text-[#52426b]">Aktivitas Absensi Terkini</h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider">6 Data Terbaru</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-[#52426b] border-b border-slate-100">
                  <th className="py-5 px-10">Mahasiswa</th>
                  <th className="py-5 px-6">Waktu Presensi</th>
                  <th className="py-5 px-10 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.length > 0 ? (
                  recentAttendance.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-[#F8F4FF]/20 transition-colors">
                      <td className="py-6 px-10">
                        <p className="font-bold text-slate-800 text-[13px] uppercase">{item.nama}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">{item.npm} • {item.kelas}</p>
                      </td>
                      <td className="py-6 px-6 font-bold text-slate-600 text-xs">{item.tanggal} ({item.jam})</td>
                      <td className="py-6 px-10 text-right">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${
                          item.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          item.status === 'Terlambat' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-20 text-center text-slate-400 font-black text-xs uppercase italic tracking-widest">
                      Belum ada aktivitas absensi pada sesi ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-10 flex justify-center border-t border-slate-100 bg-slate-50">
            <Link 
              to="/admin/monitoring" 
              className="flex items-center gap-3 text-[#52426b] font-black uppercase text-[12px] tracking-[0.2em] hover:gap-5 transition-all duration-300 group"
            >
              Lihat Laporan Lengkap <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mengubah properti StatCard agar warna background kotak dan warna ikon bisa di-custom terpisah
const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, desc }) => (
  <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[3rem] shadow-sm border border-slate-200 flex flex-col justify-between group hover:-translate-y-2 transition-all duration-500">
    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] ${iconBg} ${iconColor} flex items-center justify-center border border-slate-100 group-hover:rotate-6 transition-transform`}>
      <Icon size={26} />
    </div>
    <div className="mt-6 md:mt-10">
      <p className="text-xs md:text-[14px] font-black text-[#52426b] uppercase tracking-[0.3em] mb-2">{title}</p>
      <h4 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter leading-none">{value}</h4>
      <p className="text-[11px] md:text-[12px] font-bold text-slate-400 uppercase mt-3 md:mt-4 opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
        {desc}
      </p>
    </div>
  </div>
);

export default DashboardHome;