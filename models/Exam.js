const mongoose = require('mongoose');
const { generateAccessCode } = require('../utils/shuffle');

const ExamSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: [0, 'Total marks cannot be negative'],
    },
    rules: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },

    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    scheduledStart: {
      type: Date,
    },
    scheduledEnd: {
      type: Date,
    },
    latestJoinTime: {
      type: Date,
    },
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    shuffleOptions: {
      type: Boolean,
      default: true,
    },
    showResultAfterSubmit: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'ended'],
      default: 'draft',
    },
    accessCode: {
      type: String,
      default: generateAccessCode,
      uppercase: true,
      length: 6,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup by access code
ExamSchema.index({ accessCode: 1 });
ExamSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('Exam', ExamSchema);
