import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { User, IdCard, School, BookOpen, Lock, ArrowRight, Loader2, CheckCircle2, ChevronLeft, RefreshCw, X, ShieldAlert } from "lucide-react";
import * as faceapi from "face-api.js";
import logoImage from '../components/logo.webp';
import toast, { Toaster } from 'react-hot-toast';

const RegisterFace = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalId = useRef(null);

  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [form, setForm] = useState({
    nama: "", npm: "", kelas: "", jurusan: "", fakultas: "", password: "", confirmPassword: "",
  });

  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  
  // --- STATE UNTUK MENAMPUNG URUTAN RANDOM ---
  const [activeChallenges, setActiveChallenges] = useState([]);

  // --- POOL GERAKAN ----
  const challengeLibrary = [
    { id: "smile", label: "Tersenyumlah 😊", check: (d) => d.expressions.happy > 0.75 },
    { id: "left", label: "Menoleh ke Kiri ⬅️", check: (d) => {
        const jaw = d.landmarks.getJawOutline();
        const nose = d.landmarks.getNose()[0];
        const faceWidth = jaw[16].x - jaw[0].x;
        const nosePos = (nose.x - jaw[0].x) / faceWidth;
        return nosePos > 0.62;
    }},
    { id: "right", label: "Menoleh ke Kanan ➡️", check: (d) => {
        const jaw = d.landmarks.getJawOutline();
        const nose = d.landmarks.getNose()[0];
        const faceWidth = jaw[16].x - jaw[0].x;
        const nosePos = (nose.x - jaw[0].x) / faceWidth;
        return nosePos < 0.38;
    }}
  ];

  const fakultasOptions = {
    "Teknologi Industri": ["Informatika", "Teknik Elektro", "Teknik Industri", "Teknik Mesin", "Agroteknologi"],
    "Ilmu Komputer & TI": ["Sistem Informasi", "Sistem Komputer"],
    "Ekonomi": ["Akuntansi", "Manajemen"],
    "Teknik Sipil & Perencanaan": ["Teknik Sipil", "Arsitektur", "Desain Interior"],
    "Psikologi": ["Psikologi"],
    "Ilmu Komunikasi": ["Ilmu Komunikasi"],
    "Sastra": ["Sastra Inggris"]
  };

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
    };
    loadModels();
    return () => stopStream();
  }, []);

  const stopStream = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (detectionIntervalId.current) clearInterval(detectionIntervalId.current);
  };

  const handleNextToLiveness = async () => {
    if (Object.values(form).some(val => val === "")) return toast.error("Semua data wajib diisi!");
    if (form.password !== form.confirmPassword) return toast.error("Password tidak cocok!");

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await axios.post("http://localhost:5000/api/mahasiswa/check-npm", { npm: form.npm });
      if (res.data.exists) {
        toast.error("NPM sudah terdaftar!");
        setLoading(false);
        return; 
      }
      setStep(2);
      setLoading(false);
      startLiveness();
    } catch (err) {
      toast.error("Gagal verifikasi NPM. Coba lagi.");
      setLoading(false);
    }
  };

  const startLiveness = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // --- LOGIKA RANDOM DISINI ---
      const shuffled = [...challengeLibrary].sort(() => Math.random() - 0.5);
      setActiveChallenges(shuffled);
      
      let currentStep = 0;
      setCurrentChallengeIdx(0);

      detectionIntervalId.current = setInterval(async () => {
        if (!videoRef.current) return;
        const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withFaceDescriptor();
        
        if (det) {
          const task = shuffled[currentStep]; // Gunakan urutan yang sudah di-shuffled
          setStatus(`${task.label}`);

          if (task.check(det)) {
            if (currentStep < shuffled.length - 1) {
              currentStep++;
              setCurrentChallengeIdx(currentStep);
            } else {
              clearInterval(detectionIntervalId.current);
              setStatus("⌛ Memvalidasi Biometrik...");
              checkFaceDuplicate(det.descriptor);
            }
          }
        } else { setStatus("🔍 Fokus ke kamera..."); }
      }, 600);
    } catch (err) { toast.error("Kamera error"); setStep(1); }
  };

  const checkFaceDuplicate = async (descriptor) => {
    try {
      const res = await axios.post("http://localhost:5000/api/mahasiswa/check-face", { 
        descriptor: Array.from(descriptor) 
      });

      if (res.data.exists) {
        stopStream();
        setStep(1);
        setErrorMessage(`Wajah sudah terdaftar dengan NPM: ${res.data.npm}`);
        toast.error("Wajah sudah terdaftar!");
      } else {
        const img = captureImg();
        setCapturedImage(img);
        setFaceDescriptor(Array.from(descriptor));
        stopStream();
        setStep(3);
      }
    } catch (err) {
      toast.error("Gagal validasi wajah.");
      setStep(1);
    }
  };

  const captureImg = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg");
  };

  const handleFinalRegister = async () => {
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/mahasiswa/register", {
        ...form, face_descriptor: faceDescriptor, faceImage: capturedImage
      });
      toast.success("Akun Berhasil Dibuat!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      toast.error("Gagal registrasi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-poppins">
      <div className="w-full max-w-6xl bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden flex flex-col md:flex-row border border-gray-100 min-h-[750px]">
        
        {/* KOLOM KIRI: LOGO */}
        <div className="md:w-1/2 bg-[#f2e6ff] p-12 flex items-center justify-center relative border-r border-gray-50">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100 rounded-full blur-[120px] opacity-40"></div>
          <img src={logoImage} alt="Logo" className="relative z-10 w-full max-w-[320px] drop-shadow-2xl" />
        </div>

        {/* KOLOM KANAN: FORM */}
        <div className="md:w-1/2 p-10 md:p-16 flex flex-col bg-[#52426b]">
          <div className="flex justify-center mb-16">
          <div className="flex bg-[#e4d6f3] p-1.5 rounded-full border border-gray-200 shadow-inner">
            {/* TOMBOL MASUK (INAKTIF) */}
            <Link
              to="/login"
              className="px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all text-[#52426b] hover:text-black flex items-center justify-center"
            >
              Masuk
            </Link>

            {/* TOMBOL DAFTAR (AKTIF) */}
            <button
              className="px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all bg-[#52426b] text-[#e4d6f3] shadow-xl flex items-center justify-center"
            >
              Daftar
            </button>
          </div>
        </div>

          <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
            
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right duration-500">
                <div className="mb-10 text-center">
                  <h2 className="text-4xl font-black text-[#e4d6f3] uppercase tracking-wide leading-none">Registrasi Akun</h2>
                  <p className="text-gray-300 text-sm font-bold capitalize tracking-widest mt-1">Validasi Data Mahasiswa</p>
                </div>

                {errorMessage && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-3">
                    <ShieldAlert className="text-red-500 shrink-0" size={18} />
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{errorMessage}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <InputItem icon={User} name="nama" placeholder="Nama Lengkap" onChange={(e) => setForm({...form, nama: e.target.value})} value={form.nama} />
                  <InputItem icon={IdCard} name="npm" placeholder="NPM" onChange={(e) => setForm({...form, npm: e.target.value})} value={form.npm} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputItem icon={School} name="kelas" placeholder="Kelas" onChange={(e) => setForm({...form, kelas: e.target.value})} value={form.kelas} />
                    <div className="relative">
                      <select name="fakultas" value={form.fakultas} onChange={(e) => setForm({...form, fakultas: e.target.value, jurusan: ""})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-4 text-sm font-bold focus:outline-none focus:border-black appearance-none">
                        <option value="">Fakultas</option>
                        {Object.keys(fakultasOptions).map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  {form.fakultas && (
                    <div className="relative animate-in slide-in-from-top duration-300">
                      <select name="jurusan" value={form.jurusan} onChange={(e) => setForm({...form, jurusan: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-black appearance-none">
                        <option value="">Pilih Jurusan</option>
                        {fakultasOptions[form.fakultas].map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                      <BookOpen className="absolute left-4 top-4 text-gray-400" size={18} />
                    </div>
                  )}

                  <InputItem icon={Lock} name="password" placeholder="Password" type="password" onChange={(e) => setForm({...form, password: e.target.value})} value={form.password} />
                  <InputItem icon={Lock} name="confirmPassword" placeholder="Konfirmasi" type="password" onChange={(e) => setForm({...form, confirmPassword: e.target.value})} value={form.confirmPassword} />
                  
                  <button onClick={handleNextToLiveness} disabled={loading} className="w-full bg-[#e4d6f7] text-[#52426b] font-bold py-5 rounded-3xl flex items-center justify-center gap-3 shadow-xl mt-4 uppercase text-[14px] tracking-widest">
                    {loading ? <Loader2 className="animate-spin" /> : <>Mulai Scan Wajah <ArrowRight size={18} /></>}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in zoom-in duration-500 text-center">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-[#e4d6f3] uppercase ">Scan Biometrik</h2>
                  <p className="text-gray-300 font-bold text-[12px] uppercase tracking-widest mt-2">{status}</p>
                </div>
                <div className="relative w-72 h-72 mx-auto mb-10">
                  <div className="absolute inset-0 rounded-full border-[10px] border-gray-100 shadow-inner"></div>
                  <div className="w-full h-full rounded-full overflow-hidden border-[10px] border-black shadow-2xl">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  </div>
                </div>
                {/* DOTS PROGRESS MENYESUAIKAN JUMLAH GERAKAN */}
                <div className="flex justify-center gap-3">
                  {activeChallenges.map((_, i) => <div key={i} className={`h-2 w-10 rounded-full transition-all duration-500 ${i <= currentChallengeIdx ? 'bg-[#e4d6f3]' : 'bg-gray-200'}`} />)}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom duration-500">
                <div className="mb-6 text-center md:text-left">
                  <h2 className="text-3xl font-black text-[#e4d6f3] uppercase italic leading-none">Review Data</h2>
                  <p className="text-green-400 font-bold mt-2 text-[10px] uppercase tracking-[0.2em]">Data & Wajah Terverifikasi</p>
                </div>
                
                <div className="bg-[#F8F4FF] rounded-3xl p-6 sm:p-8 mb-6 border border-purple-100/20 space-y-5 text-[#3a2e4b]">
                    <div className="border-b border-purple-100 pb-3">
                        <p className="text-[10px] font-black text-[#52426b] uppercase tracking-widest">Nama Lengkap</p>
                        <p className="font-black text-base uppercase leading-snug">{form.nama}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-purple-100 pb-3">
                      <div>
                        <p className="text-[10px] font-black text-[#52426b] uppercase tracking-widest">NPM</p>
                        <p className="font-bold text-sm">{form.npm}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#52426b] uppercase tracking-widest">Kelas</p>
                        <p className="font-bold text-sm">{form.kelas}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-[#52426b] uppercase tracking-widest">Fakultas</p>
                        <p className="font-bold text-xs uppercase leading-tight">{form.fakultas}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#52426b] uppercase tracking-widest">Jurusan / Program Studi</p>
                        <p className="font-bold text-xs uppercase leading-tight">{form.jurusan}</p>
                      </div>
                    </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setStep(1); setErrorMessage(""); }} 
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all active:scale-95 border border-red-100"
                  >
                    <RefreshCw size={14} /> Scan Ulang
                  </button>
                  
                  <button 
                    onClick={handleFinalRegister} 
                    disabled={loading} 
                    className="flex-[1.5] bg-[#52426b] hover:bg-[#3a2e4b] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <>Konfirmasi <CheckCircle2 size={14} /></>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

const InputItem = ({ icon: Icon, ...props }) => (
  <div className="relative group">
    <input {...props} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-black transition-all" />
    <Icon className="absolute left-4 top-4 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
  </div>
);

export default RegisterFace;