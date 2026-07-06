const pool = require('../config/db'); 

/**
 * Membuat entri mahasiswa baru di database.
 */
const createMahasiswa = async ({
    npm, nama, kelas, fakultas, jurusan, password_hash, face_descriptor, face_image
}) => {
    await pool.query(
        `INSERT INTO mahasiswa
         (npm, nama, kelas, fakultas, jurusan, password_hash, face_descriptor, face_image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [npm, nama, kelas, fakultas, jurusan, password_hash, face_descriptor, face_image]
    );
};

/**
 * Mengambil data mahasiswa berdasarkan Nomor Pokok Mahasiswa (NPM).
 */
const getMahasiswaByNPM = async (npm) => {
    const result = await pool.query('SELECT * FROM mahasiswa WHERE npm = $1', [npm]);
    return result.rows[0];
};

/**
 * Menyisipkan catatan absensi baru ke database.
 * FIXED: Menghapus kolom nama_matkul karena data nama_matkul diikat di tabel mata_kuliah.
 */
const insertAbsensi = async ({ npm, status, lokasi_lat, lokasi_lng, waktu, kode_matkul }) => {
    if (waktu) {
        // Digunakan untuk absensi otomatis 'Tidak Hadir' (Cron Job/System)
        await pool.query(
            `INSERT INTO absensi (npm, status, lokasi_lat, lokasi_lng, waktu_absen, kode_matkul)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [npm, status, lokasi_lat, lokasi_lng, waktu, kode_matkul]
        );
    } else {
        // Digunakan untuk absensi manual 'Hadir'/'Terlambat' (Mahasiswa Scan Wajah)
        await pool.query(
            `INSERT INTO absensi (npm, status, lokasi_lat, lokasi_lng, kode_matkul)
             VALUES ($1, $2, $3, $4, $5)`,
            [npm, status, lokasi_lat, lokasi_lng, kode_matkul]
        );
    }
};

/**
 * Mengambil riwayat absensi untuk mahasiswa tertentu.
 * FIXED: Menggunakan LEFT JOIN ke tabel mata_kuliah untuk mengambil nama_matkul secara relasional (Aman untuk Sidang Skripsi).
 */
const getRiwayatAbsensi = async (npm) => {
    const result = await pool.query(
        `SELECT 
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
         ORDER BY a.waktu_absen DESC`,
        [npm]
    );
    return result.rows;
};

/**
 * Mengambil semua data mahasiswa dasar.
 */
const getAllMahasiswa = async () => {
    try {
        const result = await pool.query('SELECT npm, nama, kelas, jurusan, fakultas FROM mahasiswa');
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching all mahasiswa:', error);
        throw error;
    }
};

/**
 * Mengambil semua NPM dan deskrittor wajah untuk deduplikasi.
 */
const getAllMahasiswaWithFaceDescriptors = async () => {
    try {
        const result = await pool.query('SELECT npm, face_descriptor FROM mahasiswa');
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching all mahasiswa with face descriptors:', error);
        throw error;
    }
};

/**
 * Memperbarui password_hash mahasiswa.
 */
const updateMahasiswaPassword = async (npm, newPasswordHash) => {
    try {
        const result = await pool.query(
            `UPDATE mahasiswa
             SET password_hash = $1
             WHERE npm = $2 RETURNING *`,
            [newPasswordHash, npm]
        );
        return result.rows[0];
    } catch (error) {
        console.error('❌ Error updating mahasiswa password:', error);
        throw error;
    }
};

module.exports = {
    createMahasiswa,
    getMahasiswaByNPM,
    insertAbsensi,
    getRiwayatAbsensi,
    getAllMahasiswa,
    getAllMahasiswaWithFaceDescriptors,
    updateMahasiswaPassword
};