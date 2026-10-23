const express = require('express');
const router = express.Router();
const { getAdminStats, getAllRooms } = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/rooms', getAllRooms);

module.exports = router;
