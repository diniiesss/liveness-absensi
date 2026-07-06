const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

// ==========================
// 🔑 LOGIN ADMIN
// ==========================
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password harus diisi' });
  }

  try {
    const result = await pool.query('SELECT * FROM admin WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email tidak ditemukan' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password salah' });
    }

    const token = jwt.sign(
      { admin_id: admin.id, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Login berhasil',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat login' });
  }
};

// ==========================
// 🔐 PROFIL & KEAMANAN ADMIN
// ==========================
exports.getAdminProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email FROM admin WHERE id = $1', 
      [req.user.admin_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error getAdminProfile:', err);
    return res.status(500).json({ message: 'Gagal mengambil data profil' });
  }
};

exports.updateAdminPassword = async (req, res) => {
  const { newPassword } = req.body;

  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE admin SET password_hash = $1 WHERE id = $2 RETURNING id', 
      [hashed, req.user.admin_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Admin tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Kredensial berhasil diperbarui' });
  } catch (err) {
    console.error('❌ Error updateAdminPassword:', err);
    return res.status(500).json({ message: 'Gagal memperbarui keamanan' });
  }
};

// ==========================
// 📋 MANAJEMEN MAHASISWA
// ==========================
exports.getAllMahasiswa = async (req, res) => {
  try {
    const result = await pool.query('SELECT nama, npm, kelas, fakultas, jurusan, face_descriptor, is_active FROM mahasiswa ORDER BY kelas ASC, nama ASC');
    return res.json(result.rows);
  } catch (err) {
    console.error('❌ Error getAllMahasiswa:', err);
    return res.status(500).json({ message: 'Gagal mengambil data mahasiswa' });
  }
};

exports.updateMahasiswaStatus = async (req, res) => {
  const { npm } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query('UPDATE mahasiswa SET is_active = $1 WHERE npm = $2', [is_active, npm]);
    return res.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal update status' });
  }
};

exports.resetFaceDescriptor = async (req, res) => {
  const { npm } = req.params;
  try {
    await pool.query('UPDATE mahasiswa SET face_descriptor = NULL WHERE npm = $1', [npm]);
    return res.json({ success: true, message: 'Data wajah berhasil direset' });
  } catch (err) {
    console.error('❌ Reset face error:', err);
    return res.status(500).json({ message: 'Gagal reset biometrik' });
  }
};

exports.deleteMahasiswa = async (req, res) => {
  const { npm } = req.params;
  try {
    await pool.query('DELETE FROM mahasiswa WHERE npm = $1', [npm]);
    return res.json({ success: true, message: 'Mahasiswa berhasil dihapus' });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal menghapus mahasiswa' });
  }
};

