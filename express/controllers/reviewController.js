const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

// @desc    Get verified reviews (optional doctor filter)
// @route   GET /api/reviews?doctorId=...
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const { doctorId } = req.query;
    const filter = {};

    if (doctorId && doctorId !== 'All') {
      filter.doctor = doctorId;
    }

    const reviews = await Review.find(filter)
      .populate('patient', 'name')
      .populate('doctor', 'name specialty')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : '0.0';

    res.status(200).json({
      success: true,
      count: totalReviews,
      averageRating: avgRating,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit verified review for completed appointment
// @route   POST /api/reviews
// @access  Private (Patient)
exports.createReview = async (req, res, next) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide appointmentId, rating, and review comment.'
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Verify patient ownership
    if (String(appointment.patient) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only submit reviews for your own appointments.'
      });
    }

    // Verify appointment status is Completed
    if (appointment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed consultations.'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ appointment: appointmentId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'A review has already been submitted for this consultation.'
      });
    }

    const review = await Review.create({
      appointment: appointmentId,
      patient: req.user._id,
      doctor: appointment.doctor,
      rating: Number(rating),
      comment: comment.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your verified patient review has been published.',
      data: review
    });
  } catch (error) {
    next(error);
  }
};
