import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, ChevronUp, HelpCircle, 
  ShieldCheck, MapPin, Camera, Search, 
  MessageSquare, Compass, Info 
} from 'lucide-react';
import logoImage from "../components/logo.webp";

const FAQItem = ({ question, answer, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between text-left focus:outline-none group"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl transition-all ${isOpen ? 'bg-[#52426b] text-white rotate-6' : 'bg-[#F8F4FF] text-[#52426b] group-hover:bg-[#f2e6ff]'}`}>
            <Icon size={20} />
          </div>
          <span className={`font-black text-[15px] md:text-[16px] uppercase tracking-wide transition-colors ${isOpen ? 'text-[#52426b]' : 'text-slate-700'}`}>
            {question}
          </span>
        </div>
        <div className={`p-1.5 rounded-lg border transition-colors ${isOpen ? 'bg-[#f2e6ff] border-[#e4d6f7] text-[#52426b]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 pl-6 md:pl-20 text-[13px] md:text-[14px] text-slate-500 font-bold text-justify leading-relaxed animate-in slide-in-from-top-2 duration-300">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState({ nama: "", npm: "" });

  useEffect(() => {
    setProfile({
      nama: localStorage.getItem("nama") || "Mahasiswa",
      npm: localStorage.getItem("npm") || ""
    });
  }, []);

  const faqData = [
    {
      category: "Liveness",
      icon: ShieldCheck,
      question: "Apa itu 'Liveness Detection'?",
      answer: "Liveness Detection adalah fitur keamanan pintar untuk memverifikasi bahwa mahasiswa yang melakukan absensi adalah orang asli yang sedang aktif secara real-time, bukan menggunakan foto cetak, manipulasi rekaman video, atau masker/topeng wajah. Sistem kami memerlukan verifikasi gerakan acak untuk menjamin keabsahan data presensi."
    },
    {
      category: "Lokasi",
      icon: MapPin,
      question: "Kenapa status saya tetap 'Diluar Radius'?",
      answer: "Kondisi ini disebabkan oleh titik GPS perangkat yang berada di luar batas lingkaran radius presensi dosen. Pastikan GPS HP Anda aktif, dan Anda telah mengizinkan akses lokasi/geolocation pada browser Chrome/Safari Anda. Untuk meningkatkan akurasi, cobalah berpindah ke dekat area tengah kelas atau jendela ruangan agar sinyal GPS terlock lebih presisi."
    },
    {
      category: "Liveness",
      icon: Camera,
      question: "Wajah saya tidak terdeteksi oleh kamera, apa solusinya?",
      answer: "Pastikan Anda mengambil foto presensi di area dengan pencahayaan terang yang cukup (hindari kondisi ruangan gelap gulita atau silau backlight dari belakang). Lepaskan aksesoris berlebih seperti kacamata hitam, topi besar, atau masker penutup hidung-mulut agar kecerdasan buatan (AI) dapat mendeteksi koordinat fitur wajah Anda dengan optimal."
    },
    {
      category: "Umum",
      icon: HelpCircle,
      question: "Bagaimana jika jam sesi absensi sudah ditutup?",
      answer: "Setiap sesi absensi mata kuliah dikontrol ketat oleh durasi waktu aktif yang diatur oleh Dosen/Admin. Jika masa aktif sesi telah habis dan ditutup, Anda tidak dapat melakukan pemindaian mandiri lagi. Silakan berkoordinasi secara langsung dengan dosen pengampu atau sekretariat jurusan untuk proses persetujuan dispensasi manual."
    }
  ];

  // Jalur penyaringan FAQ berbasis Pencarian
  const filteredFaq = faqData.filter(item => {
    return item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
           item.answer.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-2 md:p-8 font-poppins min-h-screen animate-in fade-in duration-700 space-y-10">
      
      {/* 1. HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-4">
        <div className="flex items-center gap-4">
          {/* Logo Kampus untuk Mobile */}
          <img src={logoImage} alt="Logo Kampus" className="w-12 h-12 md:hidden object-contain flex-shrink-0" />
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3a2e4b] tracking-wide uppercase leading-none">Frequently Asked Questions</h2>
            <p className="text-[#8B8396] text-xs font-bold mt-2 tracking-wide uppercase">Punya kendala teknis? Temukan solusinya di bawah ini.</p>
          </div>
        </div>
      </div>

      {/* 2. CARD KONTEN UTAMA */}
      <div className="bg-[#f2e6ff] rounded-3xl md:rounded-[3.5rem] p-6 md:p-12 shadow-sm space-y-8">
        
        {/* BAR PENCARIAN */}
        <div className="space-y-6">
          <div className="relative group max-w-xl">
            <input 
              type="text" 
              placeholder="Cari solusi atau kata kunci (contoh: GPS, Wajah)..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#52426b] focus:ring-4 focus:ring-[#f2e6ff] transition-all shadow-sm"
            />
            <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#52426b] transition-colors" size={18} />
          </div>
        </div>

        {/* DATA FAQ LIST */}
        <div className="space-y-4">
          {filteredFaq.length > 0 ? (
            filteredFaq.map((item, index) => (
              <FAQItem 
                key={index}
                icon={item.icon}
                question={item.question}
                answer={item.answer}
              />
            ))
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto"><Info size={24} /></div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Solusi tidak ditemukan</p>
              <p className="text-[11px] font-bold text-slate-400 max-w-xs mx-auto">Coba masukkan kata kunci pencarian lain atau pilih kategori yang berbeda.</p>
            </div>
          )}
        </div>

        {/* SUPPORT CARD HUBUNGI ADMIN */}
        <div className="bg-gradient-to-r from-[#3a2e4b] to-[#52426b] text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-[#3a2e4b]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl text-[#f2e6ff]"><MessageSquare size={24} /></div>
            <div>
              <h4 className="text-[15px] font-black uppercase tracking-wider text-[#e4d6f3] mb-1">Masih Butuh Bantuan?</h4>
              <p className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Hubungi Dosen Pengampu atau Admin Akademik Jurusan.</p>
            </div>
          </div>
          <a 
            href="mailto:admin@kampus.ac.id" 
            className="relative z-10 px-6 py-3.5 bg-white text-[#3a2e4b] hover:bg-[#f2e6ff] font-black text-[11px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Hubungi Admin
          </a>
        </div>

      </div>
    </div>
  );
};

export default FAQ;