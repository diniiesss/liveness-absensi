const jwt = require('jsonwebtoken');

// Middleware untuk memverifikasi JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token tidak tersedia' });
    }

    // Jika header berformat 'Bearer tokenstring', ambil tokennya saja
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Menyimpan payload token di req.user
        next(); // Lanjutkan ke middleware atau handler berikutnya
    } catch (err) {
        // Jika token tidak valid (kadaluwarsa, salah, dll.)
        return res.status(401).json({ message: 'Token tidak valid' });
    }
};

// Middleware untuk memeriksa apakah pengguna adalah admin
// Middleware ini berasumsi req.user sudah ada dari verifyToken sebelumnya
const isAdmin = (req, res, next) => {
    // Pastikan req.user ada dan memiliki properti role
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Akses ditolak: Anda bukan administrator.' });
    }
    next(); // Lanjutkan jika pengguna adalah admin
};

// Ekspor kedua middleware sebagai properti dari sebuah objek
module.exports = {
    verifyToken,
    isAdmin
};