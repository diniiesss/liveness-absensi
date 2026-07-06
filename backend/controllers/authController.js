const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.loginMahasiswa = async (req, res) => {
  const { npm, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM mahasiswa WHERE npm = $1', [npm]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign({ npm: user.npm, role: 'mahasiswa' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);
    const admin = result.rows[0];
    if (!admin) return res.status(404).json({ message: 'Admin tidak ditemukan' });

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign({ id: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
