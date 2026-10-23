const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');
const Appointment = require('../models/Appointment');

// @desc    Get dashboard metrics and conflict statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getAdminStats = async (req, res, next) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalRooms,
      totalAppointments,
      pendingCount,
      approvedCount,
      completedCount,
      cancelledCount,
      rejectedCount
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      Doctor.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'Pending' }),
      Appointment.countDocuments({ status: 'Approved' }),
      Appointment.countDocuments({ status: 'Completed' }),
      Appointment.countDocuments({ status: 'Cancelled' }),
      Appointment.countDocuments({ status: 'Rejected' })
    ]);

    const stats = {
      totalPatients,
      totalDoctors,
      totalRooms,
      totalAppointments,
      pendingCount,
      approvedCount,
      completedCount,
      cancelledCount,
      rejectedCount
    };

    res.status(200).json({
      success: true,
      stats,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all rooms
// @route   GET /api/admin/rooms
// @access  Private (Admin)
exports.getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms
    });
  } catch (error) {
    next(error);
  }
};
