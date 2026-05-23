const mongoose = require('mongoose');
const { generateAccessCode } = require('../utils/shuffle');

const PollOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
    },
    votes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const PollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    options: {
      type: [PollOptionSchema],
      validate: {
        validator: (arr) => arr.length >= 2 && arr.length <= 6,
        message: 'Poll must have between 2 and 6 options',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    accessCode: {
      type: String,
      default: generateAccessCode,
      uppercase: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PollSchema.index({ accessCode: 1 });
PollSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Poll', PollSchema);
