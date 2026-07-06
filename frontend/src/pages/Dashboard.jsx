import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";
import { Camera, RefreshCw, CheckCircle, BookOpen, Clock, MapPin, ShieldCheck, ScanFace } from "lucide-react";
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
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

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => { 
    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.invalidateSize();
      map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
    }
  }, [center, map]);
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
        // Cek kalau token diblokir browser (Tracking Prevention)
        if (!token) throw new Error("Token tidak ditemukan. Cek pengaturan privasi browser.");

        const header = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Ambil data pengaturan kampus
        const configRes = await axios.get('http://localhost:5000/api/mahasiswa/admin/pengaturan-kampus', header);
        const settings = configRes.data;

        // 2. 🛡️ SAFETY CHECK: Jika Admin belum buka sesi, berhenti di sini (Jangan paksa baca koordinat)
        if (!settings || Object.keys(settings).length === 0 || !settings.lokasi) {
          setCampusConfig(prev => ({ 
            ...prev, 
            isLoaded: true,
            nama_matkul: "Belum ada sesi aktif" 
          }));
          setStatus("❌ Belum ada sesi presensi dari Admin");
          setIsTimeValid(false);
          return; // Menghentikan fungsi agar tidak crash di bawah
        }

        // 3. Jika sesi ADA, baru baca koordinat lokasi
        const loc = typeof settings.lokasi === 'string' ? JSON.parse(settings.lokasi) : settings.lokasi;

        setCampusConfig({ 
          latitude: parseFloat(loc.lat), 
          longitude: parseFloat(loc.lng), 
          radius: settings.radius, 
          nama_matkul: settings.nama_matkul,
          kode_matkul: settings.kode_matkul,
          isLoaded: true 
        });

        // 4. Validasi waktu dan status absen
        const timeRes = await axios.get('http://localhost:5000/api/mahasiswa/absensi/validasi-waktu', header);
        setIsTimeValid(timeRes.data.valid);

        const statusRes = await axios.get(`http://localhost:5000/api/mahasiswa/absensi/status-hari-ini/${npm}`, header);
        setIsAlreadyAttended(statusRes.data.alreadyAttended);

        if (statusRes.data.alreadyAttended) {
          setStatus(`✅ Sudah absen ${settings.nama_matkul}`);
        } else if (!timeRes.data.valid) {
          setStatus("❌ Sesi absensi ditutup");
        } else {
          setStatus("Siap melakukan absensi");
        }

      } catch (err) { 
        // Log ini akan menampilkan pesan aslinya kalau ada error lain!
        console.error("❌ Gagal sinkronisasi sesi. Detail:", err.response?.data || err.message); 
      }
    };

    syncSesiDanWaktu();
    const interval = setInterval(syncSesiDanWaktu, 30000); 
    return () => clearInterval(interval);
  }, [npm, token]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((pos) => {
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
    }, (err) => {
      console.error("Gagal mendeteksi GPS:", err);
    }, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
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
      setIsAlreadyAttended(true);
      setTimeout(() => stopCamera(), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal Absen";
      toast.error(msg, { id: loadingToast });
      setScanFailed(true);
      setIsScanning(false);
      setStatus(`❌ ${msg}`);
      if (detectionIntervalId.current) clearInterval(detectionIntervalId.current);
    }
  };

  const runLivenessLoop = (challenges, descriptorReference) => {
    let currentStep = 0;
    setStatus(challenges[currentStep].label);
    detectionIntervalId.current = setInterval(async () => {
      if (!videoRef.current) return;
      const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 }))
        .withFaceLandmarks().withFaceExpressions().withFaceDescriptor();
      if (det && challenges[currentStep].check(det)) {
        if (currentStep < challenges.length - 1) {
          currentStep++;
          setStatus("Bagus! " + challenges[currentStep].label);
        } else {
          clearInterval(detectionIntervalId.current);
          setStatus("Menyimpan...");
          handleFinalSubmit(descriptorReference);
        }
      }
    }, 450); 
  };

  const startAbsensi = async () => {
    if (isAlreadyAttended) return toast.error(`Sudah absen ${campusConfig.nama_matkul}`);
    if (!isTimeValid) return toast.error("Sesi ditutup.");
    if (!locationAllowed) return toast.error("Di luar radius.");
    try {
      setScanFailed(false);
      setIsScanning(true);
      setStatus("Menganalisis...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOn(true);
      setTimeout(async () => {
        const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks().withFaceDescriptor();
        if (det) {
          const shuffled = [...challengeLibrary].sort(() => 0.5 - Math.random()).slice(0, 2);
          runLivenessLoop(shuffled, det.descriptor);
        } else {
          toast.error("Wajah tidak jelas.");
          stopCamera();
        }
      }, 2000);
    } catch (e) { toast.error("Kamera gagal."); setIsScanning(false); }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (detectionIntervalId.current) clearInterval(detectionIntervalId.current);
    setIsCameraOn(false);
    setIsScanning(false);
    if (!isAlreadyAttended) setStatus("Siap melakukan absensi");
  };

  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen animate-in fade-in duration-700">
      <Toaster />
      
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

            <div className="w-full aspect-[4/3] bg-[#F8F4FF] rounded-[2.5rem] border border-[#f2e6ff] flex items-center justify-center overflow-hidden relative shadow-inner mb-8">
              {!isCameraOn ? (
                <Camera size={100} className="text-gray-300" />
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              )}
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
            <div className="flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden relative min-h-[200px] flex items-center justify-center">
              {userPos ? (
                <MapContainer 
                  center={[userPos.lat, userPos.lng]} zoom={17} style={{ height: '100%', width: '100%' }}
                  dragging={false} scrollWheelZoom={false} zoomControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  {campusConfig.latitude !== 0 && campusConfig.longitude !== 0 && (
                    <Circle center={[campusConfig.latitude, campusConfig.longitude]} radius={campusConfig.radius} pathOptions={{ color: '#A855F7', fillColor: 'white', fillOpacity: 0.1, weight: 1 }} />
                  )}
                  <Marker position={[userPos.lat, userPos.lng]} />
                  <MapController center={userPos} />
                </MapContainer>
              ) : !campusConfig.isLoaded ? (
                <div className="h-full flex items-center justify-center text-[#e4d6f3] font-black tracking-widest text-[10px] uppercase animate-pulse italic text-center p-4">
                  Sinkronisasi Sistem Absensi...
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[#e4d6f3] font-black tracking-widest text-[10px] uppercase animate-pulse italic text-center p-4">
                  Mencari Koordinat GPS...
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