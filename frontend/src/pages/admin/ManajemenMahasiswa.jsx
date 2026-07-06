import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { 
  Search, RotateCcw, Edit3, Trash2, X, FileText,
  ShieldCheck, Loader2, AlertTriangle, RefreshCw, Save, AlertCircle, ChevronDown
} from "lucide-react";
import toast from 'react-hot-toast';
import logoImage from "../../components/logo.webp";

// --- DATA PILIHAN OPSI FAKULTAS & JURUSAN SINKRON DENGAN REGISTERFACE.JSX ---
const FAKULTAS_OPTIONS = {
  "Teknologi Industri": ["Informatika", "Teknik Elektro", "Teknik Industri", "Teknik Mesin", "Agroteknologi"],
  "Ilmu Komputer & TI": ["Sistem Informasi", "Sistem Komputer"],
  "Ekonomi": ["Akuntansi", "Manajemen"],
  "Teknik Sipil & Perencanaan": ["Teknik Sipil", "Arsitektur", "Desain Interior"],
  "Psikologi": ["Psikologi"],
  "Ilmu Komunikasi": ["Ilmu Komunikasi"],
  "Sastra": ["Sastra Inggris"]
};

// --- KONSTANTA UNTUK JUMLAH DATA PER HALAMAN ---
const ITEMS_PER_PAGE = 25;

