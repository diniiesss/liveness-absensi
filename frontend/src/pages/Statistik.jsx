import React, { useEffect, useState, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import axios from 'axios';
import { Calendar, BookOpen, ChevronDown,PieChart,CalendarDays } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import logoImage from "../components/logo.webp";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DAFTAR_MATKUL = [
  { kode: 'AK045201', nama: 'Algoritma dan Pengolahan Paralel' },
  { kode: 'AK045214', nama: 'Pemrograman Jaringan' },
  { kode: 'AK045232', nama: 'Sistem Multimedia' },
  { kode: 'AK045643', nama: 'Tugas Akhir/Skripsi' },
  { kode: 'IT045107', nama: 'Bahasa Inggris Bisnis 2' },
  { kode: 'PB045205', nama: 'Bahasa Mandarin' }
];

const Statistik = () => {
  // 1. Tambahkan is_active ke dalam state profile
  const [profile, setProfile] = useState({ nama: '', npm: '', is_active: true });

  const [isBulanOpen, setIsBulanOpen] = useState(false);
  const [isMatkulOpen, setIsMatkulOpen] = useState(false);
  const bulanRef = useRef(null);
  const matkulRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bulanRef.current && !bulanRef.current.contains(event.target)) {
        setIsBulanOpen(false);
      }
      if (matkulRef.current && !matkulRef.current.contains(event.target)) {
        setIsMatkulOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [filter, setFilter] = useState({ 
    bulan: new Date().getMonth() + 1, 
    kode_matkul: 'Semua' 
  });
  const [data, setData] = useState({ hadir: 0, terlambat: 0, alpa: 0, total: 0 });
  const [frekuensiHarian, setFrekuensiHarian] = useState([0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [daftarBulan, setDaftarBulan] = useState([]);

  const generateBulan = () => {
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const currentMonth = new Date().getMonth();
    const bulanTersedia = [];
    for (let i = 1; i <= currentMonth; i++) {
      bulanTersedia.push({ value: i + 1, label: `${namaBulan[i]} 2026` });
    }
    setDaftarBulan(bulanTersedia.reverse());
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('mahasiswa_token');
      const npm = localStorage.getItem('npm') || '';

      // Ambil Profil Dinamis (termasuk status is_active)
      const resProfile = await axios.get(`http://localhost:5000/api/mahasiswa/profil/${npm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. Simpan is_active ke state profile
      setProfile({ 
        nama: resProfile.data.nama, 
        npm: resProfile.data.npm,
        is_active: resProfile.data.is_active 
      });

      const resStats = await axios.get(`http://localhost:5000/api/mahasiswa/statistik-filtered/${npm}`, {
        params: { bulan: filter.bulan, kode_matkul: filter.kode_matkul },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resStats.data.success) {
        setData(resStats.data.stats);
        const dayMap = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5 };
        const newFreq = [0, 0, 0, 0, 0, 0];
        resStats.data.frekuensi.forEach(item => {
          if (dayMap[item.hari] !== undefined) {
            newFreq[dayMap[item.hari]] = parseInt(item.jumlah);
          }
        });
        setFrekuensiHarian(newFreq);
      }
    } catch (err) {
      toast.error("Gagal sinkronisasi data database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateBulan();
    fetchData();
  }, [filter]);

  const persentaseHadirMurni = data.total > 0 
    ? Math.round((data.hadir / data.total) * 100) 
    : 0;

  const doughnutData = {
    labels: ['Hadir', 'Terlambat', 'Alpa'],
    datasets: [{
      data: [data.hadir, data.terlambat, data.alpa],
      backgroundColor: ['#e6ffe6', '#ffffe6', '#F8DFDF'],
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    datasets: [{
      label: "Kehadiran",
      data: frekuensiHarian,
      backgroundColor: ["#E9D5FF",  "#D8B4FE",  "#C084FC", "#A855F7", "#9333EA",  "#7E22CE",],
      borderRadius: 14,
      borderSkipped: false,
      hoverBackgroundColor: ["#F3E8FF",  "#E9D5FF",  "#D8B4FE",  "#C084FC",  "#A855F7",  "#9333EA",],
    },],
};


  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen animate-in fade-in duration-700">
      <Toaster />
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 px-4">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain flex-shrink-0" />
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3a2e4b] tracking-wide uppercase leading-none">Statistik Kehadiran</h2>
            <p className="text-[#8B8396] text-xs font-bold mt-2 tracking-wide uppercase">
              {profile.nama || 'MEMUAT...'} — {profile.npm || ''}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Custom Dropdown Bulan */}
          <div className="relative w-full md:min-w-[240px]" ref={bulanRef}>
            <button 
              onClick={() => { setIsBulanOpen(!isBulanOpen); setIsMatkulOpen(false); }}
              className="w-full appearance-none bg-[#e4d6f7] border border-gray-200 pl-11 pr-10 py-3.5 rounded-2xl font-bold text-sm text-[#2B2238] flex items-center justify-between gap-2 shadow-sm hover:border-[#2B2238] transition-all"
            >
              <span>{daftarBulan.find(b => String(b.value) === String(filter.bulan))?.label || `Juli 2026`}</span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isBulanOpen ? 'rotate-180' : ''}`} />
            </button>
            <Calendar className="absolute left-4 top-3.5 text-[#2B2238]" size={18} />
            
            {isBulanOpen && (
              <div className="absolute top-full left-0 right-0 md:w-56 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                {daftarBulan.map((b) => (
                  <button 
                    key={b.value}
                    onClick={() => { setFilter({...filter, bulan: String(b.value)}); setIsBulanOpen(false); }}
                    className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-[#2B2238] uppercase tracking-wider transition-colors"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Dropdown Mata Kuliah */}
          <div className="relative w-full md:min-w-[240px]" ref={matkulRef}>
            <button 
              onClick={() => { setIsMatkulOpen(!isMatkulOpen); setIsBulanOpen(false); }}
              className="w-full appearance-none bg-[#e4d6f7] border border-gray-200 pl-11 pr-10 py-3.5 rounded-2xl font-bold text-sm text-[#2B2238] flex items-center justify-between gap-2 shadow-sm hover:border-[#2B2238] transition-all"
            >
              <span className="truncate flex-1 text-left">{filter.kode_matkul === 'Semua' ? 'Semua Mata Kuliah' : (DAFTAR_MATKUL.find(m => m.kode === filter.kode_matkul)?.nama || filter.kode_matkul)}</span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isMatkulOpen ? 'rotate-180' : ''}`} />
            </button>
            <BookOpen className="absolute left-4 top-3.5 text-[#2B2238]" size={18} />
            
            {isMatkulOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => { setFilter({...filter, kode_matkul: 'Semua'}); setIsMatkulOpen(false); }}
                  className="w-full text-left px-5 py-3.5 hover:bg-[#F8F4FF] text-xs font-bold text-[#2B2238] uppercase tracking-wider transition-colors"
                >
                  Semua Mata Kuliah
                </button>
                {DAFTAR_MATKUL.map((m) => (
                  <button 
                    key={m.kode}
                    onClick={() => { setFilter({...filter, kode_matkul: m.kode}); setIsMatkulOpen(false); }}
                    className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-[#2B2238] transition-colors whitespace-normal break-words leading-tight flex flex-col gap-0.5 border-t border-slate-50"
                  >
                    <span className="text-[9px] text-[#52426b]/60 uppercase tracking-widest">{m.kode}</span>
                    <span>{m.nama}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl md:rounded-[3.5rem] p-2 md:p-12 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          
          {/* CARD KIRI: PROPORSI */}
          <div className="bg-[#f2e6ff] rounded-3xl md:rounded-[3rem] p-5 md:p-10 flex flex-col items-center border border-gray-100">
            <div className="w-full mb-10 flex items-center gap-4">
            <div className="p-3 bg-[#52426b] text-[#f2e6ff] rounded-2xl shadow-sm border border-purple-50">
              <PieChart size={28} />
            </div>
            
            <div className="flex flex-col text-left">
              <h3 className="text-2xl font-black text-[#3a2e4b] tracking-tight uppercase">Proporsi Kehadiran</h3>
              <p className="text-gray-500 text-sm font-bold capitalize tracking-widest mt-1">Status Kehadiran Bulanan</p>
            </div>

          </div>

            <div className="relative w-64 h-64 mb-10">
              <Doughnut data={doughnutData} options={{ cutout: '80%', plugins: { legend: { display: false } } }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black tracking-tighter text-[#2B2238]">{persentaseHadirMurni}%</span>
                <span className="text-[#8B8396] text-[14px] font-bold uppercase tracking-[0.25em] mt-1">Hadir</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4">
               <StatCard label="Total Pertemuan" value={data.total} color="#e4d6f7" />
               <StatCard label="Hadir" value={data.hadir} color="#e6ffe6" />
               <StatCard label="Terlambat" value={data.terlambat} color="#ffffe6" />
               <StatCard label="Tidak Hadir" value={data.alpa} color="#F8DFDF" />
            </div>
          </div>

          {/* CARD KANAN: FREKUENSI & STATUS AKADEMIK */}
          <div className="bg-[#52426b] rounded-3xl md:rounded-[3rem] p-5 md:p-10 flex flex-col text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="p-3 bg-[#f2e6ff] text-[#52426b] rounded-2xl backdrop-blur-sm border border-white/20">
              <CalendarDays size={28} />
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-2xl font-black text-[#e4d6f3] tracking-tight uppercase">Frekuensi Kehadiran</h3>
              <p className="text-gray-300 text-sm font-bold capitalize tracking-widest mt-1">Akumulasi Hari Senin - Sabtu</p>
            </div>

          </div>
            <div className="flex-1 bg-white/5 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 mb-8 border border-white/10 min-h-[300px] flex items-end">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-700 font-black tracking-widest text-xs uppercase animate-pulse italic text-center">Menghubungkan Database...</div>
              ) : (
                <Bar data={barData} options={barOptions} />
              )}
            </div>

            {/* 3. UPDATE: ACADEMIC STATUS DARI DATABASE */}
            <div className="bg-[#e4d6f7] text-black p-7 rounded-[2rem] flex justify-between items-center shadow-lg transition-transform active:scale-95 cursor-default">
              <div>
                <p className="text-xl font-black text-[#8B8396] uppercase tracking-thigt mb-1 ">Academic Status</p>
                <div className="flex items-center gap-2">
                  {/* Titik indikator Aktif/Tidak */}
                  <span className={`w-2.5 h-2.5 rounded-full ${profile.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <p className="text-xl font-extrabold tracking-tight">
                    {profile.is_active ? 'Mahasiswa Aktif' : 'Mahasiswa Tidak Aktif'}
                  </p>
                </div>
              </div>
              <div className="h-14 w-14 bg-[#2B2238] rounded-full flex items-center justify-center border-[6px] border-gray-100 shadow-xl">
                <span className="text-[#eee6ff] font-black text-xl italic tracking-tighter">
                  {profile.nama ? profile.nama.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Helper components & options
const StatCard = ({ label, value, color }) => (
  <div
    className="
      p-5 rounded-3xl
      border border-white/40
      shadow-sm
      flex flex-col
      transition-all duration-300"
    style={{ backgroundColor: color }}>
    <span
      className="
        text-[14px]
        font-bold
        uppercase
        tracking-widest
        mb-1
        text-[#2B2238]">
      {label}
    </span>

    <span className="text-2xl font-bold text-[#2B2238]">
      {value}
    </span>
  </div>
);

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#D8CFE6" },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.05)" },
      ticks: { color: "#B8AFC7" },
    },
  },
};

export default Statistik;