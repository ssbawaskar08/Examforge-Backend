const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'descriptive'],
    default: 'mcq',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  marks: {
    type: Number,
    default: 1,
    min: [0, 'Marks cannot be negative'],
  },
  description: {
    type: String,
    trim: true,
  },
  // MCQ-only fields
  options: {
    type: [String],
    default: undefined, // not stored for descriptive
    validate: {
      validator: function (arr) {
        // Only validate if this is an MCQ question
        if (this.type === 'mcq') {
          return Array.isArray(arr) && arr.length === 4;
        }
        return true;
      },
      message: 'MCQ questions must have exactly 4 options',
    },
  },
  correctOption: {
    type: String,
    // Required only for MCQ; validated in route layer
  },
  correctOptions: {
    type: [String],
    default: undefined,
  },
  isMultiSelect: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Question', QuestionSchema);
