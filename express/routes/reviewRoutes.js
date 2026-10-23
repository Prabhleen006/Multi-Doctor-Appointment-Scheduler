const express = require('express');
const router = express.Router();
const { getReviews, createReview } = require('../controllers/reviewController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get('/', getReviews);
router.post('/', authenticate, authorize('patient'), createReview);

module.exports = router;
