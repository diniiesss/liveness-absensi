// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const cron = require('node-cron');
const pool = require('./config/db'); 
const mahasiswaController = require('./controllers/mahasiswaController');

// Impor dayjs dan pluginnya
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

// --- Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =========================================================================
// 🕒 ENGINE CRON JOB MULTI-ADMIN (BERJALAN TIAP 1 MENIT SECARA KONSTAN)
// =========================================================================
cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toLocaleString()}] Mesin cron otomatis memeriksa seluruh sesi kuliah admin...`);
    try {
        // Memanggil fungsi multi-admin yang bertugas menyeleksi matkul secara adil
        await mahasiswaController.markAbsentStudentsDaily();
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] Error pada mesin cron multi-admin:`, error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

// 🔥 DUMMY FUNCTION SINKRONISASI FRONTEND-ROUTER
// Kita biarkan fungsi ini tetap ada sebagai formalitas agar file "adminRoutes.js" kamu
// tidak mengalami crash/break saat memanggil fungsi callback ini.
const setupAbsentMarkingScheduler = () => {
    console.log('🔄 Sesi diperbarui oleh admin, sistem mesin cron otomatis menyerap perubahan via database.');
};

// --- Penggunaan Rute API ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/mahasiswa', require('./routes/mahasiswaRoutes'));

// Endpoint Cron Trigger untuk dipanggil secara eksternal (misal lewat cron-job.org)
app.get('/api/cron-trigger', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log(`[${new Date().toLocaleString()}] Menjalankan cron job absensi via trigger API...`);
    try {
        await mahasiswaController.markAbsentStudentsDaily();
        res.status(200).json({ success: true, message: 'Cron job executed successfully' });
    } catch (error) {
        console.error('Error pada cron trigger:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Aman digunakan! inject dummy function agar adminRoutes tidak broken
app.use('/api/admin', require('./routes/adminRoutes')(setupAbsentMarkingScheduler));

// --- Mulai Server (Hanya jika dijalankan secara lokal) ---
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
}

module.exports = app;