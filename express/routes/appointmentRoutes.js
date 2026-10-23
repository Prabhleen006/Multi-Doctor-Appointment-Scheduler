const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment
} = require('../controllers/appointmentController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate); // All appointment routes require authentication

router.post('/', authorize('patient', 'admin'), createAppointment);
router.get('/my', getMyAppointments);
router.get('/:id', getAppointmentById);
router.patch('/:id/status', authorize('doctor', 'admin'), updateAppointmentStatus);
router.patch('/:id/cancel', cancelAppointment);
router.patch('/:id/reschedule', authorize('patient', 'admin'), rescheduleAppointment);

module.exports = router;
