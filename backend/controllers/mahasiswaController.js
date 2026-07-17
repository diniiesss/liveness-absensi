const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const mahasiswaModel = require('../models/mahasiswaModel');
const pool = require('../config/db');
const { getDistanceFromLatLonInMeters } = require('../utils/distance');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// --- KONFIGURASI FACE-API (CANVAS) ---
const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

dayjs.extend(utc);
dayjs.extend(timezone);

const FACE_MATCH_THRESHOLD = 0.45; 
const FACE_DUPLICATION_THRESHOLD = 0.45; 

async function loadFaceApiModels() {
    const MODEL_PATH = './public/models';
    try {
        await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
            faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
            faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH),
            faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_PATH)
        ]);
        console.log('✅ Face-API models loaded successfully.');
    } catch (error) {
        console.error('❌ Failed to load Face-API models:', error);
    }
}
loadFaceApiModels();

// --- 1. REGISTRASI ---
const registerMahasiswa = async (req, res) => {
    const { npm, nama, kelas, faculty, jurusan, password, face_descriptor, faceImage } = req.body;
    // Dukungan toleransi penamaan properti dari frontend (fakultas / faculty)
    const fakultas = req.body.fakultas || faculty;

    if (!npm || !nama || !kelas || !fakultas || !jurusan || !password || !face_descriptor || !faceImage) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }
    try {
        const existingMahasiswa = await mahasiswaModel.getMahasiswaByNPM(npm);
        if (existingMahasiswa) return res.status(409).json({ message: 'NPM sudah terdaftar.' });

        const allStudents = await mahasiswaModel.getAllMahasiswaWithFaceDescriptors();
        const inputFaceDescriptor = new Float32Array(face_descriptor);
        for (const student of allStudents) {
            if (student.face_descriptor) {
                let storedDescriptor;
                try {
                    storedDescriptor = typeof student.face_descriptor === 'string' 
                        ? JSON.parse(student.face_descriptor) 
                        : student.face_descriptor;
                } catch (e) { continue; }
                
                const dist = faceapi.euclideanDistance(inputFaceDescriptor, new Float32Array(storedDescriptor));
                if (dist < FACE_DUPLICATION_THRESHOLD) {
                    return res.status(409).json({ message: `Wajah sudah terdaftar (NPM: ${student.npm}).` });
                }
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await mahasiswaModel.createMahasiswa({
            npm, nama, kelas, fakultas, jurusan,
            password_hash: hashedPassword,
            face_descriptor: JSON.stringify(face_descriptor),
            face_image: faceImage
        });
        res.status(201).json({ message: 'Registrasi berhasil.' });
    } catch (err) { res.status(500).json({ message: 'Error server.' }); }
};

// --- 2. LOGIN ---
const login = async (req, res) => {
    const { npm, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM mahasiswa WHERE npm = $1', [npm]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'NPM tidak ditemukan.' });
        const mahasiswa = result.rows[0];
        const match = await bcrypt.compare(password, mahasiswa.password_hash);
        if (!match) return res.status(401).json({ success: false, message: 'Password salah.' });
        const token = jwt.sign({ npm: mahasiswa.npm, role: 'mahasiswa' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, mahasiswa });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// --- 3. PROSES ABSENSI ---
const absen = async (req, res) => {
    const npmDariToken = req.user.npm;
    const { lokasi_lat, lokasi_lng, faceDescriptor, livenessPassed } = req.body;

    try {
        const student = await mahasiswaModel.getMahasiswaByNPM(npmDariToken);
        if (!student) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan.' });

        // FIXED MULTI-ADMIN: Menarik sesi presensi dosen yang memang membuka akses untuk KELAS mahasiswa ini
        const adminRes = await pool.query(
            'SELECT * FROM admin_settings WHERE $1 = ANY(allowed_kelas) LIMIT 1', 
            [student.kelas]
        );
        if (adminRes.rows.length === 0) return res.status(404).json({ message: 'Sesi presensi untuk kelas anda belum dibuka.' });
        const settings = adminRes.rows[0];

        const now = dayjs().tz('Asia/Jakarta');
        const sessionDate = dayjs(settings.hari_aktif).format('YYYY-MM-DD');
        const currentDate = now.format('YYYY-MM-DD');

        if (currentDate !== sessionDate) {
            return res.status(403).json({ message: `Sesi bukan untuk tanggal ${sessionDate}` });
        }

        const [hStart, mStart] = settings.jam_masuk.split(':').map(Number);
        const [hEnd, mEnd] = settings.jam_selesai.split(':').map(Number);
        const startTime = dayjs().tz('Asia/Jakarta').hour(hStart).minute(mStart).second(0).millisecond(0);
        const endTime = dayjs().tz('Asia/Jakarta').hour(hEnd).minute(mEnd).second(59).millisecond(999);

        if (now.isBefore(startTime) || now.isAfter(endTime)) {
            return res.status(403).json({ message: 'Sesi jam absensi ditutup.' });
        }

        const checkAbsen = await pool.query(
            'SELECT * FROM absensi WHERE npm = $1 AND kode_matkul = $2 AND DATE(waktu_absen) = $3', 
            [npmDariToken, settings.kode_matkul, currentDate]
        );
        if (checkAbsen.rows.length > 0) {
            return res.status(403).json({ message: `Sudah absen ${settings.nama_matkul} hari ini.` });
        }

        if (!livenessPassed) return res.status(403).json({ message: 'Liveness detection gagal.' });

        const loc = typeof settings.lokasi === 'string' ? JSON.parse(settings.lokasi) : settings.lokasi;
        const jarak = getDistanceFromLatLonInMeters(loc.lat, loc.lng, lokasi_lat, lokasi_lng);
        if (jarak > (settings.radius || 50)) return res.status(403).json({ message: `Di luar radius (${jarak.toFixed(0)}m)` });

        const storedDescriptor = typeof student.face_descriptor === 'string' 
            ? JSON.parse(student.face_descriptor) 
            : student.face_descriptor;

        const distance = faceapi.euclideanDistance(new Float32Array(faceDescriptor), new Float32Array(storedDescriptor));
        if (distance > FACE_MATCH_THRESHOLD) return res.status(403).json({ message: 'Wajah tidak cocok.' });

        const statusAbsen = now.isAfter(startTime.add(settings.toleransi, 'minute')) ? 'Terlambat' : 'Hadir';
        
        // FIXED: Menghapus baris "nama_matkul" agar tidak crash saat di-insert ke PostgreSQL
        await mahasiswaModel.insertAbsensi({
            npm: npmDariToken,
            status: statusAbsen,
            lokasi_lat,
            lokasi_lng,
            kode_matkul: settings.kode_matkul
        });

        res.status(201).json({ valid: true, message: `Absensi ${settings.nama_matkul} Berhasil!` });
    } catch (err) { res.status(500).json({ message: 'Error server absen.' }); }
};

// --- 4. CEK NPM ---
const checkNPM = async (req, res) => {
    try {
        const { npm } = req.body;
        const user = await mahasiswaModel.getMahasiswaByNPM(npm);
        res.json({ exists: !!user });
    } catch (error) {
        res.status(500).json({ message: 'Gagal cek NPM.' });
    }
};

// --- 5. CEK DUPLIKASI WAJAH ---
const checkFaceDuplicate = async (req, res) => {
    try {
        const { descriptor } = req.body;
        if (!descriptor) return res.status(400).json({ message: 'Descriptor wajah diperlukan.' });

        const allStudents = await mahasiswaModel.getAllMahasiswaWithFaceDescriptors();
        const inputDescriptor = new Float32Array(descriptor);

        for (const student of allStudents) {
            if (student.face_descriptor) {
                let storedDescriptor;
                try {
                    storedDescriptor = typeof student.face_descriptor === 'string' 
                        ? JSON.parse(student.face_descriptor) 
                        : student.face_descriptor;
                } catch (e) { continue; }

                const dist = faceapi.euclideanDistance(inputDescriptor, new Float32Array(storedDescriptor));
                
                if (dist < FACE_DUPLICATION_THRESHOLD) {
                    return res.json({ exists: true, npm: student.npm });
                }
            }
        }
        res.json({ exists: false });
    } catch (error) {
        console.error("Error di checkFaceDuplicate:", error);
        res.status(500).json({ message: 'Gagal validasi duplikasi wajah.' });
    }
};

// --- 6. STATISTIK FILTERED ---
const getStatistikFiltered = async (req, res) => {
    const { npm } = req.params;
    const { bulan, kode_matkul } = req.query;
    try {
        let statusQuery = `SELECT status, COUNT(*) as jumlah FROM absensi WHERE npm = $1`;
        let params = [npm];
        if (bulan) {
            params.push(bulan);
            statusQuery += ` AND EXTRACT(MONTH FROM waktu_absen) = $${params.length}`;
        }
        if (kode_matkul && kode_matkul !== 'Semua') {
            params.push(kode_matkul);
            statusQuery += ` AND kode_matkul = $${params.length}`;
        }
        statusQuery += ` GROUP BY status`;
        const resStatus = await pool.query(statusQuery, params);

        const stats = { hadir: 0, terlambat: 0, alpa: 0, total: 0 };
        resStatus.rows.forEach(row => {
            const s = row.status.toLowerCase();
            if (s === 'hadir') stats.hadir = parseInt(row.jumlah);
            else if (s === 'terlambat') stats.terlambat = parseInt(row.jumlah);
            else stats.alpa += parseInt(row.jumlah);
        });
        stats.total = stats.hadir + stats.terlambat + stats.alpa;

        let freqQuery = `SELECT to_char(waktu_absen, 'Dy') as hari, COUNT(*) as jumlah FROM absensi WHERE npm = $1 AND (status = 'Hadir' OR status = 'Terlambat')`;
        let freqParams = [npm];
        if (bulan) { freqParams.push(bulan); freqQuery += ` AND EXTRACT(MONTH FROM waktu_absen) = $${freqParams.length}`; }
        if (kode_matkul && kode_matkul !== 'Semua') { freqParams.push(kode_matkul); freqQuery += ` AND kode_matkul = $${freqParams.length}`; }
        freqQuery += ` GROUP BY hari`;
        const resFreq = await pool.query(freqQuery, freqParams);

        res.json({ success: true, stats, frekuensi: resFreq.rows });
    } catch (error) { res.status(500).json({ success: false }); }
};

// --- 7. FREKUENSI MINGGUAN ---
const getFrekuensiMingguan = async (req, res) => {
    const { npm } = req.params;
    try {
        const result = await pool.query(`SELECT to_char(waktu_absen, 'Dy') as hari, COUNT(*) as jumlah FROM absensi WHERE npm = $1 AND waktu_absen >= CURRENT_DATE - INTERVAL '6 days' GROUP BY hari`, [npm]);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false }); }
};

// --- 8. STATUS SESI HARI INI ---
const getStatusAbsensiHariIni = async (req, res) => {
    const { npm } = req.params;
    try {
        const studentRes = await pool.query('SELECT kelas FROM mahasiswa WHERE npm = $1', [npm]);
        if (studentRes.rows.length === 0) return res.json({ alreadyAttended: false });
        const studentKelas = studentRes.rows[0].kelas;

        // FIXED MULTI-ADMIN: Mencari kecocokan berdasarkan kelas mahasiswa induk
        const adminRes = await pool.query('SELECT kode_matkul, hari_aktif FROM admin_settings WHERE $1 = ANY(allowed_kelas) LIMIT 1', [studentKelas]);
        if (adminRes.rows.length === 0) return res.json({ alreadyAttended: false });
        
        const settings = adminRes.rows[0];
        const sessionDate = dayjs(settings.hari_aktif).format('YYYY-MM-DD');

        const result = await pool.query(
            'SELECT * FROM absensi WHERE npm = $1 AND kode_matkul = $2 AND DATE(waktu_absen) = $3', 
            [npm, settings.kode_matkul, sessionDate]
        );
        res.json({ alreadyAttended: result.rows.length > 0 });
    } catch (error) { res.status(500).json({ message: 'Error status.' }); }
};

// --- 9. PROFIL ---
const getMahasiswaProfile = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT npm, nama, kelas, fakultas, jurusan, foto_profil, face_image, is_active FROM mahasiswa WHERE npm = $1', 
            [req.params.npm]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Profil tidak ditemukan.' });
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ message: 'Error profile.' }); }
};

