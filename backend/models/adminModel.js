const pool = require('../config/db');

const getAdminByUsername = async (username) => {
  const result = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);
  return result.rows[0];
};

module.exports = {
  getAdminByUsername
};