exports.updateMahasiswa = async (req, res) => {
  const { npm_lama } = req.params;
  const { nama, npm, kelas, fakultas, jurusan, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE mahasiswa 
       SET nama = $1, npm = $2, kelas = $3, fakultas = $4, jurusan = $5, is_active = $6 
       WHERE npm = $7 RETURNING *`,
      [nama, npm, kelas, fakultas, jurusan, is_active, npm_lama]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
    }

    return res.json({ 
      success: true, 
      message: 'Data mahasiswa berhasil diperbarui', 
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('❌ Error updateMahasiswa:', err);
    return res.status(500).json({ message: 'Gagal memperbarui data mahasiswa' });
  }
};

// =========================================================================
// 📋 GET DAFTAR KEHADIRAN (MULTI-SESSION PER ADMIN)
// =========================================================================
exports.getDaftarKehadiran = async (req, res) => {
  try {
    const { kelas, jurusan, tanggal, sessionOnly } = req.query;

    let query = `
      SELECT
        a.id, a.waktu_absen, a.lokasi_lat, a.lokasi_lng, a.status, mk.nama_matkul, a.kode_matkul,
        m.nama AS nama_lengkap, m.npm, m.kelas, m.jurusan
      FROM absensi a
      LEFT JOIN mahasiswa m ON a.npm = m.npm
      LEFT JOIN mata_kuliah mk ON a.kode_matkul = mk.kode_matkul
    `;

    const queryParams = [];
    const conditions = [];

    if (sessionOnly === 'true') {
      const settingsRes = await pool.query('SELECT kode_matkul, hari_aktif FROM admin_settings WHERE admin_id = $1', [req.user.admin_id]);
      if (settingsRes.rows.length > 0) {
        const { kode_matkul, hari_aktif } = settingsRes.rows[0];
        conditions.push(`a.kode_matkul = $${queryParams.length + 1}`);
        queryParams.push(kode_matkul);
        conditions.push(`DATE(a.waktu_absen) = $${queryParams.length + 1}`);
        queryParams.push(dayjs(hari_aktif).format('YYYY-MM-DD'));
      } else {
        return res.json([]);
      }
    } 
    else {
      if (kelas) {
        conditions.push(`m.kelas ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${kelas}%`);
      }
      if (jurusan) {
        conditions.push(`m.jurusan ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${jurusan}%`);
      }
      if (tanggal) {
        conditions.push(`DATE(a.waktu_absen) = $${queryParams.length + 1}`);
        queryParams.push(tanggal);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.waktu_absen DESC`;
    const result = await pool.query(query, queryParams);

    const formatted = result.rows.map(row => ({
      nama: row.nama_lengkap || "Mahasiswa Tidak Terdaftar",
      npm: row.npm,
      kelas: row.kelas || "-",
      jurusan: row.jurusan || "-",
      mata_kuliah: row.nama_matkul,
      status: row.status,
      tanggal: dayjs(row.waktu_absen).tz('Asia/Jakarta').format('YYYY-MM-DD'),
      jam: dayjs(row.waktu_absen).tz('Asia/Jakarta').format('HH:mm:ss'),
      lokasi_lat: row.lokasi_lat,
      lokasi_lng: row.lokasi_lng
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('❌ Error getDaftarKehadiran:', err);
    return res.status(500).json({ message: 'Gagal mengambil data' });
  }
};

// =========================================================================
// 📊 GET DASHBOARD STATS (MULTI-SESSION PER ADMIN)
// =========================================================================
exports.getStats = async (req, res) => {
  try {
    const settingsRes = await pool.query('SELECT kode_matkul, hari_aktif FROM admin_settings WHERE admin_id = $1', [req.user.admin_id]);
    if (settingsRes.rows.length === 0) {
      return res.json({ hadirHariIni: 0, tidakHadirHariIni: 0, totalKehadiran: 0 });
    }

    const { kode_matkul, hari_aktif } = settingsRes.rows[0];
    const sessionDate = dayjs(hari_aktif).format('YYYY-MM-DD');

    const hadirRes = await pool.query(
      "SELECT COUNT(*) FROM absensi WHERE kode_matkul = $1 AND DATE(waktu_absen) = $2 AND (status = 'Hadir' OR status = 'Terlambat')",
      [kode_matkul, sessionDate]
    );

    const tidakHadirRes = await pool.query(
      "SELECT COUNT(*) FROM absensi WHERE kode_matkul = $1 AND DATE(waktu_absen) = $2 AND status = 'Tidak Hadir'",
      [kode_matkul, sessionDate]
    );

    const h = parseInt(hadirRes.rows[0].count);
    const th = parseInt(tidakHadirRes.rows[0].count);

    return res.json({ hadirHariIni: h, tidakHadirHariIni: th, totalKehadiran: h + th });
  } catch (err) {
    console.error('❌ Error getStats:', err);
    return res.status(500).json({ message: 'Gagal menghitung statistik' });
  }
};

// ==========================
// 🔧 RESET PASSWORD ADMIN (PUBLIK)
// ==========================
exports.resetPasswordAdmin = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await pool.query('UPDATE admin SET password_hash = $1 WHERE email = $2', [hashed, email]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Admin tidak ditemukan' });
    return res.json({ success: true, message: 'Password berhasil direset' });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    return res.status(500).json({ message: 'Gagal reset password' });
  }
};

// =========================================================================
// ⚙️ UPDATE SETTINGS (MULTI-SESSION PER ADMIN)
// =========================================================================
exports.updateSettings = async (req, res) => {
  const { kode_matkul, jam_masuk, jam_selesai, toleransi, hari_aktif, lokasi, radius, allowed_kelas } = req.body;
  try {
    const lokasiJson = JSON.stringify(lokasi);
    const validatedRadius = radius > 100 ? 100 : (radius || 50);
    const admin_id = req.user.admin_id; 

    const check = await pool.query('SELECT admin_id FROM admin_settings WHERE admin_id = $1', [admin_id]);
    
    let result;
    if (check.rowCount === 0) {
      result = await pool.query(
        `INSERT INTO admin_settings (admin_id, kode_matkul, jam_masuk, jam_selesai, toleransi, lokasi, hari_aktif, radius, allowed_kelas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [admin_id, kode_matkul, jam_masuk, jam_selesai, toleransi, lokasiJson, hari_aktif, validatedRadius, allowed_kelas]
      );
    } else {
      result = await pool.query(
        `UPDATE admin_settings 
         SET kode_matkul=$1, jam_masuk=$2, jam_selesai=$3, toleransi=$4, lokasi=$5, hari_aktif=$6, radius=$7, allowed_kelas=$8 
         WHERE admin_id=$9 RETURNING *`,
        [kode_matkul, jam_masuk, jam_selesai, toleransi, lokasiJson, hari_aktif, validatedRadius, allowed_kelas, admin_id]
      );
    }
    return res.status(200).json({ message: 'Berhasil diperbarui', settings: result.rows[0] });
  } catch (err) {
    console.error('❌ Update settings error:', err);
    return res.status(500).json({ message: 'Gagal update settings' });
  }
};

// =========================================================================
// ⚙️ GET SETTINGS (FIXED: AMAN UNTUK AMBIL DATA KOSONG TANPA TRIGER AXIOS CRASH)
// =========================================================================
exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM admin_settings WHERE admin_id = $1', [req.user.admin_id]);
    
    // 🔥 FIXED: Mengubah status 404 menjadi status 200 dengan nilai data null
    // Ini menghentikan Axios frontend agar tidak langsung mengira aplikasi sedang error/lost connection
    if (result.rows.length === 0) {
      return res.status(200).json(null);
    }
    
    const settings = result.rows[0];
    if (typeof settings.lokasi === 'string') settings.lokasi = JSON.parse(settings.lokasi);
    return res.json(settings);
  } catch (err) {
    console.error('❌ Get settings error:', err);
    return res.status(500).json({ message: 'Gagal load settings' });
  }
};

// =========================================================================
// 🗑️ DELETE SETTINGS (KHUSUS HAPUS SESI ADMIN YG LOGIN SAJA)
// =========================================================================
exports.deleteSettings = async (req, res) => {
    const adminId = req.user.admin_id;
    try {
        const result = await pool.query('DELETE FROM admin_settings WHERE admin_id = $1', [adminId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Tidak ada sesi aktif untuk dihapus.' });
        }
        
        return res.json({ success: true, message: 'Sesi berhasil dihentikan dan dihapus.' });
    } catch (err) {
        console.error('❌ Error deleteSettings:', err);
        return res.status(500).json({ message: 'Gagal menghentikan sesi.' });
    }
};