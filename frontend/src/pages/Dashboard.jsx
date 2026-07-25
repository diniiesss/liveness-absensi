import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";
import { Camera, RefreshCw, CheckCircle, BookOpen, Clock, MapPin, ShieldCheck, ScanFace, AlertTriangle } from "lucide-react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast, { Toaster } from 'react-hot-toast';
import logoImage from "../components/logo.webp";

// Fix Marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapController = ({ userPos, campusConfig }) => {
  const map = useMap();
  useEffect(() => { 
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    if (userPos && campusConfig && campusConfig.latitude !== 0 && campusConfig.longitude !== 0) {
      try {
        const bounds = L.latLngBounds([
          [userPos.lat, userPos.lng],
          [campusConfig.latitude, campusConfig.longitude]
        ]);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17, animate: true });
      } catch (e) {}
    } else if (userPos && !isNaN(userPos.lat) && !isNaN(userPos.lng)) {
      map.setView([userPos.lat, userPos.lng], 16);
    } else if (campusConfig && campusConfig.latitude !== 0 && campusConfig.longitude !== 0) {
      map.setView([campusConfig.latitude, campusConfig.longitude], 16);
    }

    return () => clearTimeout(timer);
  }, [userPos?.lat, userPos?.lng, campusConfig?.latitude, campusConfig?.longitude, map]);

  return null;
};

