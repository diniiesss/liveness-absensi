import React, { useState } from "react";
import axios from "axios";
import { User, Lock, KeyRound, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const ForgotPasswordModal = ({ onClose }) => {
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!resetIdentifier || !newPassword) {
      toast.error("NPM/Email dan Password Baru tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      const isResetAdmin = resetIdentifier.includes("@");
      let apiUrl = "";
      let payload = {};

      if (isResetAdmin) {
        apiUrl = "http://localhost:5000/api/admin/reset-password";
        payload = { email: resetIdentifier.trim(), newPassword };
      } else {
        apiUrl = "http://localhost:5000/api/mahasiswa/reset-password";
        payload = { npm: resetIdentifier.trim(), newPassword };
      }

      // Interceptor global akan otomatis mengubah localhost ke Vercel URL
      const res = await axios.post(apiUrl, payload);

      if (res.data.success) {
        toast.success("Password berhasil direset!");
        setTimeout(() => onClose(), 1500); 
      } else {
        toast.error(res.data.message || "Gagal mereset password.");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      toast.error(
        err.response?.data?.message ||
          "Gagal mereset password. Pastikan NPM/Email benar."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* CARD MODAL */}
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-purple-100 relative">
        
        {/* Tombol Close Pojok Kanan Atas */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10 flex flex-col items-center">
          {/* ICON HEADER */}
          <div className="w-16 h-16 bg-[#e4d6f7] text-[#52426b] rounded-full flex items-center justify-center mb-6 shadow-inner">
            <KeyRound size={28} />
          </div>

          {/* JUDUL */}
          <h3 className="text-2xl font-black text-[#3a2e4b] tracking-tight uppercase mb-2">Reset Password</h3>
          <p className="text-gray-400 text-xs font-bold text-center tracking-wide uppercase max-w-[280px] mb-8 leading-relaxed">
            Masukkan NPM atau Email Anda serta kata sandi baru untuk mengatur ulang.
          </p>

          {/* FORM INPUTS */}
          <div className="w-full space-y-4">
            
            {/* Input Identifier */}
            <div className="relative">
              <input
                type="text"
                placeholder="NPM ATAU EMAIL"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
                className="w-full bg-[#F8F4FF] border-2 border-transparent focus:border-[#52426b] pl-12 pr-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-[#3a2e4b] placeholder-slate-400 focus:outline-none transition-all"
                disabled={loading}
              />
              <User className="absolute left-4 top-4 text-slate-400" size={18} />
            </div>

            {/* Input Password Baru */}
            <div className="relative">
              <input
                type="password"
                placeholder="PASSWORD BARU"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#F8F4FF] border-2 border-transparent focus:border-[#52426b] pl-12 pr-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-[#3a2e4b] placeholder-slate-400 focus:outline-none transition-all"
                disabled={loading}
              />
              <Lock className="absolute left-4 top-4 text-slate-400" size={18} />
            </div>

          </div>

          {/* TOMBOL AKSI */}
          <div className="w-full flex flex-col gap-3 mt-8">
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full bg-[#52426b] hover:bg-[#3a2e4b] text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Memproses...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full text-[#52426b] hover:bg-[#F8F4FF] py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Batal
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
