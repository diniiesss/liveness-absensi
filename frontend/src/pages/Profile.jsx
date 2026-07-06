import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { 
  Pencil, ShieldCheck, School, GraduationCap, 
  RotateCcw, Image as ImageIcon, X, KeyRound, Trash2, AlertCircle, Loader2 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import logoImage from "../components/logo.webp";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  // Data identitas mahasiswa Semester 8 Universitas Gunadarma
  const npm = localStorage.getItem("npm") || ""; 
  const token = localStorage.getItem("mahasiswa_token");

  // Menutup dropdown jika klik di luar area menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowEditMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/mahasiswa/profil/${npm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (err) {
      toast.error("Gagal sinkronisasi dengan database pusat");
    }
  };

  useEffect(() => {
    if (npm && token) fetchProfile();
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImage(base64Image);
      try {
        await axios.put(`http://localhost:5000/api/mahasiswa/update-photo`, 
          { faceImage: base64Image }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Foto profil berhasil diperbarui!");
        setShowEditMenu(false);
      } catch (err) {
        toast.error("Gagal mengunggah foto");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async () => {
    try {
      await axios.put(`http://localhost:5000/api/mahasiswa/update-photo`, 
        { faceImage: null }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedImage(null);
      setUser({ ...user, foto_profil: null });
      toast.success("Foto profil telah dihapus");
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error("Gagal menghapus foto");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault(); 
    const { newPassword, confirmPassword } = passwordForm;

    if (!newPassword || !confirmPassword) {
      return toast.error("Password tidak boleh kosong!");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Verifikasi password tidak cocok!");
    }

    try {
      await axios.put(`http://localhost:5000/api/mahasiswa/update-password`, 
        { newPassword }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Password berhasil diperbarui!");
      setPasswordForm({ newPassword: '', confirmPassword: '' }); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui password");
    }
  };

  if (!user) return (
    <div className="p-10 text-center font-black animate-pulse uppercase tracking-widest text-gray-300 italic">
      Connecting to Gunadarma Database...
    </div>
  );

  const initial = user.nama ? user.nama.charAt(0).toUpperCase() : "A";

  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen">
      <Toaster />
      
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle size={48} strokeWidth={2.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-black">Hapus Foto?</h3>
                <p className="text-xs text-gray-400 font-bold tracking-tight px-6 text-balance">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-200 transition-all">Batal</button>
                <button onClick={handleDeletePhoto} className="flex-1 py-4 rounded-2xl bg-[#0D0D0D] text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 px-4 flex items-center gap-4">
        {/* Logo Kampus untuk Mobile */}
        <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain flex-shrink-0" />
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3a2e4b] tracking-wide uppercase leading-none">Profil Mahasiswa</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 px-2 md:px-6">
        
        {/* --- KOLOM KIRI: FOTO & NAMA LENGKAP --- */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-center space-y-12">
          <div className="relative mt-10" ref={menuRef}>
            <div className="w-60 h-60 bg-[#f2e6ff] rounded-full flex items-center justify-center text-[#52426b] text-8xl font-black italic uppercase overflow-hidden shadow-sm border border-purple-100">
              {selectedImage || user.foto_profil ? (
                <img src={selectedImage || user.foto_profil} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button onClick={() => setShowEditMenu(!showEditMenu)} className="absolute bottom-6 right-2 p-4 bg-[#52426b] text-[#f2e6ff] rounded-2xl shadow-xl hover:scale-110 transition-all z-20">
              <Pencil size={20} />
            </button>

            {showEditMenu && (
              <div className="absolute top-full left-0 mt-4 w-64 bg-[#f2e6ff] rounded-[2rem] shadow-2xl py-3 z-50 animate-in zoom-in-95 duration-200">
                <button onClick={() => { fileInputRef.current.click(); setShowEditMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors">
                  <ImageIcon size={20} className="text-gray-600" />
                  <span className="font-bold text-m text-[#2D3748]">Ambil dari Galeri</span>
                </button>
                <button onClick={() => { setIsDeleteModalOpen(true); setShowEditMenu(false); }} className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-red-50 transition-colors">
                  <Trash2 size={20} className="text-red-500" />
                  <span className="font-bold text-m text-red-500">Hapus Foto</span>
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleUpload(e.target.files[0])} />
          </div>

          <div className="space-y-4 text-center lg:text-center">
            <h2 className="text-3xl font-black text-black leading-[0.9] uppercase tracking-wide max-w-md">
              {user.nama}
            </h2>
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border shadow-sm ${
              user.is_active ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${user.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <p className="text-[13px] font-bold uppercase tracking-[0.15em]">
                {user.is_active ? 'Mahasiswa Aktif' : 'Mahasiswa Tidak Aktif'}
              </p>
            </div>
          </div>
        </div>

        {/* --- KOLOM KANAN: IDENTITAS & KEAMANAN --- */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-[#f2e6ff] rounded-3xl md:rounded-[3.5rem] p-5 md:p-10 shadow-xl">
            <div className="flex items-center gap-3 mb-8 border-b border-[#3a2e4b] pb-6">
              <div className="p-3 bg-[#52426b] text-[#f2e6ff] rounded-2xl"><GraduationCap size={24} /></div>
              <h3 className="text-2xl font-black text-[#3a2e4b] tracking-tight uppercase">Detail Akademik</h3>
            </div>
            <div className="grid grid-cols-1 gap-y-6">
              <AcademicRow label="NPM" value={user.npm || ""} />
              <AcademicRow label="Semester" value="Semester 8" />
              <AcademicRow label="Kelas" value={user.kelas} />
              <AcademicRow label="Jurusan - Fakultas" value={`${user.jurusan} - ${user.fakultas || ''}`} />
              <AcademicRow label="Institusi" value="Universitas Gunadarma" last />
            </div>
          </div>

          <div className="bg-[#52426b] rounded-3xl md:rounded-[3.5rem] p-5 md:p-10 shadow-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6 relative z-10">
              <div className="p-3 bg-[#f2e6ff] text-[#52426b] rounded-2xl"><KeyRound size={24} /></div>
              <h3 className="text-2xl font-black text-[#e4d6f3] tracking-tight uppercase">Keamanan Akun</h3>
            </div>
            <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-black text-[#f2e6ff] capitalize tracking-[0.15em] ml-1">Password Baru</label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="bg-[#f2e6ff] text-[#52426b] border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-white/30 transition-all placeholder:text-black" 
                />
              </div>

              <div className="flex flex-col gap-2 relative">
                <label className="text-[13px] font-black text-[#f2e6ff] capitalize tracking-[0.15em] ml-1">Verifikasi Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className={`bg-[#f2e6ff] text-[#52426b] border rounded-2xl p-5 text-sm focus:outline-none transition-all placeholder:text-black ${
                    passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword 
                      ? 'border-red-400 focus:border-red-500' 
                      : 'border-white/10 focus:border-white/30'
                  }`} 
                />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-red-300 text-xs font-bold tracking-wider italic mt-1 ml-1 absolute -bottom-5">
                    *Password tidak sama
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end pt-4 mt-2">
                <button 
                  type="submit" 
                  className="bg-[#f2e6ff] text-[#52426b] px-12 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:bg-gray-200 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  disabled={!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                >
                  <RotateCcw size={16} className="inline mr-2" /> Update Password
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const AcademicRow = ({ label, value, last }) => (
  <div className={`flex justify-between items-center ${!last ? 'border-b border-gray-300 pb-4' : 'pb-1'}`}>
    <span className="text-[14px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <p className="font-bold text-[14px] text-[#3a2e4b] uppercase tracking-tight text-right">{value}</p>
  </div>
);

export default Profile;