// --- 10. RIWAYAT ---
const getRiwayatAbsensi = async (req, res) => {
    const { npm } = req.params;
    const { bulan, kode_matkul } = req.query;
    try {
        let query = `
            SELECT 
                a.id, 
                a.npm, 
                a.waktu_absen, 
                a.status, 
                a.lokasi_lat, 
                a.lokasi_lng, 
                a.kode_matkul,
                mk.nama_matkul
            FROM absensi a
            LEFT JOIN mata_kuliah mk ON a.kode_matkul = mk.kode_matkul
            WHERE a.npm = $1
        `;
        let params = [npm];
        
        if (bulan && bulan !== 'Semua' && bulan !== '') { 
            params.push(bulan); 
            query += ` AND EXTRACT(MONTH FROM a.waktu_absen) = $${params.length}`; 
        }
        
        // Filter Berdasarkan Jenis Mata Kuliah Dropdown
        if (kode_matkul && kode_matkul !== 'Semua') { 
            params.push(kode_matkul); 
            query += ` AND a.kode_matkul = $${params.length}`; 
        }
        
        query += ` ORDER BY a.waktu_absen DESC`;
        const result = await pool.query(query, params);
        
        res.json({ success: true, riwayat: result.rows });
    } catch (err) { 
        console.error('❌ Error getRiwayatAbsensi:', err);
        res.status(500).json({ message: 'Error server riwayat.' }); 
    }
};

