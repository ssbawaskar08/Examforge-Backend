const mongoose = require('mongoose');

const ProctoringEventSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'tab_switch',
        'fullscreen_exit',
        'window_blur',
        'context_menu',
        'devtools_open',
        'copy_attempt',
        'exam_start',
        'exam_submit',
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // Using our own timestamp field
  }
);

ProctoringEventSchema.index({ examId: 1, studentId: 1, timestamp: -1 });
ProctoringEventSchema.index({ examId: 1, type: 1 });

module.exports = mongoose.model('ProctoringEvent', ProctoringEventSchema);
