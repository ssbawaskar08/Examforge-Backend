const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
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

    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },

    score: {
      type: Number,
      default: 0,
    },

    totalMarks: {
      type: Number,
      default: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    wrongAnswers: {
      type: Number,
      default: 0,
    },

    unanswered: {
      type: Number,
      default: 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["submitted", "auto_submitted"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  },
);

ResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Result", ResultSchema);
