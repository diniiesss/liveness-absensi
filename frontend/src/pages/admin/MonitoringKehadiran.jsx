import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Search, MapPin, Download, Filter, Clock, BookOpen, Loader2, FileText, Calendar, RefreshCcw, FileSpreadsheet, Hash, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import logoImage from "../../components/logo.webp";

// Fungsi bantuan untuk memberi efek stabilo pada teks yang dicari
const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim() || !text) return <>{text}</>;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded-sm">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const MATKUL_OPTIONS = [
  "Algoritma dan Pengolahan Paralel",
  "Pemrograman Jaringan",
  "Sistem Multimedia",
  "Tugas Akhir/Skripsi/Studi Komprehensif",
  "Bahasa Inggris Bisnis 2",
  "Bahasa Mandarin"
];

const MonitoringKehadiran = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState(""); 
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterMatkul, setFilterMatkul] = useState("");

  const [isMatkulOpen, setIsMatkulOpen] = useState(false);
  const matkulRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (matkulRef.current && !matkulRef.current.contains(event.target)) {
        setIsMatkulOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { fetchData(); }, []);

  // Kembalikan ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterKelas, filterTanggal, filterMatkul]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get("http://localhost:5000/api/admin/kehadiran", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendance(res.data);
    } catch (err) {
      toast.error("Gagal memuat data riwayat");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return attendance.filter(a => {
      const matchSearch = (
        (a.nama?.toLowerCase().includes(search.toLowerCase())) || 
        (a.npm?.includes(search))
      );
      
      const matchKelas = filterKelas === "" || 
                         a.kelas?.toLowerCase().includes(filterKelas.toLowerCase());
                         
      const matchTanggal = filterTanggal === "" || a.tanggal === filterTanggal;
      
      const matchMatkul = filterMatkul === "" || a.mata_kuliah === filterMatkul;
      
      return matchSearch && matchKelas && matchTanggal && matchMatkul;
    });
  }, [attendance, search, filterKelas, filterTanggal, filterMatkul]);

  // Kalkulasi data untuk Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const exportExcel = () => {
    if (filteredData.length === 0) return toast.error("Tidak ada data untuk diekspor");
    const excelData = filteredData.map(a => ({
      'Tanggal': a.tanggal,
      'Waktu': a.jam,
      'Nama Mahasiswa': a.nama,
      'NPM': a.npm,
      'Kelas': a.kelas,
      'Mata Kuliah': a.mata_kuliah || "-",
      'Status': a.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kehadiran");
    XLSX.writeFile(workbook, `Laporan_Absensi_${filterKelas || 'Semua_Kelas'}.xlsx`);
    toast.success("Excel Berhasil Diunduh");
  };

  const exportPDF = () => {
    if (filteredData.length === 0) return toast.error("Tidak ada data untuk diekspor");
    const doc = new jsPDF('l', 'mm', 'a4');
    autoTable(doc, {
      head: [['Tanggal', 'Waktu', 'Mahasiswa', 'NPM', 'Kelas', 'Matkul', 'Status']],
      body: filteredData.map(a => [a.tanggal, a.jam, a.nama, a.npm, a.kelas, a.mata_kuliah || "-", a.status]),
      theme: 'grid',
      headStyles: { fillColor: [82, 66, 107] } 
    });
    doc.save(`Laporan_Absensi_${filterKelas || 'Semua_Kelas'}.pdf`);
    toast.success("PDF Berhasil Diunduh");
  };

  return (
    <div className="space-y-10">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-800 leading-none">
            Monitoring <br /> <span className="text-[#52426b]">Kehadiran</span>
          </h2>
        </div>
        
        <div className="flex gap-3 flex-wrap mt-6 md:mt-0">
          <button onClick={exportExcel} className="hidden md:flex bg-[#f2e6ff] border border-purple-100 text-[#52426b] px-5 md:px-6 py-3 md:py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] items-center gap-3 shadow-md hover:bg-[#52426b] hover:text-white transition-all active:scale-95 group">
            <FileSpreadsheet size={18} className="group-hover:translate-y-1 transition-transform" /> Excel
          </button>
          <button onClick={exportPDF} className="hidden md:flex bg-[#3a2e4b] text-white px-5 md:px-6 py-3 md:py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] items-center gap-3 shadow-md hover:bg-[#52426b] transition-all active:scale-95 group">
            <Download size={18} className="group-hover:translate-y-1 transition-transform" /> PDF
          </button>
        </div>
      </div>

      {/* --- BOX CONTAINER UTAMA (SEARCH, FILTER & TABEL) --- */}
      <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden mx-2 relative flex flex-col min-h-[60vh]">
        
        {/* --- FILTER & SEARCH BAR --- */}
        <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/10 flex flex-col md:flex-row gap-4">
          {/* Search Nama/NPM */}
          <div className="relative flex-[2] group">
            <input 
              type="text" 
              placeholder="Cari Nama atau NPM..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-[12px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all" 
            />
            <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#52426b] transition-colors" size={18} />
          </div>

          {/* Input Kelas Manual */}
          <div className="relative flex-1 group">
            <input 
              type="text"
              placeholder="Cari Kelas (Contoh: 4IA01)..."
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-[12px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all"
            />
            <Hash className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#52426b] transition-colors" size={18} />
          </div>

          {/* Filter Mata Kuliah */}
          <div className="relative flex-1" ref={matkulRef}>
            <button 
              type="button"
              onClick={() => setIsMatkulOpen(!isMatkulOpen)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-[12px] font-bold text-slate-700 flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left"
            >
              <span className="truncate max-w-[150px]">{filterMatkul || "Semua Mata Kuliah"}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isMatkulOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMatkulOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                <button 
                  type="button"
                  onClick={() => { setFilterMatkul(""); setIsMatkulOpen(false); }}
                  className="w-full text-left px-5 py-3.5 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 uppercase tracking-wider transition-colors"
                >
                  Semua Mata Kuliah
                </button>
                {MATKUL_OPTIONS.map((m, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => { setFilterMatkul(m); setIsMatkulOpen(false); }}
                    className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors whitespace-normal break-words leading-tight flex flex-col gap-0.5 border-t border-slate-50"
                  >
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Tanggal */}
          <div className="relative flex-1">
            <input 
              type="date" 
              value={filterTanggal} 
              onChange={(e) => setFilterTanggal(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] cursor-pointer transition-all" 
            />
          </div>
        </div>

        {/* --- TABEL SECTION --- */}
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center"><Loader2 className="animate-spin text-[#52426b]" size={32} /></div>}
        
        {/* Tampilan Desktop Table */}
        <div className="hidden md:block overflow-x-auto px-4 md:px-8 py-4 md:py-6 flex-1">
          <table className="w-full">
            <thead>
              <tr className="uppercase text-[14px] tracking-widest text-[#52426b] border-b-2 border-slate-100">
                <th className="pb-5 px-5 text-center font-black">Tanggal & Waktu</th>
                <th className="pb-5 px-5 text-center font-black">Identitas Mahasiswa</th>
                <th className="pb-5 px-5 text-center font-black">Mata Kuliah</th>
                <th className="pb-5 px-5 text-center font-black">Kelas</th>
                <th className="pb-5 px-5 text-center font-black">Lokasi</th>
                <th className="pb-5 px-5 text-center font-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentItems.length > 0 ? (
                currentItems.map((a, i) => (
                  <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="py-7 px-6 text-center font-bold text-[13px] text-slate-800 uppercase">
                        {a.tanggal} <br/> <span className="text-[12px] text-slate-600 font-bold">{a.jam}</span>
                    </td>
                    <td className="py-7 px-6 text-center">
                        <div>
                          <p className="text-[13px] text-center font-bold text-slate-800 uppercase tracking-tight">
                            <HighlightText text={a.nama} highlight={search} />
                          </p>
                          <p className="text-[12px] text-slate-500 text-center font-bold uppercase">
                            <HighlightText text={a.npm} highlight={search} />
                          </p>
                        </div>
                    </td>
                    <td className="py-7 px-6 text-[13px] font-bold text-slate-800 text-center uppercase"> {a.mata_kuliah || "Umum"}</td>
                    <td className="py-7 px-6 text-center text-[13px] text-slate-800 font-bold uppercase tracking-tighter">
                      <HighlightText text={a.kelas} highlight={filterKelas} />
                    </td>
                    <td className="py-7 px-6 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[13px] font-bold uppercase">
                        <MapPin size={12} /> {a.lokasi_lat?.toFixed(2)}, {a.lokasi_lng?.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-7 px-6 text-center">
                      <span className={`px-5 py-2 rounded-full text-[13px] font-black uppercase tracking-widest border shadow-sm ${
                        a.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        a.status === 'Terlambat' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center">
                    <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest">Data tidak ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tampilan Mobile Card List (Tanpa Perlu Scroll Samping) */}
        <div className="block md:hidden space-y-4 px-4 py-4 flex-1">
          {currentItems.length > 0 ? (
            currentItems.map((a, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50 shadow-sm space-y-4">
                {/* Header Card: Nama/NPM & Status */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-[15px] uppercase leading-tight">
                      <HighlightText text={a.nama} highlight={search} />
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      <HighlightText text={a.npm} highlight={search} />
                    </span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full font-black text-[11px] tracking-wide uppercase shadow-sm flex-shrink-0 ${
                    a.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                    a.status === 'Terlambat' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>{a.status}</span>
                </div>

                <div className="border-t border-slate-200/50"></div>

                {/* Body Card Details */}
                <div className="grid grid-cols-2 gap-4 text-[12px] font-bold text-slate-600">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Mata Kuliah</span>
                    <span className="text-slate-800 uppercase">{a.mata_kuliah || "Umum"}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Kelas</span>
                    <span className="text-slate-800 uppercase">
                      <HighlightText text={a.kelas} highlight={filterKelas} />
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/50"></div>

                {/* Footer Card: Waktu & Lokasi */}
                <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#52426b]" />
                    <span>{a.tanggal} ({a.jam})</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <MapPin size={14} className="text-[#52426b]" />
                    <span>{a.lokasi_lat?.toFixed(4)}, {a.lokasi_lng?.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase italic tracking-widest">Data tidak ditemukan</p>
            </div>
          )}
        </div>

        {/* --- PAGINATION FOOTER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-6 border-t border-slate-100 bg-slate-50/50 mt-auto gap-4">
          {/* Info Jumlah Data (Pojok Kiri Bawah) */}
          <div className="text-[11px] font-black text-[#52426b] bg-[#e4d6f7]/50 px-4 py-2.5 rounded-full uppercase tracking-widest shadow-sm">
            Menampilkan {filteredData.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} data
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => currentPage > 1 && setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
                className={`p-2.5 rounded-xl transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white text-slate-700 shadow-sm border border-slate-200'}`}
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex gap-1.5">
                {[...Array(totalPages)].map((_, index) => {
                  if (totalPages > 5 && index !== 0 && index !== totalPages - 1 && Math.abs(currentPage - 1 - index) > 1) {
                    if (Math.abs(currentPage - 1 - index) === 2) return <span key={index} className="px-1 text-slate-300 flex items-end pb-2">...</span>;
                    return null;
                  }
                  
                  return (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`w-9 h-9 rounded-xl font-black text-[11px] transition-all shadow-sm ${
                        currentPage === index + 1 ? 'bg-[#52426b] text-white scale-110 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => currentPage < totalPages && setCurrentPage(prev => prev + 1)}
                disabled={currentPage === totalPages}
                className={`p-2.5 rounded-xl transition-all ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white text-slate-700 shadow-sm border border-slate-200'}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : <div />}
        </div>

        <div className="flex md:hidden justify-center items-center gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-1">Unduh:</span>
          <button onClick={exportExcel} className="bg-[#f2e6ff] border border-purple-100 text-[#52426b] px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={exportPDF} className="bg-[#3a2e4b] text-white px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringKehadiran;