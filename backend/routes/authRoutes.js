const express = require('express');
const router = express.Router();
const mahasiswaController = require('../controllers/mahasiswaController');
const adminController = require('../controllers/adminController');

router.post('/login/mahasiswa', mahasiswaController.login);
router.post('/login/admin', adminController.loginAdmin);

module.exports = router;
