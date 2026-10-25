const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Room = require('../models/Room');

const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

const SchedulerService = {
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },

  minutesToTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  },

  format12Hour(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  },

  hasConflict(newStart, newEnd, existingStart, existingEnd) {
    return newStart < existingEnd && newEnd > existingStart;
  },

  /**
   * Constructs ISO Date instant from date string (YYYY-MM-DD) and time string (HH:mm)
   */
  createDateTimeInstant(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00.000Z`);
  },

  /**
   * Validates whether requested slot is within doctor's working schedule
   */
  isWithinDoctorWorkingHours(doctor, dateStr, startTimeStr, endTimeStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC'
    });

    if (!doctor.workingDays || !doctor.workingDays.includes(dayOfWeek)) {
      return {
        valid: false,
        reason: `${doctor.name} does not consult on ${dayOfWeek}s. Working days: ${doctor.workingDays.join(', ')}.`
      };
    }

    const startMin = this.timeToMinutes(startTimeStr);
    const endMin = this.timeToMinutes(endTimeStr);
    const doctorStartMin = this.timeToMinutes(doctor.workingStartTime || '09:00');
    const doctorEndMin = this.timeToMinutes(doctor.workingEndTime || '17:00');

    if (startMin < doctorStartMin || endMin > doctorEndMin) {
      return {
        valid: false,
        reason: `Requested time (${startTimeStr} - ${endTimeStr}) is outside ${doctor.name}'s consultation hours (${doctor.workingStartTime} - ${doctor.workingEndTime}).`
      };
    }

    return { valid: true, dayOfWeek };
  },

  /**
   * Checks doctor availability for a time interval
   */
  async checkDoctorAvailability(doctorId, startDateTime, endDateTime, excludeAppointmentId = null) {
    const activeStatuses = ['Pending', 'Approved'];
    const filter = {
      doctor: doctorId,
      status: { $in: activeStatuses },
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime }
    };
    if (excludeAppointmentId) {
      filter._id = { $ne: excludeAppointmentId };
    }

    const conflictingAppt = await Appointment.findOne(filter).populate('patient', 'name email');
    return {
      available: !conflictingAppt,
      conflictingAppt
    };
  },

  /**
   * Finds an available compatible room for a doctor and time interval.
   * Priority:
   * 1. Doctor's assigned room (if active, compatible, and unoccupied).
   * 2. Any active room that supports the doctor's specialty (ordered by roomNumber).
   */
  async findAvailableCompatibleRoom(doctor, startDateTime, endDateTime, excludeAppointmentId = null) {
    const activeStatuses = ['Pending', 'Approved'];
    const conflictBase = {
      status: { $in: activeStatuses },
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime }
    };
    if (excludeAppointmentId) {
      conflictBase._id = { $ne: excludeAppointmentId };
    }

    // Query candidate rooms supporting doctor's specialty (active only)
    const assignedId = String(doctor.assignedRoom?._id || doctor.assignedRoom || '');
    const candidateRooms = await Room.find({
      isActive: true,
      supportedSpecialties: doctor.specialty
    }).sort({ roomNumber: 1 });

    if (candidateRooms.length === 0) {
      return null;
    }

    // Try doctor's assigned room first if it supports this specialty
    const defaultRoom = candidateRooms.find(r => String(r._id) === assignedId);
    if (defaultRoom) {
      const isOccupied = await Appointment.findOne({
        ...conflictBase,
        room: defaultRoom._id
      });
      if (!isOccupied) {
        return { room: defaultRoom, isDefaultRoom: true };
      }
    }

    // Assigned room is occupied or not compatible; allocate the first available compatible room
    for (const room of candidateRooms) {
      if (defaultRoom && String(room._id) === String(defaultRoom._id)) continue;

      const isOccupied = await Appointment.findOne({
        ...conflictBase,
        room: room._id
      });

      if (!isOccupied) {
        return { room, isDefaultRoom: false };
      }
    }

    return null; // All compatible rooms occupied
  },

  /**
   * Dual-Resource Conflict Check
   */
  async checkDualResourceConflicts(doctorId, roomId, startDateTime, endDateTime, excludeAppointmentId = null) {
    const activeStatuses = ['Pending', 'Approved'];

    const baseFilter = {
      status: { $in: activeStatuses },
      startDateTime: { $lt: endDateTime },
      endDateTime: { $gt: startDateTime }
    };

    if (excludeAppointmentId) {
      baseFilter._id = { $ne: excludeAppointmentId };
    }

    const [doctorConflict, roomConflict] = await Promise.all([
      Appointment.findOne({ ...baseFilter, doctor: doctorId }).populate('patient', 'name email'),
      Appointment.findOne({ ...baseFilter, room: roomId }).populate('doctor', 'name specialty')
    ]);

    const hasConflict = Boolean(doctorConflict || roomConflict);
    let reason = 'Doctor and consultation room are both available.';

    if (doctorConflict && roomConflict) {
      reason = 'Both doctor and assigned consultation room are unavailable during this time interval.';
    } else if (doctorConflict) {
      reason = 'Doctor is unavailable during this time interval.';
    } else if (roomConflict) {
      reason = 'The assigned consultation room is occupied during this time interval.';
    }

    return {
      available: !hasConflict,
      hasConflict,
      doctorConflict: Boolean(doctorConflict),
      roomConflict: Boolean(roomConflict),
      conflictingDoctorAppt: doctorConflict,
      conflictingRoomAppt: roomConflict,
      reason
    };
  },

  /**
   * Concurrency-Safe Appointment Reservation with Compatible Room Allocation
   */
  async createAppointmentSafely({
    patientId,
    doctorId,
    date,
    startTime,
    duration = 30,
    reason
  }) {
    // 1. Fetch and validate doctor
    const doctor = await Doctor.findById(doctorId).populate('assignedRoom');
    if (!doctor || !doctor.isActive) {
      const err = new Error('Selected doctor is inactive or not found.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Calculate end time and Date instants
    const startMin = this.timeToMinutes(startTime);
    const endMin = startMin + Number(duration);
    const endTime = this.minutesToTime(endMin);

    const startDateTime = this.createDateTimeInstant(date, startTime);
    const endDateTime = this.createDateTimeInstant(date, endTime);

    // 3. Verify appointment is strictly in future
    const now = new Date();
    if (startDateTime <= now) {
      const err = new Error('Appointment date and start time must be in the future.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Verify doctor working hours & working days
    const workingHoursCheck = this.isWithinDoctorWorkingHours(doctor, date, startTime, endTime);
    if (!workingHoursCheck.valid) {
      const err = new Error(workingHoursCheck.reason);
      err.statusCode = 400;
      throw err;
    }

    // 5. Check doctor availability
    const doctorCheck = await this.checkDoctorAvailability(doctor._id, startDateTime, endDateTime);
    if (!doctorCheck.available) {
      const err = new Error(`${doctor.name} is unavailable during this time interval.`);
      err.statusCode = 409;
      err.conflictDetails = { doctorConflict: true, roomConflict: false };
      throw err;
    }

    // 6. Automatically find an available compatible room
    const roomAllocation = await this.findAvailableCompatibleRoom(doctor, startDateTime, endDateTime);
    if (!roomAllocation) {
      const err = new Error(`The assigned consultation room is occupied during this time interval, and no compatible ${doctor.specialty} rooms are free.`);
      err.statusCode = 409;
      err.conflictDetails = { doctorConflict: false, roomConflict: true };
      throw err;
    }

    const allocatedRoom = roomAllocation.room;

    // 7. Concurrency-Safe Check & Insert
    let session = null;
    let isTransactionActive = false;

    try {
      const topology = mongoose.connection?.client?.topology?.description;
      const isReplicaOrSharded = topology && (topology.type === 'ReplicaSetWithPrimary' || topology.type === 'Sharded');
      if (isReplicaOrSharded) {
        session = await mongoose.startSession();
        session.startTransaction();
        isTransactionActive = true;
      }
    } catch (e) {
      session = null;
      isTransactionActive = false;
    }

    try {
      const appointmentData = {
        patient: patientId,
        doctor: doctor._id,
        room: allocatedRoom._id,
        date,
        startTime,
        endTime,
        duration: Number(duration),
        startDateTime,
        endDateTime,
        reason,
        status: 'Pending'
      };

      const createOpts = session ? { session } : {};
      const [newAppointment] = await Appointment.create([appointmentData], createOpts);

      // Post-insert concurrency collision verification (prevents simultaneous race condition on standalone DB)
      const collisionQuery = Appointment.find({
        _id: { $ne: newAppointment._id },
        status: { $in: ['Pending', 'Approved'] },
        startDateTime: { $lt: endDateTime },
        endDateTime: { $gt: startDateTime },
        $or: [{ doctor: doctor._id }, { room: allocatedRoom._id }]
      });
      if (session) collisionQuery.session(session);
      const postInsertCollisions = await collisionQuery;

      if (postInsertCollisions.length > 0) {
        // Race condition detected! Roll back immediately
        const delQuery = Appointment.findByIdAndDelete(newAppointment._id);
        if (session) delQuery.session(session);
        await delQuery;
        const err = new Error('Simultaneous booking conflict detected. The requested slot was just reserved by another patient.');
        err.statusCode = 409;
        throw err;
      }

      if (isTransactionActive && session) {
        await session.commitTransaction();
      }

      return await Appointment.findById(newAppointment._id)
        .populate('patient', 'name email phone')
        .populate({
          path: 'doctor',
          select: 'name email specialty phone assignedRoom',
          populate: { path: 'assignedRoom', select: 'roomNumber type' }
        })
        .populate('room', 'roomNumber type supportedSpecialties');
    } catch (error) {
      if (isTransactionActive && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  },

  /**
   * Suggests the earliest available slot for doctor + compatible room across 7 days
   */
  async suggestNextAvailableSlot(doctorId, startDateStr, duration = 30, daysToSearch = 7) {
    const doctor = await Doctor.findById(doctorId).populate('assignedRoom');
    if (!doctor || !doctor.isActive) {
      return null;
    }

    const startWorkMin = this.timeToMinutes(doctor.workingStartTime || '09:00');
    const endWorkMin = this.timeToMinutes(doctor.workingEndTime || '17:00');
    const durationMin = Number(duration) || 30;

    let currentDate = new Date(startDateStr + 'T00:00:00.000Z');
    const now = new Date();

    for (let dayOffset = 0; dayOffset < daysToSearch; dayOffset++) {
      const dateIso = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

      if (doctor.workingDays.includes(dayOfWeek)) {
        for (let currentSlotMin = startWorkMin; currentSlotMin + durationMin <= endWorkMin; currentSlotMin += 30) {
          const slotStartStr = this.minutesToTime(currentSlotMin);
          const slotEndStr = this.minutesToTime(currentSlotMin + durationMin);

          const slotStartDateTime = this.createDateTimeInstant(dateIso, slotStartStr);
          const slotEndDateTime = this.createDateTimeInstant(dateIso, slotEndStr);

          // Skip slots in the past
          if (slotStartDateTime <= now) {
            continue;
          }

          // Check doctor availability
          const docAvailability = await this.checkDoctorAvailability(doctor._id, slotStartDateTime, slotEndDateTime);
          if (!docAvailability.available) {
            continue;
          }

          // Check compatible room availability
          const roomAllocation = await this.findAvailableCompatibleRoom(doctor, slotStartDateTime, slotEndDateTime);
          if (roomAllocation) {
            return {
              date: dateIso,
              dayOfWeek,
              startTime: slotStartStr,
              endTime: slotEndStr,
              formattedStart: this.format12Hour(slotStartStr),
              formattedEnd: this.format12Hour(slotEndStr),
              duration: durationMin,
              timezone: CLINIC_TIMEZONE,
              doctor: {
                id: doctor._id,
                name: doctor.name,
                specialty: doctor.specialty
              },
              room: {
                id: roomAllocation.room._id,
                roomNumber: roomAllocation.room.roomNumber,
                type: roomAllocation.room.type,
                isDefaultRoom: roomAllocation.isDefaultRoom
              }
            };
          }
        }
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return null;
  }
};

module.exports = SchedulerService;
