import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Settings, MapPin, Save, 
  ShieldCheck, Loader2, Navigation, RefreshCcw, ChevronDown 
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import logoImage from "../../components/logo.webp";

// Fix icon default leaflet agar muncul di layar
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const KelolaAbsensi = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [devicePos, setDevicePos] = useState(null);
  const [isMatkulOpen, setIsMatkulOpen] = useState(false);
  const matkulRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (matkulRef.current && !matkulRef.current.contains(event.target)) {
        setIsMatkulOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((pos) => {
        setDevicePos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.error("Gagal melacak GPS admin:", err), { enableHighAccuracy: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Fungsi untuk mendapatkan jam saat ini dalam format HH:mm
  const getCurrentTime = () => {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ":" + 
           now.getMinutes().toString().padStart(2, '0');
  };

  // Opsi mata kuliah objek berisi kode dan nama agar sinkron dengan database
  const matkulOptions = [
    { kode: 'AK045201', nama: 'Algoritma dan Pengolahan Paralel' },
    { kode: 'AK045214', nama: 'Pemrograman Jaringan' },
    { kode: 'AK045232', nama: 'Sistem Multimedia' },
    { kode: 'AK045643', nama: 'Tugas Akhir/Skripsi/Studi Komprehensif' },
    { kode: 'IT045107', nama: 'Bahasa Inggris Bisnis 2' },
    { kode: 'PB045205', nama: 'Bahasa Mandarin' }
  ];

  const [form, setForm] = useState({
    kode_matkul: "", 
    jam_masuk: getCurrentTime(), 
    jam_selesai: "10:00",
    toleransi: 15,
    hari_aktif: "",
    allowed_kelas: "",
    lokasi: { lat: -6.3686, lng: 106.8331 },
    radius: 50 
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get("http://localhost:5000/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        let formattedHariAktif = "";
        if (res.data.hari_aktif) {
          const dateObj = new Date(res.data.hari_aktif);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            formattedHariAktif = `${year}-${month}-${day}`;
          }
        }
        setForm({
          ...res.data,
          hari_aktif: formattedHariAktif,
          jam_masuk: res.data.jam_masuk || getCurrentTime(), 
          kode_matkul: res.data.kode_matkul || "", 
          radius: res.data.radius > 100 ? 100 : (res.data.radius || 50),
          allowed_kelas: Array.isArray(res.data.allowed_kelas) ? res.data.allowed_kelas.join(", ") : res.data.allowed_kelas
        });
      }
    } catch (err) {
      console.error("Gagal sinkronisasi database");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi pembantu untuk menggeser tampilan peta
  const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setForm(prev => ({ ...prev, lokasi: { lat: e.latlng.lat, lng: e.latlng.lng } }));
      },
    });
    if (!form.lokasi?.lat || !form.lokasi?.lng) return null;
    return <Marker position={[form.lokasi.lat, form.lokasi.lng]} />;
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation tidak didukung");
    const loadToast = toast.loading("Mencari koordinat Presensi...");
    navigator.geolocation.getCurrentPosition((pos) => {
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      
      setForm(prev => ({ ...prev, lokasi: { lat: newLat, lng: newLng } }));
      
      toast.dismiss(loadToast);
      toast.success("Lokasi diperbarui!");
    }, (err) => {
      toast.dismiss(loadToast);
      console.error("Gagal get koordinat:", err);
      if (err.code === 1) {
        toast.error("Izin lokasi ditolak browser!");
      } else if (err.code === 3) {
        toast.error("Waktu pencarian lokasi habis (RTO)!");
      } else {
        toast.error("Gagal akses lokasi perangkat!");
      }
    }, { enableHighAccuracy: true, timeout: 8000 });
  };

  const handleRadiusChange = (val) => {
    if (val === "") {
      setForm(prev => ({ ...prev, radius: "" }));
      return;
    }
    const value = parseInt(val);
    if (isNaN(value)) return;
    setForm(prev => ({ ...prev, radius: value }));
  };

  const handleSave = async () => {
    // Validasi Form
    const emptyFields = [];
    if (!form.kode_matkul) emptyFields.push("Mata Kuliah");
    if (!form.jam_masuk) emptyFields.push("Jam Masuk");
    if (!form.jam_selesai) emptyFields.push("Jam Selesai");
    if (form.toleransi === "" || form.toleransi === undefined) emptyFields.push("Toleransi Keterlambatan");
    if (!form.hari_aktif) emptyFields.push("Hari Aktif");
    if (!form.allowed_kelas || form.allowed_kelas.trim() === "") emptyFields.push("Kelas yang Diizinkan");
    if (!form.lokasi || !form.lokasi.lat || !form.lokasi.lng) emptyFields.push("Titik Lokasi Peta");
    if (form.radius === "" || form.radius === undefined) emptyFields.push("Radius Presensi");

    if (emptyFields.length > 0) {
      toast.error(`Wajib diisi: ${emptyFields.join(", ")}`);
      return;
    }

    if (form.radius < 50) {
      toast.error("Radius minimal 50 meter!");
      return;
    }

    if (form.radius > 100) {
      toast.error("Radius maksimal 100 meter!");
      return;
    }

    setSaveLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const finalRadius = form.radius === "" ? 50 : form.radius;
      
      const selectedMatkulObj = matkulOptions.find(m => m.kode === form.kode_matkul);
      const namaMatkulFinal = selectedMatkulObj ? selectedMatkulObj.nama : "";

      const payload = {
        ...form,
        nama_matkul: namaMatkulFinal, 
        radius: finalRadius,
        allowed_kelas: form.allowed_kelas.split(",").map(k => k.trim()).filter(k => k !== "")
      };
      await axios.put("http://localhost:5000/api/admin/settings", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm(prev => ({ ...prev, radius: finalRadius }));
      toast.success("Konfigurasi Berhasil Disimpan!");
    } catch (err) {
      toast.error("Gagal menyimpan data");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="animate-spin text-[#52426b]" size={40} />
      <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 italic">Memuat Konfigurasi...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-slate-800 leading-none">
            Kelola <br /> <span className="text-[#52426b]">Presensi</span>
          </h2>
        </div>
      </div>

      {/* GRID CONTAINER UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start px-6">
        
        {/* CARD KIRI: SESI MATA KULIAH */}
        <div className="md:col-span-12 lg:col-span-6 bg-white rounded-3xl md:rounded-[3.5rem] shadow-sm p-6 md:p-12 border border-slate-200 space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#f2e6ff] text-[#52426b] border border-purple-100 rounded-2xl shadow-sm"><Settings size={22} /></div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#52426b]">Sesi Mata Kuliah</h3>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-black text-[#52426b] uppercase tracking-widest ml-1">
                Nama Matakuliah
              </label>
              <div className="relative w-full" ref={matkulRef}>
                <button 
                  type="button"
                  onClick={() => setIsMatkulOpen(!isMatkulOpen)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold flex justify-between items-center transition-all focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] text-left ${
                    form.kode_matkul ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[280px]">{form.kode_matkul ? `[${form.kode_matkul}] ${matkulOptions.find(m => m.kode === form.kode_matkul)?.nama}` : "-- Pilih Mata Kuliah --"}</span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isMatkulOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMatkulOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-60 overflow-y-auto py-2 animate-in zoom-in-95 duration-200">
                    <button 
                      type="button"
                      onClick={() => { setForm({...form, kode_matkul: ""}); setIsMatkulOpen(false); }}
                      className="w-full text-left px-5 py-3.5 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 uppercase tracking-wider transition-colors"
                    >
                      -- Pilih Mata Kuliah --
                    </button>
                    {matkulOptions.map((m) => (
                      <button 
                        key={m.kode}
                        type="button"
                        onClick={() => { setForm({...form, kode_matkul: m.kode}); setIsMatkulOpen(false); }}
                        className="w-full text-left px-5 py-3 hover:bg-[#F8F4FF] text-xs font-bold text-slate-700 transition-colors whitespace-normal break-words leading-tight flex flex-col gap-0.5 border-t border-slate-50"
                      >
                        <span className="text-[9px] text-[#52426b]/60 uppercase tracking-widest">{m.kode}</span>
                        <span>{m.nama}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InputGroup label="Jam Masuk" type="time" value={form.jam_masuk} onChange={(v) => setForm({...form, jam_masuk: v})} />
              <InputGroup label="Jam Selesai" type="time" value={form.jam_selesai} onChange={(v) => setForm({...form, jam_selesai: v})} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InputGroup label="Toleransi (Menit)" type="number" value={form.toleransi} onChange={(v) => setForm({...form, toleransi: v})} />
              <InputGroup label="Hari Aktif" type="date" value={form.hari_aktif} onChange={(v) => setForm({...form, hari_aktif: v})} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-black text-[#52426b] uppercase tracking-widest ml-1">
                Akses Kelas (Pisahkan Koma)
              </label>
              <textarea 
                value={form.allowed_kelas} 
                onChange={(e) => setForm({...form, allowed_kelas: e.target.value})}
                placeholder="Contoh: 4IA01, 4IA02, 4IA03"
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-[13px] font-bold focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] min-h-[120px] resize-none transition-all placeholder:text-slate-300 ${
                  form.allowed_kelas ? 'text-slate-800' : 'text-slate-400'
                }`}
              />
            </div>
            
              <button 
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 group font-black text-[14px] uppercase tracking-widest shadow-sm"
            >
              <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
              <span>Hentikan & Reset Sesi</span>
            </button>
          </div>
        </div>

        {/* CARD KANAN: LOKASI PRESENSI */}
        <div className="md:col-span-12 lg:col-span-6 space-y-8">
          <div className="bg-white rounded-3xl md:rounded-[3.5rem] shadow-sm p-6 md:p-12 border border-slate-200 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl shadow-sm"><MapPin size={22} /></div>
              <h3 className="text-xl font-black uppercase tracking-tight text-[#52426b]">Lokasi Presensi</h3>
            </div>

            {/* AREA MAPS */}
            <div className="h-[340px] w-full rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-200 relative z-0 isolate [transform:translate3d(0,0,0)]">
              <MapContainer 
                center={[form.lokasi?.lat || -6.3686, form.lokasi?.lng || 106.8331]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }}
                whenCreated={mapInstance => { mapRef.current = mapInstance }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <LocationMarker />
                {form.lokasi?.lat && form.lokasi?.lng && (
                  <Circle 
                    center={[form.lokasi.lat, form.lokasi.lng]} 
                    radius={form.radius || 50} 
                    pathOptions={{ color: '#A855F7', fillColor: 'white', fillOpacity: 0.15, weight: 1.5 }} 
                  />
                )}
                {devicePos && (
                  <Circle 
                    center={[devicePos.lat, devicePos.lng]} 
                    radius={6} 
                    pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 2 }} 
                  />
                )}
                {form.lokasi?.lat && form.lokasi?.lng && (
                  <RecenterMap lat={form.lokasi.lat} lng={form.lokasi.lng} />
                )}
              </MapContainer>
            </div>

            {/* TOMBOL AMBIL LOKASI */}
            <button 
              type="button"
              onClick={handleUpdateLocation}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-[#f2e6ff] border border-purple-100 text-[#52426b] rounded-2xl hover:bg-[#52426b] hover:text-white transition-all shadow-sm active:scale-95 group font-black text-[14px] uppercase tracking-widest"
            >
              <Navigation size={14} className="group-hover:rotate-12 transition-transform" />
              <span>Ambil Lokasi GPS Saat Ini</span>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-[13px] font-black uppercase text-[#52426b] mb-0.5 tracking-wider">Latitude</p>
                <p className="text-sm font-black text-slate-500">{form.lokasi?.lat ? form.lokasi.lat.toFixed(6) : "-"}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <p className="text-[13px] font-black uppercase text-[#52426b] mb-0.5 tracking-wider">Longitude</p>
                <p className="text-sm font-black text-slate-500">{form.lokasi?.lng ? form.lokasi.lng.toFixed(6) : "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2">
              <div className="md:col-span-7">
                <InputGroup 
                  label="Radius Jangkauan (Meter)" 
                  type="number" 
                  value={form.radius} 
                  onChange={handleRadiusChange} 
                  placeholder="50"
                />
              </div>
              <div className="md:col-span-5">
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="w-full bg-[#3a2e4b] text-white font-bold py-4 rounded-2xl shadow-md uppercase text-[14px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#52426b] transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 h-[52px]"
                >
                  {saveLoading ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Update Sesi</>}
                </button>
              </div>
            </div>
          </div>

          {/* SECURITY CARD */}
          <div className="bg-[#2b2238] text-white rounded-[2.5rem] p-8 shadow-lg relative overflow-hidden flex items-center gap-6 border border-[#3a2e4b]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <ShieldCheck size={54} className="text-[#e4d6f3] opacity-80 shrink-0" />
            <div className="relative z-10">
              <p className="text-[13px] font-black uppercase tracking-[0.2em] mb-1 text-[#e4d6f3] italic">Security Protocol</p>
              <p className="text-[14px] font-bold leading-relaxed text-slate-300">
                Radius secara otomatis diatur pada 50 meter. Admin hanya dapat memperluas jangkauan maksimal hingga 100 meter demi validitas data liveness mahasiswa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL RESET */}
      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto"><RefreshCcw size={32} /></div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Hentikan Sesi?</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-2">Yakin ingin menghentikan sesi ini sekarang? Semua data sesi akan dihapus.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
              <button onClick={async () => {
                try {
                  await axios.delete("http://localhost:5000/api/admin/settings");
                  toast.success("Sesi berhasil direset!");
                  setForm({ kode_matkul: "", jam_masuk: "08:00", jam_selesai: "10:00", toleransi: 15, hari_aktif: "", allowed_kelas: "", lokasi: { lat: -6.3686, lng: 106.8331 }, radius: 50 });
                  setShowResetModal(false);
                } catch (err) { toast.error("Gagal mereset sesi"); }
              }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange, ...props }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-[14px] font-black text-[#52426b] uppercase tracking-widest ml-1">
      {label}
    </label>
    <input 
      {...props} 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold focus:bg-white focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all duration-200 ${
        value ? 'text-slate-800' : 'text-slate-400'
      }`} 
    />
  </div>
);

export default KelolaAbsensi;