// --- 11. VALIDASI WAKTU ---
const validasiWaktuAbsensi = async (req, res) => {
    try {
        const npmDariToken = req.user?.npm;
        if (!npmDariToken) return res.json({ valid: false });

        const studentRes = await pool.query('SELECT kelas FROM mahasiswa WHERE npm = $1', [npmDariToken]);
        if (studentRes.rows.length === 0) return res.json({ valid: false });
        const studentKelas = studentRes.rows[0].kelas;

        // FIXED MULTI-ADMIN: Cek validasi waktu khusus sesi kelas mahasiswa penembak token
        const result = await pool.query('SELECT * FROM admin_settings WHERE $1 = ANY(allowed_kelas) LIMIT 1', [studentKelas]);
        if (result.rows.length === 0) return res.json({ valid: false });
        const settings = result.rows[0];
        
        const now = dayjs().tz('Asia/Jakarta');
        const sessionDate = dayjs(settings.hari_aktif).format('YYYY-MM-DD');
        const currentDate = now.format('YYYY-MM-DD');

        if (currentDate !== sessionDate) return res.json({ valid: false });

        const [hStart, mStart] = settings.jam_masuk.split(':').map(Number);
        const [hEnd, mEnd] = settings.jam_selesai.split(':').map(Number);
        const startTime = dayjs().tz('Asia/Jakarta').hour(hStart).minute(mStart).second(0).millisecond(0);
        const endTime = dayjs().tz('Asia/Jakarta').hour(hEnd).minute(mEnd).second(59).millisecond(999);

        res.json({ valid: now.isAfter(startTime) && now.isBefore(endTime) });
    } catch (error) { res.json({ valid: false }); }
};

