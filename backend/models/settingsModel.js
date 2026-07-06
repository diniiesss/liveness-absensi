const pool = require('../config/db');

const getSettings = async () => {
  try {
    const result = await pool.query('SELECT * FROM admin_settings WHERE id = 1');
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

const updateSettings = async ({ jam_mulai, jam_selesai, toleransi, lokasi }) => {
  try {
    await pool.query(
      `UPDATE admin_settings
       SET jam_mulai = $1, jam_selesai = $2, toleransi = $3, lokasi = $4
       WHERE id = 1`,
      [jam_mulai, jam_selesai, toleransi, JSON.stringify(lokasi)]  // stringify lokasi jadi JSON string
    );
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};
