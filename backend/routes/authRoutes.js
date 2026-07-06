const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login/mahasiswa', authController.loginMahasiswa);
router.post('/login/admin', authController.loginAdmin);

module.exports = router;
