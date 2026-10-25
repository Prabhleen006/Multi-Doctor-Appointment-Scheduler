const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient reference is required'],
      index: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Consultation room reference is required'],
      index: true
    },
    date: {
      type: String,
      required: [true, 'Date string (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time (HH:mm) is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be formatted as HH:mm']
    },
    endTime: {
      type: String,
      required: [true, 'End time (HH:mm) is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be formatted as HH:mm']
    },
    duration: {
      type: Number,
      required: true,
      default: 30,
      min: [15, 'Minimum appointment duration is 15 minutes'],
      max: [120, 'Maximum appointment duration is 120 minutes']
    },
    startDateTime: {
      type: Date,
      required: true,
      index: true
    },
    endDateTime: {
      type: Date,
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Reason for consultation is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Completed', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal performance in conflict checking
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ room: 1, date: 1, status: 1 });
appointmentSchema.index({ startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
