const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Doctor email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    specialty: {
      type: String,
      required: [true, 'Specialty is required'],
      trim: true,
      index: true
    },
    experience: {
      type: Number,
      default: 0
    },
    bio: {
      type: String,
      default: ''
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    workingStartTime: {
      type: String,
      default: '09:00'
    },
    workingEndTime: {
      type: String,
      default: '17:00'
    },
    slotDuration: {
      type: Number,
      default: 30
    },
    assignedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Assigned consultation room is required'],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Doctor', doctorSchema);
