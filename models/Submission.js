const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    selectedIndex: {
      type: Number,
      default: -1,
    },

    selectedIndices: {
      type: [Number],
      default: [],
    },

    textAnswer: {
      type: String,
      default: '',
      trim: true,
    },

    marksAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // LIVE EXAM STATE
    status: {
      type: String,
      enum: ["in_progress", "submitted", "auto_submitted"],
      default: "in_progress",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: {
      type: Date,
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    // ANSWERS
    answers: [AnswerSchema],

    // PAPER SET
    paperSet: {
      type: Number,
      required: true,
    },

    // RESULT
    score: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    // MONITORING
    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    // SYNC METADATA
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    reconnectCount: {
      type: Number,
      default: 0,
    },
    
    cheat: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

SubmissionSchema.index(
  { examId: 1, studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'Submission',
  SubmissionSchema
);