// --- 12. PENGATURAN KAMPUS ---
const getAdminCampusSettings = async (req, res) => {
    try {
        const npmDariToken = req.user?.npm;
        if (!npmDariToken) return res.json({});

        const studentRes = await pool.query('SELECT kelas FROM mahasiswa WHERE npm = $1', [npmDariToken]);
        if (studentRes.rows.length === 0) return res.json({});
        const studentKelas = studentRes.rows[0].kelas;

        // FIXED: Menggunakan LEFT JOIN ke mata_kuliah agar nama_matkul ikut terbawa
        const result = await pool.query(
            `SELECT s.*, mk.nama_matkul 
             FROM admin_settings s
             LEFT JOIN mata_kuliah mk ON s.kode_matkul = mk.kode_matkul
             WHERE $1 = ANY(s.allowed_kelas) LIMIT 1`, 
            [studentKelas]
        );
        
        res.json(result.rows[0] || null); // Mengembalikan null jika kelas tidak masuk sesi
    } catch (error) { 
        console.error("❌ Error di getAdminCampusSettings:", error);
        res.status(500).json({ message: 'Error settings.' }); 
    }
};

/// --- 13. UPDATE PASSWORD ---
const updatePassword = async (req, res) => {
    const { newPassword } = req.body; // Hanya menerima newPassword
    const npm = req.user.npm;

    try {
        if (!newPassword) {
            return res.status(400).json({ message: 'Password baru tidak boleh kosong.' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE mahasiswa SET password_hash = $1 WHERE npm = $2', [hashed, npm]);

        res.json({ success: true, message: 'Password berhasil diperbarui!' });
    } catch (err) { 
        console.error("Error di updatePassword:", err); // Biar errornya kelihatan di terminal backend
        res.status(500).json({ message: 'Gagal update password.' }); 
    }
};

// --- 14. UPDATE FOTO PROFIL VISUAL ---
const updateProfilePhoto = async (req, res) => {
    const { faceImage } = req.body; 
    const npm = req.user.npm;

    try {
        await pool.query('UPDATE mahasiswa SET foto_profil = $1 WHERE npm = $2', [faceImage, npm]);
        res.json({ success: true, message: 'Foto profil visual berhasil diperbarui!' });
    } catch (err) { res.status(500).json({ message: 'Gagal update foto profil.' }); }
};

// --- 15. CRON JOB: PENANDAAN OTOMATIS MAHASISWA ABSENT ---
const markAbsentStudentsDaily = async () => {
    try {
        const tglSekarang = dayjs().tz('Asia/Jakarta').format('YYYY-MM-DD');
        const jamMenitSekarang = dayjs().tz('Asia/Jakarta').format('HH:mm'); // Contoh: "22:14"
        
        // 1. Cari sesi milik admin SIAPA PUN yang hari aktifnya HARI INI dan JAM SELESAINYA PAS dengan menit sekarang
        const activeSessions = await pool.query(
            `SELECT s.kode_matkul, s.allowed_kelas, s.admin_id, mk.nama_matkul 
             FROM admin_settings s
             LEFT JOIN mata_kuliah mk ON s.kode_matkul = mk.kode_matkul
             WHERE DATE(s.hari_aktif) = $1 AND TO_CHAR(s.jam_selesai, 'HH24:MI') = $2`,
            [tglSekarang, jamMenitSekarang]
        );

        // Jika di menit ini tidak ada kelas dosen mana pun yang selesai, langsung berhenti (hemat RAM server)
        if (activeSessions.rows.length === 0) {
            return; 
        }

        console.log(`🔥 Ditemukan ${activeSessions.rows.length} sesi perkuliahan yang selesai pada menit ini (${jamMenitSekarang}). Memulai proses auto-alpa...`);

        // Looping secara paralel untuk setiap sesi matkul dosen yang selesai di menit yang sama
        for (const session of activeSessions.rows) {
            const { kode_matkul, allowed_kelas, nama_matkul } = session;
            if (!allowed_kelas || allowed_kelas.length === 0) continue;

            // 2. Ambil mahasiswa aktif yang masuk anggota kelas yang diizinkan dosen tersebut
            const studentRes = await pool.query(
                'SELECT npm FROM mahasiswa WHERE kelas = ANY($1) AND is_active = true',
                [allowed_kelas]
            );

            for (const student of studentRes.rows) {
                // 3. Cek apakah mahasiswa ini sudah absen di matkul tersebut hari ini
                const checkAbsen = await pool.query(
                    'SELECT id FROM absensi WHERE npm = $1 AND kode_matkul = $2 AND DATE(waktu_absen) = $3',
                    [student.npm, kode_matkul, tglSekarang]
                );

                // 4. Jika terbukti bolos/tidak scan wajah sampai menit terakhir, tembak status 'Tidak Hadir'
                if (checkAbsen.rows.length === 0) {
                    await mahasiswaModel.insertAbsensi({
                        npm: student.npm,
                        status: 'Tidak Hadir',
                        lokasi_lat: null,
                        lokasi_lng: null,
                        waktu: dayjs().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                        kode_matkul: kode_matkul
                    });
                    console.log(`📌 [AUTO-ALPA] NPM ${student.npm} ditandai Tidak Hadir pada matkul: ${nama_matkul}`);
                }
            }
        }
        console.log(`✅ Proses auto-alpa pada menit ${jamMenitSekarang} selesai.`);
    } catch (error) {
        console.error('❌ Terjadi kesalahan di dalam markAbsentStudentsDaily:', error);
        throw error;
    }
};

module.exports = {
    registerMahasiswa, login, absen, 
    getRiwayatAbsensi, getMahasiswaProfile,
    validasiWaktuAbsensi, getStatusAbsensiHariIni,
    getAdminCampusSettings, getStatistikFiltered, 
    getFrekuensiMingguan, updatePassword, updateProfilePhoto,
    checkNPM, checkFaceDuplicate,
    markAbsentStudentsDaily 
};