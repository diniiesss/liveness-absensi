import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { MapPin, BookOpen, Clock, Calendar, ChevronDown, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logoImage from "../components/logo.webp";

const DAFTAR_MATKUL = [
  { kode: 'AK045201', nama: 'Algoritma dan Pengolahan Paralel' },
  { kode: 'AK045214', nama: 'Pemrograman Jaringan' },
  { kode: 'AK045232', nama: 'Sistem Multimedia' },
  { kode: 'IT045107', nama: 'Bahasa Inggris Bisnis 2' },
  { kode: 'PB045205', nama: 'Bahasa Mandarin' }
];

const Riwayat = () => {
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState({ nama: '', npm: '' });
  const [loading, setLoading] = useState(true);
  const [daftarBulan, setDaftarBulan] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    bulan: 'Semua', 
    kode_matkul: 'Semua' 
  });
  
  const token = localStorage.getItem('mahasiswa_token');
  const npmFromStorage = localStorage.getItem("npm");

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
      const resProfile = await axios.get(`http://localhost:5000/api/mahasiswa/profil/${npmFromStorage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile({ nama: resProfile.data.nama, npm: resProfile.data.npm });

      const resHistory = await axios.get(`http://localhost:5000/api/mahasiswa/riwayat/${npmFromStorage}`, {
        params: { bulan: filter.bulan, kode_matkul: filter.kode_matkul },
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(resHistory.data.riwayat || []);
      setCurrentPage(1);
    } catch (e) { 
      toast.error("Gagal sinkronisasi data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateBulan();
    if (npmFromStorage && token) fetchData();
  }, [filter]);

  const downloadExcel = () => {
    if (history.length === 0) return toast.error("Tidak ada data untuk diunduh");
    
    const dataToExport = history.map((item, index) => ({
      No: index + 1,
      Nama: profile.nama,
      NPM: profile.npm,
      Mata_Kuliah: item.nama_matkul || 'Umum',
      Waktu_Absen: dayjs(item.waktu_absen).format('DD MMMM YYYY, HH:mm'),
      Status: item.status,
      Lokasi: `${item.lokasi_lat}, ${item.lokasi_lng}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");
    XLSX.writeFile(workbook, `Riwayat_Absen_${profile.npm}.xlsx`);
    toast.success("Excel berhasil diunduh!");
  };

  const downloadPDF = () => {
    try {
      if (history.length === 0) return toast.error("Tidak ada data untuk diunduh");

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("LAPORAN RIWAYAT ABSENSI", 14, 22);
      doc.setFontSize(11);
      doc.text(`Nama : ${profile.nama}`, 14, 32);
      doc.text(`NPM  : ${profile.npm}`, 14, 38);
      doc.text(`Filter: Bulan ${filter.bulan} - ${filter.kode_matkul}`, 14, 44);

      const tableColumn = ["No", "Mata Kuliah", "Waktu", "Status"];
      const tableRows = history.map((item, index) => [
        index + 1,
        item.nama_matkul || 'Umum',
        dayjs(item.waktu_absen).format('DD/MM/YYYY, HH:mm'),
        item.status
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }
      });

      doc.save(`Riwayat_Absen_${profile.npm}.pdf`);
      toast.success("PDF berhasil diunduh!");
      
    } catch (error) {
      console.error("Gagal cetak PDF:", error);
      toast.error("Terjadi kesalahan teknis saat membuat PDF.");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen animate-in fade-in duration-700">
      
      {/* 1. HEADER (JUDUL & FILTER) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 px-4">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain flex-shrink-0" />
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3a2e4b] tracking-wide uppercase leading-none">Riwayat Kehadiran</h2>
            <p className="text-[#8B8396] text-xs font-bold mt-2 tracking-wide uppercase">
              {profile.nama || 'MEMUAT NAMA...'} — {profile.npm || '...'}
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
              <span>{filter.bulan === 'Semua' ? 'Semua Bulan' : (daftarBulan.find(b => String(b.value) === String(filter.bulan))?.label || filter.bulan)}</span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${isBulanOpen ? 'rotate-180' : ''}`} />
            </button>
            <Calendar className="absolute left-4 top-3.5 text-[#2B2238]" size={18} />
            
            {isBulanOpen && (
              <div className="absolute top-full left-0 right-0 md:w-56 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => { setFilter({...filter, bulan: 'Semua'}); setIsBulanOpen(false); }}
                  className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-[#2B2238] uppercase tracking-wider transition-colors"
                >
                  Semua Bulan
                </button>
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

      {/* 2. KOTAK PUTIH UTAMA */}
      <div className="bg-[#f2e6ff] rounded-3xl md:rounded-[3.5rem] p-4 md:p-8 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[75vh]">
        
        {/* Tampilan Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[#52426b] text-[14px] uppercase tracking-[0.1em] font-black">
                <th className="px-6 py-5 border-b-2 border-[#52426b]">
                  <div className="flex items-center gap-2 font-black text-[#52426b]">
                    <Calendar size={15} /> Waktu Absen
                  </div>
                </th>
                <th className="px-6 py-5 border-b-2 border-[#52426b]">
                  <div className="flex items-center gap-2 font-black text-[#52426b]">
                    <BookOpen size={15} /> Mata Kuliah
                  </div>
                </th>
                <th className="px-6 py-5 border-b-2 border-[#52426b]">
                  <div className="flex items-center gap-2 font-black text-[#52426b]">
                    <Clock size={15} /> Status
                  </div>
                </th>
                <th className="px-6 py-5 border-b-2 border-[#52426b]">
                  <div className="flex items-center gap-2 font-black text-[#52426b]">
                    <MapPin size={15} /> Lokasi
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-[#52426b]">
              {loading ? (
                <tr><td colSpan="4" className="text-center p-20 animate-pulse font-black text-[#F8F4FF] uppercase tracking-tight">Sinkronisasi Database...</td></tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((h, i) => (
                  <tr key={i} className="bg-[#F8F4FF] hover:bg-[#F8F4FF] transition-all duration-300 rounded-2xl group">
                    <td className="px-6 py-6 first:rounded-l-2xl">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#52426b] text-[14px] tracking-tight">{dayjs(h.waktu_absen).locale('id').format('DD MMM YYYY')}</span>
                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">{dayjs(h.waktu_absen).format('HH:mm')} WIB</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#52426b] text-[14px] tracking-tight">{h.nama_matkul || 'Umum'}</span>
                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">{h.kode_matkul || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`px-5 py-2 rounded-full font-bold text-[#2B2238] text-sm tracking-tight shadow-sm ${
                        h.status === 'Hadir' ? 'bg-[#e6ffe6] text-green-700' : 
                        h.status === 'Terlambat' ? 'bg-[#ffffe6] text-yellow-700' : 'bg-[#F8DFDF] text-red-700'
                      }`}>{h.status}</span>
                    </td>
                    <td className="px-6 py-6 last:rounded-r-2xl">
                      <span className="font-bold text-[#52426b] text-[14px] tracking-tight">
                        {h.lokasi_lat ? `${h.lokasi_lat.toFixed(4)}, ${h.lokasi_lng.toFixed(4)}` : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="text-center p-20 italic font-black text-gray-400 uppercase tracking-widest">Data Tidak Ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tampilan Mobile Card List (Tanpa Perlu Scroll Samping) */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            <div className="text-center p-12 animate-pulse font-black text-slate-400 uppercase tracking-tight">Sinkronisasi Database...</div>
          ) : currentItems.length > 0 ? (
            currentItems.map((h, i) => (
              <div key={i} className="bg-[#F8F4FF] rounded-2xl p-5 border border-purple-100/50 shadow-sm space-y-4">
                {/* Header Card: Matakuliah & Status */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#52426b] text-[15px] leading-tight">{h.nama_matkul || 'Umum'}</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{h.kode_matkul || 'N/A'}</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full font-bold text-[12px] tracking-wide shadow-sm flex-shrink-0 ${
                    h.status === 'Hadir' ? 'bg-[#e6ffe6] text-green-700' : 
                    h.status === 'Terlambat' ? 'bg-[#ffffe6] text-yellow-700' : 'bg-[#F8DFDF] text-red-700'
                  }`}>{h.status}</span>
                </div>

                <div className="border-t border-purple-200/20"></div>

                {/* Footer Card: Waktu & Lokasi */}
                <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#52426b]" />
                    <span>{dayjs(h.waktu_absen).locale('id').format('DD MMM YYYY')} ({dayjs(h.waktu_absen).format('HH:mm')})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <MapPin size={14} className="text-[#52426b]" />
                    <span className="font-mono">{h.lokasi_lat ? `${h.lokasi_lat.toFixed(4)}, ${h.lokasi_lng.toFixed(4)}` : "-"}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-12 italic font-black text-slate-400 uppercase tracking-widest">Data Tidak Ditemukan</div>
          )}
        </div>

        {/* 3. FOOTER TABEL: PAGINATION & DOWNLOAD BUTTONS */}
        <div className="mt-12">
          
          {/* Row Pagination & Info Data */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
            {/* Info Jumlah Data (Pojok Kiri Bawah) */}
            <div className="text-[11px] font-black text-[#52426b] bg-[#e4d6f7]/50 px-4 py-2.5 rounded-full uppercase tracking-widest shadow-sm">
              Menampilkan {history.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, history.length)} dari {history.length} data
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="flex justify-center items-center gap-3">
                <button 
                  onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                  disabled={currentPage === 1}
                  className={`p-3 rounded-2xl transition-all ${currentPage === 1 ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-[#F8F4FF] text-black shadow-sm'}`}
                >
                  <ChevronLeft size={22} />
                </button>

                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`w-12 h-12 rounded-2xl font-black text-sm transition-all shadow-sm ${
                        currentPage === index + 1 ? 'bg-[#52426b] text-[#F8F4FF] scale-110 shadow-lg' : 'bg-[#F8F4FF] text-gray-400 hover:bg-gray-50 border border-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => currentPage < totalPages && setCurrentPage(prev => prev + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-3 rounded-2xl transition-all ${currentPage === totalPages ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-black shadow-sm'}`}
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            ) : <div />}
          </div>

          {/* Download Buttons Section */}
          <div className="flex justify-end items-center gap-3 pt-8 border-t border-[#3a2e4b]">
            <p className="text-[12px] font-black text-[#3a2e4b] uppercase tracking-widest mr-2">Unduh Laporan:</p>
            <button 
              onClick={downloadExcel} 
              className="bg-[#F8F4FF] text-[#3a2e4b] px-6 py-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#3a2e4b] hover:text-[#F8F4FF] transition-all shadow-sm active:scale-95"
            >
              <Download size={16} /> Excel
            </button>
            <button 
              onClick={downloadPDF} 
              className="bg-[#3a2e4b] text-[#F8F4FF] px-8 py-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#F8F4FF] hover:text-[#3a2e4b] transition-all shadow-lg active:scale-95"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Riwayat;