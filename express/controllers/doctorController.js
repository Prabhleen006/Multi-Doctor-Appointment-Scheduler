const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const SchedulerService = require('../services/schedulerService');

// @desc    Get all active doctors (optional specialty filter)
// @route   GET /api/doctors
// @access  Public
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { specialty } = req.query;
    const filter = { isActive: true };

    if (specialty && specialty !== 'All') {
      filter.specialty = new RegExp(`^${specialty.trim()}$`, 'i');
    }

    const doctors = await Doctor.find(filter)
      .populate('assignedRoom', 'roomNumber type supportedSpecialties')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('assignedRoom', 'roomNumber type supportedSpecialties');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor's booked time intervals for a specific date or week
// @route   GET /api/doctors/:id/availability?date=YYYY-MM-DD
// @access  Public
exports.getDoctorAvailability = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    const doctor = await Doctor.findById(req.params.id).populate('assignedRoom');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    let dateFilter = {};
    if (date) {
      dateFilter = { date };
    } else if (startDate && endDate) {
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
    } else {
      const today = new Date().toISOString().split('T')[0];
      dateFilter = { date: today };
    }

    // Active appointments that occupy the doctor's calendar or assigned room
    const appointments = await Appointment.find({
      $or: [{ doctor: doctor._id }, { room: doctor.assignedRoom?._id }],
      ...dateFilter,
      status: { $in: ['Pending', 'Approved'] }
    }).select('date startTime endTime duration status doctor room');

    res.status(200).json({
      success: true,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        specialty: doctor.specialty,
        workingDays: doctor.workingDays,
        workingStartTime: doctor.workingStartTime,
        workingEndTime: doctor.workingEndTime,
        slotDuration: doctor.slotDuration,
        assignedRoom: doctor.assignedRoom
      },
      bookedSlots: appointments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suggest next available slot for selected doctor + assigned room
// @route   GET /api/doctors/:id/next-available
// @access  Public
exports.getNextAvailableSlot = async (req, res, next) => {
  try {
    const { startDate, duration } = req.query;
    const searchStartDate = startDate || new Date().toISOString().split('T')[0];
    const slotDuration = Number(duration) || 30;

    const slot = await SchedulerService.suggestNextAvailableSlot(
      req.params.id,
      searchStartDate,
      slotDuration,
      7
    );

    if (!slot) {
      return res.status(200).json({
        success: false,
        message: 'No available appointment slots found for this doctor within the next 7 days.',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      message: 'Next earliest available consultation slot found.',
      data: slot
    });
  } catch (error) {
    next(error);
  }
};
