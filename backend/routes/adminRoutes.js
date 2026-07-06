// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware'); 

// ---------------------------
// 🔹 Route Publik
// ---------------------------
router.post('/login', adminController.loginAdmin);
router.post('/reset-password', adminController.resetPasswordAdmin);

// ---------------------------
// 🔹 Route yang Dilindungi (Perlu Token Admin)
// ---------------------------
module.exports = (setupAbsentMarkingSchedulerCallback) => {
 
  // [STATS & MONITORING]
  router.get('/stats', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getStats);
  router.get('/kehadiran', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getDaftarKehadiran);

  // [MANAJEMEN MAHASISWA]
  router.get('/mahasiswa', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getAllMahasiswa);
  router.patch('/mahasiswa/status/:npm', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.updateMahasiswaStatus);
  router.put('/mahasiswa/reset-face/:npm', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.resetFaceDescriptor);
  router.delete('/mahasiswa/:npm', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.deleteMahasiswa);
  router.put('/mahasiswa/:npm_lama', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.updateMahasiswa);

  // [PROFIL & KEAMANAN ADMIN]
  router.get('/profile', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getAdminProfile);
  router.put('/update-password', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.updateAdminPassword);

  // [PENGATURAN SISTEM (SETTINGS)]
  router.get('/settings', authMiddleware.verifyToken, authMiddleware.isAdmin, adminController.getSettings);
  
  router.put('/settings', authMiddleware.verifyToken, authMiddleware.isAdmin, async (req, res) => {
      try {
        await adminController.updateSettings(req, res);
        if (typeof setupAbsentMarkingSchedulerCallback === 'function') {
          await setupAbsentMarkingSchedulerCallback();
        }
      } catch (error) {
        console.error('❌ Error di rute settings:', error);
        if (!res.headersSent) return res.status(500).json({ message: 'Terjadi kesalahan server.' });
      }
  });

  // [PENGATURAN DELETE & RESET SESI ABSENSI]
  router.delete(
    '/settings', 
    authMiddleware.verifyToken, 
    authMiddleware.isAdmin, 
    adminController.deleteSettings
  );

  return router;
};