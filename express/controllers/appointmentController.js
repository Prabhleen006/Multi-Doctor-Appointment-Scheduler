const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const SchedulerService = require('../services/schedulerService');

// @desc    Book a new consultation (Dual-resource concurrency safe)
// @route   POST /api/appointments
// @access  Private (Patient, Admin)
exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, startTime, duration, reason } = req.body;

    if (!doctorId || !date || !startTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctorId, date, startTime, and reason for consultation.'
      });
    }

    // Patient identity strictly derived from authenticated session
    const patientId = req.user._id;

    const appointment = await SchedulerService.createAppointmentSafely({
      patientId,
      doctorId,
      date,
      startTime,
      duration: duration || 30,
      reason: reason.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request confirmed successfully! Consultation room has been allocated.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get appointments for the logged-in user
// @route   GET /api/appointments/my
// @access  Private
exports.getMyAppointments = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({
        $or: [{ user: req.user._id }, { email: req.user.email }]
      });

      if (!doctorProfile) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.doctor = doctorProfile._id;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (date) {
      query.date = date;
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'name email phone')
      .populate({
        path: 'doctor',
        select: 'name email specialty phone assignedRoom',
        populate: { path: 'assignedRoom', select: 'roomNumber type' }
      })
      .populate('room', 'roomNumber type')
      .sort({ startDateTime: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate({
        path: 'doctor',
        select: 'name email specialty phone user',
        populate: { path: 'assignedRoom', select: 'roomNumber type' }
      })
      .populate('room', 'roomNumber type');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Ownership check
    const isPatientOwner = String(appointment.patient._id) === String(req.user._id);
    const isDoctorOwner = String(appointment.doctor.user) === String(req.user._id) || appointment.doctor.email === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this appointment.'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment lifecycle status (Approve / Reject / Complete)
// @route   PATCH /api/appointments/:id/status
// @access  Private (Doctor, Admin)
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const allowedStatuses = ['Approved', 'Rejected', 'Completed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}.`
      });
    }

    const appointment = await Appointment.findById(req.params.id).populate('doctor');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Doctor ownership check
    if (req.user.role === 'doctor') {
      const isDoctorOwner = String(appointment.doctor.user) === String(req.user._id) || appointment.doctor.email === req.user.email;
      if (!isDoctorOwner) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You cannot modify another physician schedule.'
        });
      }
    }

    appointment.status = status;
    if (rejectionReason) {
      appointment.rejectionReason = rejectionReason.trim();
    }

    await appointment.save();

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'.`,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel appointment & release resource immediately
// @route   PATCH /api/appointments/:id/cancel
// @access  Private (Patient, Doctor, Admin)
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('doctor');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Ownership check
    const isPatientOwner = String(appointment.patient) === String(req.user._id);
    const isDoctorOwner = String(appointment.doctor.user) === String(req.user._id) || appointment.doctor.email === req.user.email;
    const isAdmin = req.user.role === 'admin';

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to cancel this appointment.'
      });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled.'
      });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed consultations cannot be cancelled.'
      });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully. Doctor and consultation room resources have been released.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule appointment with dual-resource validation
// @route   PATCH /api/appointments/:id/reschedule
// @access  Private (Patient, Admin)
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { date, startTime, duration } = req.body;

    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide new appointment date and startTime.'
      });
    }

    const appointment = await Appointment.findById(req.params.id).populate({
      path: 'doctor',
      populate: { path: 'assignedRoom' }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // Ownership check
    const isPatientOwner = String(appointment.patient) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isPatientOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the appointment owner or admin can reschedule.'
      });
    }

    if (appointment.status === 'Cancelled' || appointment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule an appointment that is already ${appointment.status.toLowerCase()}.`
      });
    }

    const newDuration = duration ? Number(duration) : appointment.duration;
    const startMin = SchedulerService.timeToMinutes(startTime);
    const endMin = startMin + newDuration;
    const endTime = SchedulerService.minutesToTime(endMin);

    const startDateTime = SchedulerService.createDateTimeInstant(date, startTime);
    const endDateTime = SchedulerService.createDateTimeInstant(date, endTime);

    const now = new Date();
    if (startDateTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'Rescheduled appointment date and start time must be in the future.'
      });
    }

    // Verify doctor working hours
    const workingHoursCheck = SchedulerService.isWithinDoctorWorkingHours(
      appointment.doctor,
      date,
      startTime,
      endTime
    );
    if (!workingHoursCheck.valid) {
      return res.status(400).json({
        success: false,
        message: workingHoursCheck.reason
      });
    }

    // Check doctor availability for the new time window
    const docCheck = await SchedulerService.checkDoctorAvailability(
      appointment.doctor._id,
      startDateTime,
      endDateTime,
      appointment._id
    );
    if (!docCheck.available) {
      return res.status(409).json({
        success: false,
        message: `${appointment.doctor.name} is unavailable during this time interval.`,
        conflictDetails: {
          doctorConflict: true,
          roomConflict: false
        }
      });
    }

    // Allocate an available compatible room (trying default room first)
    const roomAllocation = await SchedulerService.findAvailableCompatibleRoom(
      appointment.doctor,
      startDateTime,
      endDateTime,
      appointment._id
    );

    if (!roomAllocation) {
      return res.status(409).json({
        success: false,
        message: `No compatible consultation rooms are available for ${appointment.doctor.specialty} during this time interval.`,
        conflictDetails: {
          doctorConflict: false,
          roomConflict: true
        }
      });
    }

    appointment.room = roomAllocation.room._id;
    appointment.date = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.duration = newDuration;
    appointment.startDateTime = startDateTime;
    appointment.endDateTime = endDateTime;
    appointment.status = 'Pending'; // Set to Pending for doctor approval

    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully. Pending doctor confirmation.',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};
