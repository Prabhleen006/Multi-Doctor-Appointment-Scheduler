const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getDoctorById,
  getDoctorAvailability,
  getNextAvailableSlot
} = require('../controllers/doctorController');

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/availability', getDoctorAvailability);
router.get('/:id/next-available', getNextAvailableSlot);

module.exports = router;
