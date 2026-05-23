const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    deviceInfo: {
      userAgent: String,
      platform: String,
      browser: String,
      ipAddress: String,
    },

    paperSet: {
  type: Number,
  min: 1,
  max: 8,
},

questionOrder: [Number],
optionOrders: {
  type: Map,
  of: [Number],
},

    status: {
      type: String,
      enum: ['active', 'submitted', 'left'],
      default: 'active',
    },

    reconnectCount: {
      type: Number,
      default: 0,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    cheat: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Attendance',
  attendanceSchema
);