const Dashboard = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalId = useRef(null);

  const [mahasiswaData, setMahasiswaData] = useState({ nama: "MEMUAT...", kelas: "..." });
  const [campusConfig, setCampusConfig] = useState({ 
    latitude: 0, longitude: 0, radius: 0, 
    nama_matkul: "", kode_matkul: "", isLoaded: false 
  });
  const [userPos, setUserPos] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [status, setStatus] = useState("Siap melakukan absensi");
  const [warningNotice, setWarningNotice] = useState("");
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [isTimeValid, setIsTimeValid] = useState(false);
  const [isAlreadyAttended, setIsAlreadyAttended] = useState(false);
  const [isScanning, setIsScanning] = useState(false); 
  const [scanFailed, setScanFailed] = useState(false);

  const token = localStorage.getItem('mahasiswa_token');
  const npm = localStorage.getItem("npm");

  const challengeLibrary = [
    { id: 'smile', label: "Silakan TERSENYUM 😊", check: (d) => d.expressions.happy > 0.75 },
    { 
      id: 'left', 
      label: "Menolehlah ke KIRI ⬅️", 
      check: (d) => {
        const jaw = d.landmarks.getJawOutline();
        const nose = d.landmarks.getNose()[0];
        const faceWidth = jaw[16].x - jaw[0].x;
        const nosePos = (nose.x - jaw[0].x) / faceWidth;
        return nosePos > 0.62; 
      } 
    },
    { 
      id: 'right', 
      label: "Menolehlah ke KANAN ➡️", 
      check: (d) => {
        const jaw = d.landmarks.getJawOutline();
        const nose = d.landmarks.getNose()[0];
        const faceWidth = jaw[16].x - jaw[0].x;
        const nosePos = (nose.x - jaw[0].x) / faceWidth;
        return nosePos < 0.38; 
      } 
    }
  ];

  const fetchData = useCallback(async () => {
    try {
      const header = { headers: { Authorization: `Bearer ${token}` } };
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      ]);
      const profRes = await axios.get(`http://localhost:5000/api/mahasiswa/profil/${npm}`, header);
      setMahasiswaData(profRes.data);
    } catch (e) { console.error("Gagal load profil."); }
  }, [npm, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const syncSesiDanWaktu = async () => {
      try {
        if (!token) throw new Error("Token tidak ditemukan. Cek pengaturan privasi browser.");
        const header = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Eksekusi paralel 3 request sekaligus (3x lebih cepat!)
        const [configRes, timeRes, statusRes] = await Promise.all([
          axios.get('http://localhost:5000/api/mahasiswa/admin/pengaturan-kampus', header),
          axios.get('http://localhost:5000/api/mahasiswa/absensi/validasi-waktu', header),
          axios.get(`http://localhost:5000/api/mahasiswa/absensi/status-hari-ini/${npm}`, header)
        ]);

        const settings = configRes.data;

        // 2. SAFETY CHECK: Jika Admin belum buka sesi
        if (!settings || Object.keys(settings).length === 0 || !settings.lokasi) {
          setCampusConfig(prev => ({ 
            ...prev, 
            isLoaded: true,
            nama_matkul: "Belum ada sesi aktif" 
          }));
          setStatus("❌ Belum ada sesi presensi dari Admin");
          setIsTimeValid(false);
          return;
        }

        const loc = typeof settings.lokasi === 'string' ? JSON.parse(settings.lokasi) : settings.lokasi;

        setCampusConfig({ 
          latitude: parseFloat(loc.lat), 
          longitude: parseFloat(loc.lng), 
          radius: settings.radius, 
          nama_matkul: settings.nama_matkul,
          kode_matkul: settings.kode_matkul,
          isLoaded: true 
        });

        setIsTimeValid(timeRes.data.valid);
        setIsAlreadyAttended(statusRes.data.alreadyAttended);

        if (statusRes.data.alreadyAttended) {
          setStatus(`✅ Sudah absen ${settings.nama_matkul}`);
        } else if (!timeRes.data.valid) {
          setStatus("❌ Sesi absensi ditutup");
        } else {
          setStatus("Siap melakukan absensi");
        }

      } catch (err) { 
        console.error("❌ Gagal sinkronisasi sesi. Detail:", err.response?.data || err.message); 
      }
    };

    syncSesiDanWaktu();
    const interval = setInterval(syncSesiDanWaktu, 5000); 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSesiDanWaktu();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [npm, token]);

  useEffect(() => {
    let watchId;
    const handleSuccess = (pos) => {
      const uLat = pos.coords.latitude;
      const uLng = pos.coords.longitude;
      setUserPos({ lat: uLat, lng: uLng });
      
      if (campusConfig.isLoaded && campusConfig.latitude !== 0) {
        const R = 6371000; 
        const dLat = (uLat - campusConfig.latitude) * Math.PI / 180;
        const dLon = (uLng - campusConfig.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(campusConfig.latitude * Math.PI / 180) * Math.cos(uLat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
        setLocationAllowed(dist <= campusConfig.radius);
      } else {
        setLocationAllowed(false);
      }
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, (err) => {
        console.error("HighAccuracy GPS error, trying fallback:", err);
        navigator.geolocation.getCurrentPosition(handleSuccess, (err2) => {
          console.error("Gagal fallback GPS:", err2);
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 });
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [campusConfig]);

  useEffect(() => {
    if (isCameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOn]);

  const handleFinalSubmit = async (descriptor) => {
    const loadingToast = toast.loading("Verifikasi Identitas...");
    try {
      const res = await axios.post("http://localhost:5000/api/mahasiswa/absensi/mulai", {
        faceDescriptor: Array.from(descriptor),
        lokasi_lat: userPos.lat,
        lokasi_lng: userPos.lng,
        livenessPassed: true 
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message, { id: loadingToast });
      setStatus("✅ Berhasil");
      setWarningNotice("");
      setIsAlreadyAttended(true);
      setTimeout(() => stopCamera(), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal Absen";
      toast.error(msg, { id: loadingToast });
      setScanFailed(true);
      setIsScanning(false);
      setStatus(`❌ ${msg}`);
      if (msg.includes("Wajah tidak cocok")) {
        setWarningNotice("❌ Wajah tidak cocok dengan data biometrik pemilik akun ini! Mohon gunakan akun Anda sendiri.");
      } else {
        setWarningNotice(`❌ ${msg}`);
      }
      if (detectionIntervalId.current) clearInterval(detectionIntervalId.current);
    }
  };

  const checkBrightness = (videoEl) => {
    try {
      if (!videoEl || videoEl.videoWidth === 0) return 100;
      const canvas = document.createElement("canvas");
      canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoEl, 0, 0, 64, 48);
      const imgData = ctx.getImageData(0, 0, 64, 48);
      let totalLuminance = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        totalLuminance += 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
      }
      return totalLuminance / (imgData.data.length / 4);
    } catch (e) { return 100; }
  };

  const runLivenessLoop = (challenges, initialDescriptor) => {
    let currentStep = 0;
    let loopCount = 0;
    let landmarkHistory = [];
    let descriptorRef = initialDescriptor;
    const maxDurationLoops = 60; // Max 15 detik batas percobaan liveness

    setStatus(challenges[currentStep].label);
    
    detectionIntervalId.current = setInterval(async () => {
      if (!videoRef.current) return;
      loopCount++;

      const brightness = checkBrightness(videoRef.current);
      if (brightness < 55) {
        setWarningNotice("💡 Cahaya terlalu redup! Mohon berpindah ke ruangan yang lebih terang.");
      } else {
        setWarningNotice("");
      }

      const det = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceExpressions().withFaceDescriptor();

      if (!det) {
        // PERINGATAN HANYA DI KOTAK BAWAH FRAME (KAMERA TETAP BUKA, TANPA TOAST POPUP)
        setWarningNotice("⚠️ Wajah tidak terdeteksi jelas! Posisikan wajah di depan kamera & lepas masker/kacamata hitam.");
        return;
      }

      if (!descriptorRef && det.descriptor) {
        descriptorRef = det.descriptor;
      }

      // Cek variansi gerakan untuk mendeteksi foto statis / gambar layar HP
      const jaw = det.landmarks.getJawOutline();
      const nose = det.landmarks.getNose()[0];
      const faceW = jaw[16].x - jaw[0].x;
      const normNoseX = (nose.x - jaw[0].x) / (faceW || 1);
      const normNoseY = (nose.y - jaw[0].y) / (faceW || 1);

      landmarkHistory.push({ x: normNoseX, y: normNoseY });
      if (landmarkHistory.length > 15) landmarkHistory.shift();

      if (landmarkHistory.length >= 12 && loopCount > 15) {
        const rangeX = Math.max(...landmarkHistory.map(p => p.x)) - Math.min(...landmarkHistory.map(p => p.x));
        const rangeY = Math.max(...landmarkHistory.map(p => p.y)) - Math.min(...landmarkHistory.map(p => p.y));
        if (rangeX < 0.001 && rangeY < 0.001) {
          setStatus("🚫 TERDETEKSI FOTO STATIS / MEDIA!");
          setWarningNotice("🚫 Terdeteksi Foto Statis / Gambar HP! Mohon gunakan wajah asli Anda secara langsung.");
        }
      }

      // Timeout jika menggunakan foto statis tanpa gerakan asli
      if (loopCount > maxDurationLoops) {
        clearInterval(detectionIntervalId.current);
        setStatus("🚫 TERDETEKSI FOTO STATIS / MEDIA!");
        setWarningNotice("🚫 Terdeteksi Foto Statis / Media Non-Wajah Asli! Liveness gagal.");
        setScanFailed(true);
        setIsScanning(false);
        return;
      }

      if (challenges[currentStep].check(det)) {
        setWarningNotice("");
        if (currentStep < challenges.length - 1) {
          currentStep++;
          setStatus("Bagus! " + challenges[currentStep].label);
        } else {
          clearInterval(detectionIntervalId.current);
          setStatus("Menyimpan...");
          handleFinalSubmit(descriptorRef || det.descriptor);
        }
      }
    }, 250); 
  };

  const startAbsensi = async () => {
    if (isAlreadyAttended) return toast.error(`Sudah absen ${campusConfig.nama_matkul}`);
    if (!isTimeValid) return toast.error("Sesi ditutup.");
    if (!locationAllowed) return toast.error("Di luar radius.");
    try {
      setScanFailed(false);
      setIsScanning(true);
      setWarningNotice("");
      setStatus("Membuka Kamera...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOn(true);
      
      // Kamera TETAP BUKA terus tanpa menutup atau mengeluarkan toast error popup!
      setTimeout(() => {
        if (!videoRef.current) return;
        const shuffled = [...challengeLibrary].sort(() => 0.5 - Math.random()).slice(0, 2);
        runLivenessLoop(shuffled, null);
      }, 400);
    } catch (e) { toast.error("Gagal membuka kamera."); setIsScanning(false); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (detectionIntervalId.current) clearInterval(detectionIntervalId.current);
    setIsCameraOn(false);
    setIsScanning(false);
    setWarningNotice("");
    if (!isAlreadyAttended) setStatus("Siap melakukan absensi");
  };

  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen animate-in fade-in duration-700">
      
      {/* 1. HEADER (DI LUAR KOTAK PUTIH) */}
      <div className="mb-6 px-2 flex items-center gap-3">
        {/* Logo Kampus untuk Mobile */}
        <img src={logoImage} alt="Logo Kampus" className="w-10 h-10 md:hidden object-contain flex-shrink-0" />
        <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-[#3a2e4b] tracking-wide uppercase leading-none">
          Hi, <span className="text-purple-600">{mahasiswaData.nama.split(' ')[0]}!</span>
        </h2>
      </div>

      {/* 2. KOTAK PUTIH UTAMA */}
      <div className="rounded-3xl md:rounded-[3.5rem] p-2 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
          
          {/* CARD KIRI: PEMINDAIAN BIOMETRIK (LIGHT STYLE) */}
          <div className="bg-[#f2e6ff] rounded-3xl md:rounded-[3rem] p-5 md:p-10 flex flex-col items-center border border-gray-100">
            <div className="w-full mb-8 flex items-center gap-4">

          <div className="p-3 bg-[#52426b] text-[#f2e6ff] rounded-2xl shadow-sm">
            <ScanFace size={28} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-[#3a2e4b] tracking-tight uppercase">Pemindaian Biometrik</h3>
            <p className="text-gray-500 text-sm font-bold capitalize tracking-widest mt-1">Liveness Detection</p>
          </div>
        </div>

            <div className="w-full aspect-[4/3] bg-[#F8F4FF] rounded-[2.5rem] border border-[#f2e6ff] flex items-center justify-center overflow-hidden relative shadow-inner mb-4">
              {!isCameraOn ? (
                <Camera size={100} className="text-gray-300" />
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              )}
            </div>

            {/* KOTAK WARNING SIGN TEPAT DI BAWAH FRAME KAMERA */}
            <div className="w-full mb-8 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm transition-all duration-300">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="text-[11px] font-bold leading-relaxed">
                <span className="font-black uppercase tracking-wider block text-amber-800 mb-0.5">Petunjuk & Validasi Kamera:</span>
                {warningNotice ? (
                  <span className="text-rose-600 font-black animate-pulse block">{warningNotice}</span>
                ) : (
                  <span className="text-slate-600">
                    Pastikan pencahayaan cukup terang. Mohon <strong>lepas masker, kacamata hitam, topi</strong>, atau penutup wajah lainnya agar verifikasi liveness berhasil.
                  </span>
                )}
              </div>
            </div>

            <div className="w-full">
              {!isScanning && !scanFailed && (
                <button 
                  onClick={startAbsensi} 
                  disabled={isAlreadyAttended || !isTimeValid}
                  className={`w-full py-5 rounded-[2rem] font-bold text-m uppercase tracking-widest transition-all shadow-md
                    ${isAlreadyAttended 
                      ? 'bg-[#F8F4FF] text-[#8B8396] cursor-not-allowed' 
                      : !isTimeValid
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-[#52426b] text-white hover:scale-[1.02] active:scale-95'}`}
                >
                  {isAlreadyAttended ? "Sesi Berhasil Tercatat ✅" : "Mulai Absensi"}
                </button>
              )}

              {isScanning && (
                <div className="w-full py-5 bg-black text-white font-black rounded-[2rem] text-sm uppercase tracking-widest animate-pulse text-center">
                  {status}
                </div>
              )}
              
              {scanFailed && (
                <button onClick={startAbsensi} className="w-full bg-red-600 text-white font-black py-5 rounded-[2rem] text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] transition-all">
                  <RefreshCw size={20} /> Coba Lagi
                </button>
              )}
            </div>
          </div>

          {/* CARD KANAN: VALIDASI & LOKASI (DARK STYLE) */}
          <div className="bg-[#52426b] rounded-3xl md:rounded-[3rem] p-5 md:p-10 flex flex-col text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-4 mb-10 relative z-10">
              
              <div className="p-3 bg-[#f2e6ff] text-[#52426b] rounded-2xl backdrop-blur-sm border border-white/20">
                <MapPin size={28} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-[#e4d6f3] tracking-tight uppercase">Validasi & Lokasi</h3>
                <p className="text-gray-300 text-sm font-bold capitalize tracking-widest mt-1">Otoritas Universitas Gunadarma</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8 relative z-10">
              {/* SESI AKTIF */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center transition-hover hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <BookOpen size={20} className="text-[#e4d6f3]" />
                  <span className="text-[12px] font-black uppercase tracking-widest text-[#e4d6f3] leading-none">Mata Kuliah</span>
                </div>
                <span className="font-bold text-sm text-[#e4d6f3] truncate max-w-[150px]">{campusConfig.nama_matkul || "---"}</span>
              </div>

              {/* SESI ABSENSI */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center transition-hover hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <Clock size={20} className="text-[#e4d6f3]" />
                  <span className="text-[12px] font-black uppercase tracking-widest text-[#e4d6f3] leading-none">Sesi Waktu</span>
                </div>
                <span className={`font-black text-sm ${isTimeValid ? "text-green-400" : "text-red-400"}`}>
                  {isTimeValid ? "Dibuka" : "Tutup"}
                </span>
              </div>

              {/* AREA KAMPUS */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex justify-between items-center transition-hover hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <MapPin size={20} className="text-[#e4d6f3]" />
                  <span className="text-[12px] font-black uppercase tracking-widest text-[#e4d6f3] leading-none">Area Kampus</span>
                </div>
                <span className={`font-black text-sm ${locationAllowed ? "text-green-400" : "text-red-400"}`}>
                  {locationAllowed ? "Sesuai" : "Diluar"}
                </span>
              </div>
            </div>

            {/* PETA */}
            <div className="flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden relative min-h-[220px] flex items-center justify-center">
              {campusConfig.isLoaded ? (
                <MapContainer 
                  center={userPos ? [userPos.lat, userPos.lng] : [campusConfig.latitude || -6.3686, campusConfig.longitude || 106.8331]} 
                  zoom={16} 
                  style={{ height: '100%', width: '100%' }}
                  dragging={true} scrollWheelZoom={true} zoomControl={true}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  
                  {/* LOKASI PRESENSI KAMPUS DARI ADMIN */}
                  {campusConfig.latitude !== 0 && campusConfig.longitude !== 0 && (
                    <>
                      <Circle 
                        center={[campusConfig.latitude, campusConfig.longitude]} 
                        radius={campusConfig.radius || 50} 
                        pathOptions={{ color: '#A855F7', fillColor: '#A855F7', fillOpacity: 0.2, weight: 2 }} 
                      />
                      <Marker position={[campusConfig.latitude, campusConfig.longitude]}>
                        <Popup>Lokasi Presensi Kampus</Popup>
                      </Marker>
                    </>
                  )}

                  {/* POSISI MAHASISWA */}
                  {userPos && (
                    <Marker position={[userPos.lat, userPos.lng]}>
                      <Popup>Posisi Perangkat Anda</Popup>
                    </Marker>
                  )}

                  <MapController userPos={userPos} campusConfig={campusConfig} />
                </MapContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#e4d6f3] font-black tracking-widest text-[10px] uppercase animate-pulse italic text-center p-4">
                  Sinkronisasi Peta & Sesi Presensi Kampus...
                </div>
              )}
            </div>

            {/* BOTTOM LABEL */}
            <div className="mt-8 bg-[#e4d6f7] text-black p-6 rounded-[2rem] flex justify-between items-center">
              <div>
                <p className="text-xl font-black text-[#8B8396] uppercase tracking-thigt mb-1">Status Keamanan</p>
                <p className="text-xl font-extrabold tracking-tight">Terverifikasi</p>
              </div>
              <div className="h-12 w-12 bg-black rounded-2xl flex items-center justify-center shadow-xl">
                <ShieldCheck className="text-white" size={24} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;