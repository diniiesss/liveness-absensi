import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { User, Lock, ArrowRight, Loader2 } from "lucide-react";
import ForgotPasswordModal from "../pages/ForgotPasswordModal";
import logoImage from '../components/logo.webp';

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setStatus("");
    try {
      const isAdmin = identifier.includes("@");
      const endpoint = isAdmin ? "admin/login" : "mahasiswa/login";
      const payload = isAdmin ? { email: identifier.trim(), password } : { npm: identifier.trim(), password };

      const res = await axios.post(`http://localhost:5000/api/${endpoint}`, payload);

      if (res.data.success) {
        const role = isAdmin ? "admin" : "mahasiswa";
        localStorage.setItem(`${role}_token`, res.data.token);
        localStorage.setItem("role", role);
        if (!isAdmin) localStorage.setItem("npm", res.data.mahasiswa.npm);
        localStorage.setItem(role, JSON.stringify(isAdmin ? res.data.admin : res.data.mahasiswa));
        navigate(isAdmin ? "/admin/dashboard" : "/dashboard");
      } else {
        setStatus(res.data.message || "Login gagal.");
      }
    } catch (err) {
      setStatus(err.response?.data?.message || "Login gagal. Cek kembali akun Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-poppins">
      <div className="w-full max-w-6xl bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden flex flex-col md:flex-row border border-gray-100 min-h-[750px]">
        
        {/* --- KOLOM KIRI: FULL LOGO --- */}
        <div className="md:w-1/2 bg-[#f2e6ff] p-12 flex items-center justify-center relative overflow-hidden border-r border-gray-50">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100 rounded-full blur-[120px] opacity-50"></div>
          
          <div className="relative z-10 w-full max-w-[320px] group transition-transform duration-700 hover:scale-105">
            <img src={logoImage} alt="Logo Universitas" className="w-full h-auto drop-shadow-2xl" />
          </div>
        </div>

        {/* --- KOLOM KANAN: FORM LOGIN --- */}
        <div className="md:w-1/2 p-10 md:p-16 flex flex-col bg-[#52426b]">
          
          <div className="flex justify-center mb-16">
            <div className="flex bg-[#e4d6f3] p-1.5 rounded-full border border-gray-200 shadow-inner">
              <Link
                to="/login"
                className="w-[140px] h-11 rounded-full text-xs font-black uppercase tracking-widest transition-all bg-[#52426b] text-[#e4d6f3] shadow-xl flex items-center justify-center"
              >
                Masuk
              </Link>
              <Link
                to="/register-wajah"
                className="w-[140px] h-11 rounded-full text-xs font-black uppercase tracking-widest transition-all text-[#52426b] hover:text-black flex items-center justify-center"
              >
                Daftar
              </Link>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
            <div className="mb-12 text-center"> 
              <h2 className="text-4xl font-black text-[#e4d6f3] uppercase tracking-tighter leading-none">Welcome Back!</h2>
              <p className="text-gray-300 text-sm font-bold capitalize tracking-widest mt-1">Silakan masuk ke akun Anda</p>
            </div>

            <div className="space-y-5">
              {/* Input Identifier */}
              <div className="group">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="NPM atau Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all font-bold"
                  />
                  <User className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black" size={18} />
                </div>
              </div>

              {/* Input Password */}
              <div className="group">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all font-bold"
                  />
                  <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black" size={18} />
                </div>
              </div>

              {/* Button Masuk */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-[#e4d6f7] text-[#52426b] font-bold py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-200 mt-4 uppercase text-[14px] tracking-widest"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>Masuk Sekarang <ArrowRight size={18} /></>
                )}
              </button>

              {/* LUPA PASSWORD DI BAWAH BUTTON */}
              <div className="text-center pt-2">
                <button 
                  onClick={() => setShowForgotPasswordModal(true)} 
                  className="text-[12px] font-bold text-[#e4d6f7] uppercase tracking-widest hover:text-[#f2e6ff] transition-colors"
                >
                  Lupa Password?
                </button>
              </div>

              {status && (
                <div className="bg-red-50 border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl text-center animate-in fade-in mt-4">
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {showForgotPasswordModal && (
        <ForgotPasswordModal onClose={() => setShowForgotPasswordModal(false)} />
      )}
    </div>
  );
};

export default Login;