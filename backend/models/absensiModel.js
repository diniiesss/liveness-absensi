const pool = require('../config/db');

/**
 * Menyisipkan catatan absensi baru ke database.
 * Diperbarui agar mendukung input 'waktu' manual untuk keperluan Cron Job (Otomatis Alpa).
 */
const insertAbsensi = async ({ npm, status, lokasi_lat, lokasi_lng, waktu }) => {
  if (waktu) {
    // Jika parameter 'waktu' dikirim (biasanya oleh Cron Job otomatis)
    await pool.query(
      `INSERT INTO absensi (npm, status, lokasi_lat, lokasi_lng, waktu_absen)
       VALUES ($1, $2, $3, $4, $5)`,
      [npm, status, lokasi_lat, lokasi_lng, waktu]
    );
  } else {
    // Jika tidak ada 'waktu' (Mahasiswa absen manual, biarkan DB memakai DEFAULT CURRENT_TIMESTAMP)
    await pool.query(
      `INSERT INTO absensi (npm, status, lokasi_lat, lokasi_lng)
       VALUES ($1, $2, $3, $4)`,
      [npm, status, lokasi_lat, lokasi_lng]
    );
  }
};

const getAbsensiByNPM = async (npm) => {
  const result = await pool.query(
    `SELECT * FROM absensi WHERE npm = $1 ORDER BY waktu_absen DESC`,
    [npm]
  );
  return result.rows;
};

const getAllAbsensi = async () => {
  const result = await pool.query(`SELECT * FROM absensi ORDER BY waktu_absen DESC`);
  return result.rows;
};

module.exports = {
  insertAbsensi,
  getAbsensiByNPM,
  getAllAbsensi
};