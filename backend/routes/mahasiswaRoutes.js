// mahasiswaRoutes.js
const express = require('express');
const router = express.Router();
const mahasiswaController = require('../controllers/mahasiswaController');
const authMiddleware = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');

// Impor model untuk PostgreSQL
const mahasiswaModel = require('../models/mahasiswaModel'); 

// --- Rute Registrasi & Login ---
router.post('/register', mahasiswaController.registerMahasiswa);

// --- UPDATE BARU: RUTE PENCEGAHAN DUPLIKASI ---
// Cek NPM (digunakan di Step 1 Registrasi)
router.post('/check-npm', mahasiswaController.checkNPM);
router.post('/check-face', mahasiswaController.checkFaceDuplicate);

// --- Rute Reset Password (Biasanya digunakan oleh Admin) ---
router.post('/reset-password', async (req, res) => {
    const { npm, newPassword } = req.body;
    if (!npm || !newPassword) {
        return res.status(400).json({ success: false, message: "NPM dan password baru diperlukan." });
    }
    try {
        const mahasiswa = await mahasiswaModel.getMahasiswaByNPM(npm);
        if (!mahasiswa) {
            return res.status(404).json({ success: false, message: "Mahasiswa tidak ditemukan." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await mahasiswaModel.updateMahasiswaPassword(npm, hashedPassword);
        res.json({ success: true, message: "Password mahasiswa berhasil direset." });
    } catch (error) {
        console.error("Kesalahan reset password:", error);
        res.status(500).json({ success: false, message: "Kesalahan server." });
    }
});

// --- Rute Absensi & Liveness ---

// Cek status absensi hari ini
router.get(
    '/absensi/status-hari-ini/:npm',
    authMiddleware.verifyToken,
    mahasiswaController.getStatusAbsensiHariIni
);

// Rute untuk submit absensi
router.post(
    '/absensi/mulai',
    authMiddleware.verifyToken,
    mahasiswaController.absen
);

// Validasi waktu absensi
router.get(
    '/absensi/validasi-waktu',
    authMiddleware.verifyToken,
    mahasiswaController.validasiWaktuAbsensi
);

// --- Rute Statistik ---

// 1. Statistik Filtered
router.get(
    '/statistik-filtered/:npm',
    authMiddleware.verifyToken,
    mahasiswaController.getStatistikFiltered
);

// 2. Frekuensi Mingguan
router.get(
    '/frekuensi-mingguan/:npm',
    authMiddleware.verifyToken,
    mahasiswaController.getFrekuensiMingguan
);

// --- Rute Informasi & Profil ---

// Mendapatkan seluruh riwayat absensi
router.get(
    '/riwayat/:npm',
    authMiddleware.verifyToken,
    mahasiswaController.getRiwayatAbsensi
);

// Mendapatkan titik lokasi kampus & radius
router.get(
    '/admin/pengaturan-kampus',
    authMiddleware.verifyToken,
    mahasiswaController.getAdminCampusSettings
);

// Mendapatkan detail profil mahasiswa
router.get(
    '/profil/:npm',
    authMiddleware.verifyToken,
    mahasiswaController.getMahasiswaProfile
);

// --- UPDATE BARU: RUTE PENGATURAN AKUN (PENTING) ---

// Rute untuk ganti password sendiri (membutuhkan password lama)
router.put(
    '/update-password',
    authMiddleware.verifyToken,
    mahasiswaController.updatePassword
);

// Rute untuk update foto profil visual
router.put(
    '/update-photo',
    authMiddleware.verifyToken,
    mahasiswaController.updateProfilePhoto
);

module.exports = router;