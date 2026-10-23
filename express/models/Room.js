const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true
    },
    supportedSpecialties: {
      type: [String],
      default: []
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

roomSchema.index({ supportedSpecialties: 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
