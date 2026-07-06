import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  User, Mail, ShieldCheck, KeyRound, 
  Pencil, LogOut, Loader2, RotateCcw,
  School, Trash2, Image as ImageIcon, AlertCircle
} from "lucide-react";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import logoImage from "../../components/logo.webp";

const AdminProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    role: "Super Administrator",
    photo: null 
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPhotoMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await axios.get("http://localhost:5000/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data) {
          setAdminData({
            username: res.data.username || "ADMIN",
            email: res.data.email || "admin@gunadarma.ac.id",
            role: "Super Administrator",
            photo: res.data.photo || null
          });
        }
      } catch (err) {
        toast.error("Gagal sinkronisasi dengan Database");
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdminData({ ...adminData, photo: reader.result });
        toast.success(`Foto profil diperbarui!`);
      };
      reader.readAsDataURL(file);
    }
    setShowPhotoMenu(false);
  };

  const confirmDeletePhoto = () => {
    setAdminData({ ...adminData, photo: null });
    toast.success("Foto profil berhasil dihapus");
    setIsDeleteModalOpen(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return toast.error("Password tidak boleh kosong!");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("Konfirmasi password tidak cocok!");
    }
    
    const loadToast = toast.loading("Updating security...");
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put("http://localhost:5000/api/admin/update-password", { 
        newPassword: passwordForm.newPassword 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kredensial diperbarui!", { id: loadToast });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error("Gagal ganti password", { id: loadToast });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-3">
      <Loader2 className="animate-spin text-[#52426b]" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Connecting...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      
      {/* MODAL DELETE */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl"><AlertCircle size={32} /></div>
              <div className="space-y-1">
                <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">Hapus Foto?</h4>
                <p className="text-[13px] font-bold text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
              <div className="flex gap-3 w-full pt-4">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
                <button onClick={confirmDeletePhoto} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md">Ya, Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6">
        <div className="flex items-center gap-4">
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-800 leading-none">
            Admin <br /> <span className="text-[#52426b]">Profile</span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* KIRI: AVATAR */}
        <div className="lg:col-span-4 flex flex-col items-center text-center space-y-6">
          <div className="relative" ref={menuRef}>
            <div className="w-60 h-60 bg-slate-100 rounded-full flex items-center justify-center text-[#52426b] text-6xl font-black italic uppercase overflow-hidden shadow-inner border-4 border-white">
              {adminData.photo ? (
                <img src={adminData.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                adminData.username ? adminData.username.charAt(0) : "A"
              )}
            </div>
            
            <button 
              onClick={() => setShowPhotoMenu(!showPhotoMenu)} 
              className="absolute bottom-0 right-2 p-3 bg-[#3a2e4b] text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-white"
            >
              <Pencil size={20} />
            </button>

            {showPhotoMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50">
                <button onClick={() => { fileInputRef.current.click(); setShowPhotoMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <ImageIcon size={16} /> Ambil dari Galeri
                </button>
                <button onClick={() => { setIsDeleteModalOpen(true); setShowPhotoMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                  <Trash2 size={16} /> Hapus Foto
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="space-y-1">
            <h3 className="text-3xl font-black text-[#52426b] leading-[0.9] uppercase tracking-tighter max-w-md">
              {adminData.username}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[12px] font-black text-emerald-700 uppercase tracking-[0.15em]">Online Now</p>
            </div>
          </div>
        </div>

        {/* KANAN: DATA & PASSWORD */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-slate-200">
            <div className="flex flex-col gap-4">
              <IdentityItem label="Email Dosen" value={adminData.email} icon={Mail} />
              <IdentityItem label="Institusi" value="Universitas Gunadarma" icon={School} />
              <IdentityItem label="Akses Sistem" value="Verified Control" icon={ShieldCheck} />
              
              <div className="mt-4 p-6 bg-[#3a2e4b] rounded-[2rem] text-white shadow-md relative overflow-hidden flex items-center gap-4">
                <ShieldCheck size={50} className="opacity-20 shrink-0" />
                <div>
                  <p className="text-[13px] font-black uppercase tracking-widest opacity-70 italic">Database Integrity</p>
                  <p className="text-[14px] font-bold leading-tight">Data personal admin dikunci dan disinkronkan langsung dengan database pusat.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><KeyRound size={18} /></div>
              <h3 className="text-[16px] font-black uppercase tracking-wide text-[#52426b]">Ubah Password</h3>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputPassword label="Password Baru" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} icon={KeyRound} />
                <div className="flex flex-col">
                    <InputPassword 
                        label="Verifikasi Password" 
                        value={passwordForm.confirmPassword} 
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                        icon={ShieldCheck} 
                        isError={passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword}
                    />
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-2 ml-1 italic animate-in slide-in-from-top-1">
                            *Password tidak sama
                        </p>
                    )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={loading || (passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword)} className="w-full md:w-auto bg-[#3a2e4b] text-white px-10 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#52426b] transition-all active:scale-95 shadow-md disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <><RotateCcw size={18} /> Perbarui Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const IdentityItem = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-slate-200 hover:bg-white transition-all group">
    <div className="p-3.5 bg-white text-[#52426b] rounded-xl shadow-sm border border-slate-100 group-hover:bg-[#f2e6ff] transition-colors">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-[13px] font-black text-slate-800 tracking-tight">{value || "Loading..."}</p>
    </div>
  </div>
);

const InputPassword = ({ label, value, onChange, icon: Icon, isError }) => (
  <div className="flex flex-col gap-2 group">
    <label className={`text-[12px] font-black uppercase tracking-[0.15em] ml-1 ${isError ? 'text-rose-600' : 'text-[#52426b]'}`}>{label}</label>
    <div className="relative">
      <input 
        type="password"
        placeholder="••••••••"
        value={value} 
        onChange={onChange}
        className={`w-full bg-slate-50 border rounded-xl py-4 pl-12 pr-4 text-m font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all ${isError ? 'border-rose-300' : 'border-slate-200'}`} 
      />
      <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isError ? 'text-rose-400' : 'text-slate-300 group-focus-within:text-[#52426b]'}`} size={18} />
    </div>
  </div>
);

export default AdminProfile;