const ManajemenMahasiswa = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- STATE FILTER ---
  const [filterKelas, setFilterKelas] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusRef = useRef(null);

  // States & Refs for Edit Modal Custom Dropdowns
  const [isEditFakultasOpen, setIsEditFakultasOpen] = useState(false);
  const [isEditJurusanOpen, setIsEditJurusanOpen] = useState(false);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const editFakultasRef = useRef(null);
  const editJurusanRef = useRef(null);
  const editStatusRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setIsStatusOpen(false);
      }
      if (editFakultasRef.current && !editFakultasRef.current.contains(event.target)) {
        setIsEditFakultasOpen(false);
      }
      if (editJurusanRef.current && !editJurusanRef.current.contains(event.target)) {
        setIsEditJurusanOpen(false);
      }
      if (editStatusRef.current && !editStatusRef.current.contains(event.target)) {
        setIsEditStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 🔥 STATE BARU: PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  
  // --- STATE MODAL EDIT ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    nama: "", npm: "", kelas: "", fakultas: "", jurusan: "", is_active: true
  });

  // --- STATE MODAL KONFIRMASI (PENGGANTI WINDOW.CONFIRM) ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: "", message: "", onConfirm: null });

  useEffect(() => { fetchStudents(); }, []);

  // --- RESET KE HALAMAN 1 JIKA FILTER/SEARCH BERUBAH ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKelas, filterStatus]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get("http://localhost:5000/api/admin/mahasiswa", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error("Gagal sinkronisasi database!");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA MODAL EDIT ---
  const openEditModal = (student) => {
    setSelectedStudent(student);
    
    let initialFakultas = "";
    for (const [fak, jurList] of Object.entries(FAKULTAS_OPTIONS)) {
      if (jurList.includes(student.jurusan)) {
        initialFakultas = fak;
        break;
      }
    }

    setFormData({
      nama: student.nama,
      npm: student.npm,
      kelas: student.kelas,
      fakultas: initialFakultas,
      jurusan: student.jurusan,
      is_active: student.is_active
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const loadToast = toast.loading(`Menyimpan data ${formData.nama}...`);
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put(`http://localhost:5000/api/admin/mahasiswa/${selectedStudent.npm}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Berhasil diperbarui!", { id: loadToast });
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      toast.error("Gagal menyimpan perubahan", { id: loadToast });
    }
  };

  // --- FUNGSI TRIGGER KONFIRMASI ---
  const triggerConfirm = (title, message, action) => {
    setConfirmData({ title, message, onConfirm: action });
    setIsConfirmOpen(true);
  };


  const processDelete = async (npm, nama) => {
    const loadToast = toast.loading("Menghapus akun...");
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`http://localhost:5000/api/admin/mahasiswa/${npm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${nama} berhasil dihapus`, { id: loadToast });
      setIsConfirmOpen(false);
      fetchStudents();
    } catch (err) { 
      toast.error("Gagal menghapus data", { id: loadToast }); 
    }
  };

  // --- LOGIKA FILTER DATA ---
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || s.npm?.includes(searchTerm);
      const matchesKelas = s.kelas?.toLowerCase().includes(filterKelas.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === "Aktif") matchesStatus = s.is_active === true;
      if (filterStatus === "Nonaktif") matchesStatus = s.is_active === false;

      return matchesSearch && matchesKelas && matchesStatus;
    });
  }, [students, searchTerm, filterKelas, filterStatus]);

  // --- 🔥 LOGIKA BARU: MEMOTONG DATA SESUAI HALAMAN (PAGINATION) ---
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  // --- FUNGSI HIGHLIGHT TEXT (STABILO KUNING) ---
  const highlightText = (text, search) => {
    if (!search || !text) return text;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-900 rounded-sm px-0.5 font-bold animate-in fade-in duration-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-800 leading-none">
            Manajemen  <br /> <span className="text-[#52426b]">Mahasiswa</span>
          </h2>
        </div>
      </div>

      {/* --- BOX CONTAINER UTAMA (SEARCH, FILTER & TABEL) --- */}
      <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden mx-2 relative min-h-[60vh] flex flex-col">
        
        {/* --- FILTER & SEARCH BAR --- */}
        <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            <div className="relative group md:col-span-6">
              <input 
                type="text" 
                placeholder="Cari Nama atau NPM..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all"
              />
              <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#52426b] transition-colors" size={18} />
            </div>

            <div className="relative group md:col-span-3">
              <input 
                type="text" 
                placeholder="Cari Kelas..." 
                value={filterKelas} 
                onChange={(e) => setFilterKelas(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all"
              />
            </div>

            <div className="relative md:col-span-3" ref={statusRef}>
              <button 
                type="button"
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-xs font-bold text-slate-700 flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left"
              >
                <span>{filterStatus === "Semua" ? "Semua Status" : filterStatus}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                  {["Semua", "Aktif", "Nonaktif"].map((st) => (
                    <button 
                      key={st}
                      type="button"
                      onClick={() => { setFilterStatus(st); setIsStatusOpen(false); }}
                      className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors border-b border-slate-50 last:border-b-0"
                    >
                      {st === "Semua" ? "Semua Status" : st}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* --- TABEL SECTION --- */}
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center"><Loader2 className="animate-spin text-[#52426b]" size={40} /></div>}
        {/* Tampilan Desktop Table */}
        <div className="hidden md:block overflow-x-auto px-4 md:px-8 py-4 md:py-6 flex-1">
          <table className="w-full">
            <thead>
              <tr className="text-center text-[14px] tracking-widest text-[#52426b] uppercase border-b-2 border-slate-100">
                <th className="pb-5 px-5 font-black">Profil</th>
                <th className="pb-5 px-5 font-black">Akademik</th>
                <th className="pb-5 px-5 font-black">Biometrik</th>
                <th className="pb-5 px-5 font-black">Status</th>
                <th className="pb-5 px-5 font-black">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedStudents.map((s, i) => (
                <tr key={i} className="group hover:bg-slate-50/80 transition-all">
                  <td className="py-7 px-4">
                      <div>
                        <p className={`text-[13px] text-center font-bold text-slate-800 uppercase tracking-tight ${!s.is_active && 'line-through text-slate-400'}`}>
                          {highlightText(s.nama, searchTerm)}
                        </p>
                        <p className="text-[12px] text-slate-500 text-center font-bold uppercase">
                          {highlightText(s.npm, searchTerm)}
                        </p>
                    </div>
                  </td>
                  <td className="py-7 px-4">
                    <p className="text-[13px] font-bold text-slate-800 text-center uppercase tracking-tighter">
                      {highlightText(s.kelas, filterKelas)}
                    </p>
                    <p className="text-[12px] text-slate-500 text-center font-bold uppercase">{s.jurusan}</p>
                  </td>
                  <td className="py-7 px-4 text-center">
                    {s.face_descriptor ? 
                      <span className="text-[13px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-widest">Terdaftar</span> : 
                      <span className="text-[13px] font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 uppercase tracking-widest">Kosong</span>
                    }
                  </td>
                  <td className="py-7 px-4 text-center">
                    <span className={`text-[13px] font-bold uppercase px-4 py-1.5 rounded-xl border tracking-widest ${s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {s.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-7 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(s)} className="p-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl hover:bg-[#52426b] hover:border-[#52426b] hover:text-white transition-all shadow-sm"><Edit3 size={16}/></button>
                      <button onClick={() => triggerConfirm("Hapus Mahasiswa", `Hapus permanen akun ${s.nama}?`, () => processDelete(s.npm, s.nama))} className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tampilan Mobile Card List (Tanpa Perlu Scroll Samping) */}
        <div className="block md:hidden space-y-4 px-4 py-4 flex-1">
          {paginatedStudents.map((s, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50 shadow-sm space-y-4">
              {/* Header Card: Nama/NPM & Status */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className={`font-bold text-slate-800 text-[15px] uppercase leading-tight ${!s.is_active && 'line-through text-slate-400'}`}>
                    {highlightText(s.nama, searchTerm)}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    {highlightText(s.npm, searchTerm)}
                  </span>
                </div>
                <span className={`px-4 py-1.5 rounded-full font-black text-[11px] tracking-wide uppercase shadow-sm flex-shrink-0 border ${
                  s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>{s.is_active ? 'Aktif' : 'Nonaktif'}</span>
              </div>

              <div className="border-t border-slate-200/50"></div>

              {/* Body Card Details */}
              <div className="grid grid-cols-2 gap-4 text-[12px] font-bold text-slate-600">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Kelas & Jurusan</span>
                  <span className="text-slate-800 uppercase">
                    {highlightText(s.kelas, filterKelas)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">{s.jurusan}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Status Wajah</span>
                  <div>
                    {s.face_descriptor ? 
                      <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest mt-1">Terdaftar</span> : 
                      <span className="inline-block text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 uppercase tracking-widest mt-1">Kosong</span>
                    }
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/50"></div>

              {/* Footer Card: Aksi */}
              <div className="flex justify-end items-center gap-2">
                <button onClick={() => openEditModal(s)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl hover:bg-[#52426b] hover:border-[#52426b] hover:text-white transition-all text-xs font-bold uppercase shadow-sm"><Edit3 size={14}/> Edit</button>
                <button onClick={() => triggerConfirm("Hapus Mahasiswa", `Hapus permanen akun ${s.nama}?`, () => processDelete(s.npm, s.nama))} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-all text-xs font-bold uppercase shadow-sm"><Trash2 size={14}/> Hapus</button>
              </div>
            </div>
          ))}
        </div>

        {/* --- TOMBOL PREV & NEXT CONTROLS --- */}
        <div className="flex flex-col md:flex-row justify-between items-center px-8 py-6 bg-slate-50/50 border-t border-slate-100 gap-4 mt-auto">
          {/* Info Jumlah Data (Pojok Kiri Bawah) */}
          <div className="text-[11px] font-black text-[#52426b] bg-[#e4d6f7]/50 px-4 py-2.5 rounded-full uppercase tracking-widest shadow-sm">
            Menampilkan {filteredStudents.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} dari {filteredStudents.length} Mahasiswa
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95"
              >
                Prev
              </button>
              <span className="text-xs font-black uppercase tracking-tight text-slate-800">
                Halaman {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-5 py-3 rounded-xl bg-[#3a2e4b] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#52426b] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95"
              >
                Next
              </button>
            </div>
          ) : <div />}
        </div>
      </div>

      {/* --- MODAL EDIT IDENTITAS MAHASISWA --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl md:max-w-3xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#3a2e4b] p-6 md:p-8 text-white flex justify-between items-center">
              <div><h3 className="text-xl md:text-2xl font-black uppercase tracking-wide leading-none">Edit Identitas</h3><p className="text-[10px] md:text-[12px] uppercase font-bold tracking-widest mt-2 text-slate-300">Sync Data Ke Database</p></div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors border border-white/20"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 md:p-10 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="space-y-1.5">
                <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">Nama Lengkap</label>
                <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all duration-200" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">NPM</label>
                  <input type="text" value={formData.npm} onChange={(e) => setFormData({...formData, npm: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all duration-200" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">Kelas</label>
                  <input type="text" value={formData.kelas} onChange={(e) => setFormData({...formData, kelas: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all duration-200" required />
                </div>
              </div>

              {/* Custom Dropdown Fakultas */}
              <div className="space-y-1.5" ref={editFakultasRef}>
                <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">Fakultas</label>
                <div className="relative w-full">
                  <button 
                    type="button"
                    onClick={() => { setIsEditFakultasOpen(!isEditFakultasOpen); setIsEditJurusanOpen(false); setIsEditStatusOpen(false); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left"
                  >
                    <span>{formData.fakultas || "Pilih Fakultas"}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isEditFakultasOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isEditFakultasOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[80] max-h-48 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                      {Object.keys(FAKULTAS_OPTIONS).map(f => (
                        <button 
                          key={f}
                          type="button"
                          onClick={() => { setFormData({...formData, fakultas: f, jurusan: ""}); setIsEditFakultasOpen(false); }}
                          className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors border-b border-slate-50 last:border-b-0"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Dropdown Jurusan */}
              <div className="space-y-1.5" ref={editJurusanRef}>
                <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">Jurusan / Program Studi</label>
                <div className="relative w-full">
                  <button 
                    type="button"
                    disabled={!formData.fakultas}
                    onClick={() => { setIsEditJurusanOpen(!isEditJurusanOpen); setIsEditFakultasOpen(false); setIsEditStatusOpen(false); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <span>{formData.jurusan || (formData.fakultas ? "Pilih Jurusan" : "Pilih Fakultas Dahulu")}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isEditJurusanOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isEditJurusanOpen && formData.fakultas && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[80] max-h-48 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                      {FAKULTAS_OPTIONS[formData.fakultas]?.map(j => (
                        <button 
                          key={j}
                          type="button"
                          onClick={() => { setFormData({...formData, jurusan: j}); setIsEditJurusanOpen(false); }}
                          className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors border-b border-slate-50 last:border-b-0 whitespace-normal break-words leading-snug"
                        >
                          {j}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Dropdown Status */}
              <div className="space-y-1.5" ref={editStatusRef}>
                <label className="text-[14px] font-black uppercase text-[#52426b] tracking-wider ml-2">Status Mahasiswa</label>
                <div className="relative w-full">
                  <button 
                    type="button"
                    onClick={() => { setIsEditStatusOpen(!isEditStatusOpen); setIsEditFakultasOpen(false); setIsEditJurusanOpen(false); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold text-slate-800 flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left"
                  >
                    <span>{formData.is_active ? 'AKTIF' : 'NONAKTIF'}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isEditStatusOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isEditStatusOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[80] py-2 animate-in zoom-in-95 duration-200">
                      <button 
                        type="button"
                        onClick={() => { setFormData({...formData, is_active: true}); setIsEditStatusOpen(false); }}
                        className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors border-b border-slate-50"
                      >
                        AKTIF
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setFormData({...formData, is_active: false}); setIsEditStatusOpen(false); }}
                        className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors"
                      >
                        NONAKTIF
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-5 rounded-2xl bg-slate-100 border border-slate-200 text-[14px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-[#52426b] text-white py-5 rounded-2xl font-black uppercase text-[14px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#3a2e4b] transition-all shadow-md active:scale-[0.98]"
                >
                  <Save size={18}/> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KONFIRMASI (POP-UP ESTETIK) --- */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800">{confirmData.title}</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">{confirmData.message}</p>
              
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
                <button onClick={confirmData.onConfirm} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-rose-200 hover:bg-rose-700 transition-all">Ya, Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManajemenMahasiswa;