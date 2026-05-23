const { validationResult } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const ProctoringEvent = require('../models/ProctoringEvent');
const Student = require('../models/Student');
const { getShuffleMap, unshuffleIndex, generateAccessCode } = require('../utils/shuffle');
const { autoUpdateStatus, stripCorrectIndex, validateQuestions } = require('../helpers');
const { sendExamNotifications } = require('../utils/mailer');





const createExam = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const {
      title, description, duration, scheduledStart, scheduledEnd, latestJoinTime,
      questions, assignedStudents, shuffleOptions, showResultAfterSubmit,
      totalMarks, rules, status
    } = req.body;
    console.log(req.body)

    if (questions && questions.length > 0) {
      const err = validateQuestions(questions);
      if (err) return res.status(400).json({ message: err });
    }

    const exam = await Exam.create({
      title,
      description,
      duration,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      latestJoinTime: latestJoinTime ? new Date(latestJoinTime) : undefined,
      assignedStudents: assignedStudents || [],
      shuffleOptions: shuffleOptions !== undefined ? shuffleOptions : true,
      showResultAfterSubmit: showResultAfterSubmit !== undefined ? showResultAfterSubmit : false,
      totalMarks: totalMarks !== undefined ? Number(totalMarks) : 0,
      rules: Array.isArray(rules) ? rules.filter((r) => r && r.trim()) : [],
      createdBy: req.user.id,
      status: status,
      accessCode: generateAccessCode(),
    });

    let savedQuestions = [];
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map(q => ({ ...q, examId: exam._id }));
      const inserted = await Question.insertMany(questionsToInsert);
      savedQuestions = inserted;
    }

    // ── Send notifications if exam is immediately live or scheduled ─────────
    if (['live', 'scheduled'].includes(exam.status) && exam.assignedStudents.length > 0) {
      try {
        const students = await Student.find(
          { _id: { $in: exam.assignedStudents } },
          'name email'
        ).lean();

        const teacher = await require('../models/Teacher').findById(exam.createdBy, 'name').lean();

        sendExamNotifications({
          exam: {
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            totalMarks: exam.totalMarks,
            scheduledStart: exam.scheduledStart,
            scheduledEnd: exam.scheduledEnd,
            latestJoinTime: exam.latestJoinTime,
            rules: exam.rules,
            accessCode: exam.accessCode,
            status: exam.status,
          },
          students,
          teacherName: teacher?.name ?? 'Your Teacher',
        }).catch((err) => console.error('[createExam] Email notification error:', err.message));
      } catch (notifErr) {
        console.error('[createExam] Failed to prepare email notifications:', notifErr.message);
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const examObj = exam.toObject();
    examObj.questions = savedQuestions;
    res.status(201).json(examObj);
  } catch (err) {
    next(err);
  }
};


const listExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ createdBy: req.user.id })
      .populate('assignedStudents', 'name email rollNumber')
      .sort({ createdAt: -1 })
      .lean();

    const updated = await Promise.all(
      exams.map(async (exam) => {
        const doc = await Exam.findById(exam._id);
        const questions = await Question.find({ examId: doc._id });
        const updatedDoc = await autoUpdateStatus(doc);
        const obj = updatedDoc.toObject();
        obj.questions = questions;
        return obj;
      })
    );

    const result = updated.map((e) => ({
      ...e,
      questions: stripCorrectIndex(e.questions || []),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};


const getExam = async (req, res, next) => {
  try {
    let exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('assignedStudents', 'name email rollNumber department year');

    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    exam = await autoUpdateStatus(exam);
    const questions = await Question.find({ examId: exam._id });

    const examObj = exam.toObject();
    examObj.questions = stripCorrectIndex(questions || []);

    res.json(examObj);
  } catch (err) {
    next(err);
  }
};


const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft exams can be edited.' });
    }

    const {
      title, description, duration, scheduledStart, scheduledEnd, latestJoinTime,
      questions, assignedStudents, shuffleOptions, showResultAfterSubmit,
      totalMarks, rules,
    } = req.body;

    if (questions !== undefined && questions.length > 0) {
      const err = validateQuestions(questions);
      if (err) return res.status(400).json({ message: err });
    }

    if (title !== undefined) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration !== undefined) exam.duration = duration;
    if (scheduledStart !== undefined) exam.scheduledStart = scheduledStart ? new Date(scheduledStart) : undefined;
    if (scheduledEnd !== undefined) exam.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : undefined;
    if (latestJoinTime !== undefined) exam.latestJoinTime = latestJoinTime ? new Date(latestJoinTime) : undefined;
    
    let savedQuestions = [];
    if (questions !== undefined) {
      await Question.deleteMany({ examId: exam._id });
      if (questions.length > 0) {
        const questionsToInsert = questions.map(q => ({ ...q, examId: exam._id }));
        const inserted = await Question.insertMany(questionsToInsert);
        savedQuestions = inserted;
      }
    } else {
      savedQuestions = await Question.find({ examId: exam._id });
    }

    if (assignedStudents !== undefined) exam.assignedStudents = assignedStudents;
    if (shuffleOptions !== undefined) exam.shuffleOptions = shuffleOptions;
    if (showResultAfterSubmit !== undefined) exam.showResultAfterSubmit = showResultAfterSubmit;
    if (totalMarks !== undefined) exam.totalMarks = Number(totalMarks);
    if (rules !== undefined) exam.rules = Array.isArray(rules) ? rules.filter((r) => r && r.trim()) : [];
    if (req.body.status !== undefined) exam.status = req.body.status;

    await exam.save();

    const examObj = exam.toObject();
    examObj.questions = stripCorrectIndex(savedQuestions || []);
    res.json(examObj);
  } catch (err) {
    next(err);
  }
};


const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft exams can be deleted.' });
    }

    await Question.deleteMany({ examId: exam._id });
    await exam.deleteOne();
    res.json({ message: 'Exam deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/exams/:id/publish
 * Publish a draft exam (moves it to scheduled or live).
 */
const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (exam.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft exams can be published.' });
    }
    
    const questions = await Question.find({ examId: exam._id });
    if (questions.length === 0) {
      return res.status(400).json({ message: 'Cannot publish an exam with no questions.' });
    }

    const err = validateQuestions(questions.map((q) => q.toObject()));
    if (err) return res.status(400).json({ message: `Cannot publish: ${err}` });

    const now = new Date();
    exam.status = exam.scheduledStart && exam.scheduledStart > now ? 'scheduled' : 'live';

    await exam.save();

    // ── Send email notifications to assigned students ─────────────────────
    try {
      const studentIds = exam.assignedStudents.map((s) =>
        typeof s === 'object' ? s._id ?? s : s
      );

      const students = await Student.find(
        { _id: { $in: studentIds } },
        'name email'
      ).lean();

      const teacher = await require('../models/Teacher').findById(exam.createdBy, 'name').lean();

      // Fire-and-forget — don't let email failures block the response
      sendExamNotifications({
        exam: {
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          scheduledStart: exam.scheduledStart,
          scheduledEnd: exam.scheduledEnd,
          latestJoinTime: exam.latestJoinTime,
          rules: exam.rules,
          accessCode: exam.accessCode,
          status: exam.status,
        },
        students,
        teacherName: teacher?.name ?? 'Your Teacher',
      }).catch((err) => console.error('[publishExam] Email notification error:', err.message));
    } catch (notifErr) {
      console.error('[publishExam] Failed to prepare email notifications:', notifErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────

    res.json({ message: `Exam is now ${exam.status}.`, status: exam.status });
  } catch (err) {
    next(err);
  }
};


const endExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (!['live', 'scheduled'].includes(exam.status)) {
      return res.status(400).json({ message: 'Exam is not live or scheduled.' });
    }

    exam.status = 'ended';
    exam.scheduledEnd = new Date();
    await exam.save();

    res.json({ message: 'Exam ended successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/:id/results
 * Get all submissions for an exam, with per-student violation counts.
 */
const getExamResults = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const questionsCount = await Question.countDocuments({ examId: exam._id });
    const submissions = await Submission.find({ examId: exam._id })
      .populate('studentId', 'name email rollNumber department year')
      .sort({ submittedAt: -1 })
      .lean();

    const results = await Promise.all(
      submissions.map(async (sub) => {
        const violationCounts = await ProctoringEvent.aggregate([
          { $match: { examId: exam._id, studentId: sub.studentId._id } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]);

        const violations = {};
        let total = 0;
        violationCounts.forEach(({ _id, count }) => {
          violations[_id] = count;
          if (!['exam_start', 'exam_submit'].includes(_id)) total += count;
        });

        return { ...sub, violations, totalViolations: total };
      })
    );

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        status: exam.status,
        totalMarks: exam.totalMarks,
        rules: exam.rules,
        totalQuestions: questionsCount,
      },
      results,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Student Controllers ───────────────────────────────────────────────────────

/**
 * POST /api/exams/attempt/eligibility
 * Check if student is eligible to take the exam via access code.
 */
const checkEligibility = async (req, res, next) => {
  try {
    const { accessCode } = req.body;
    const studentId = req.user.id;

    if (!accessCode) {
      return res.status(400).json({ message: 'Access code is required.' });
    }

    const exam = await Exam.findOne({ accessCode: accessCode.toUpperCase() });
    if (!exam) return res.status(404).json({ message: 'Invalid access code. No exam found.' });

    await autoUpdateStatus(exam);

    if (exam.status === 'draft') return res.status(403).json({ message: 'This exam is not yet published.' });
    if (exam.status === 'scheduled') {
      return res.status(403).json({ message: 'Exam has not started yet.', scheduledStart: exam.scheduledStart });
    }
    if (exam.status === 'ended') return res.status(403).json({ message: 'This exam has ended.' });

    

    const isAssigned = exam.assignedStudents.some((s) => s.toString() === studentId);
    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this exam.' });
    }

    const existing = await Submission.findOne({ examId: exam._id, studentId });
    if (existing && existing.submittedAt) {
      return res.status(400).json({ message: 'You have already submitted this exam.' });
    }

    const questionsCount = await Question.countDocuments({ examId: exam._id });

    res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
        latestJoinTime: exam.latestJoinTime,
        shuffleOptions: exam.shuffleOptions,
        showResultAfterSubmit: exam.showResultAfterSubmit,
        totalMarks: exam.totalMarks,
        rules: exam.rules,
        totalQuestions: questionsCount,
      }
    });
  } catch (err) {
    next(err);
  }
};



/**
 * POST /api/exams/attempt/submit
 * Student submits their answers. MCQ is auto-graded; descriptive is marked pending.
 */
const submitExam = async (req, res, next) => {
  try {
    const { submissionId, answers, isAutoSubmitted } = req.body;
    const studentId = req.user.id;

    if (!submissionId) {
      return res.status(400).json({ message: 'Submission ID is required.' });
    }

    const submission = await Submission.findOne({ _id: submissionId, studentId });
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.submittedAt) {
      return res.status(400).json({ message: 'This exam has already been submitted.' });
    }

    const exam = await Exam.findById(submission.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    const questions = await Question.find({ examId: exam._id });

    if (answers && Array.isArray(answers)) submission.answers = answers;

    let score = 0;
    let totalPossibleMarks = 0;

    const gradedAnswers = questions.map((q, idx) => {
      const type = q.type || 'mcq';
      const questionMarks = q.marks || 1;
      totalPossibleMarks += questionMarks;

      const studentAnswer = submission.answers.find(
        (a) => a.questionId.toString() === q._id.toString()
      );

      if (type === 'mcq') {
        const shuffleMap = exam.shuffleOptions ? getShuffleMap(submission.seed, idx) : [0, 1, 2, 3];
        
        let isCorrect = false;
        let selectedOptions = [];
        let correctOptionsText = "";
        let studentOptionText = "";
        let originalIndices = [];
        let selectedShuffledIndices = [];

        if (q.correctOptions && q.correctOptions.length > 0) {
          selectedShuffledIndices = studentAnswer && Array.isArray(studentAnswer.selectedIndices)
            ? studentAnswer.selectedIndices
            : (studentAnswer && studentAnswer.selectedIndex !== -1 && studentAnswer.selectedIndex !== undefined ? [studentAnswer.selectedIndex] : []);
          
          originalIndices = selectedShuffledIndices.map(shIdx => shIdx >= 0 ? unshuffleIndex(shIdx, shuffleMap) : -1).filter(idx => idx >= 0);
          selectedOptions = originalIndices.map(origIdx => q.options[origIdx]).filter(Boolean);

          if (selectedOptions.length === q.correctOptions.length) {
            isCorrect = q.correctOptions.every(opt => selectedOptions.includes(opt)) &&
                        selectedOptions.every(opt => q.correctOptions.includes(opt));
          }
          correctOptionsText = q.correctOptions.join(", ");
          studentOptionText = selectedOptions.join(", ") || "Not answered";
        } else {
          const selectedShuffled = studentAnswer ? studentAnswer.selectedIndex : -1;
          const originalIndex = selectedShuffled >= 0 ? unshuffleIndex(selectedShuffled, shuffleMap) : -1;
          const selectedOption = originalIndex >= 0 ? q.options[originalIndex] : null;
          isCorrect = selectedOption === q.correctOption;
          
          if (selectedOption) selectedOptions.push(selectedOption);
          correctOptionsText = q.correctOption || "";
          studentOptionText = selectedOption || "Not answered";
          originalIndices = [originalIndex];
          selectedShuffledIndices = [selectedShuffled];
        }

        const awarded = isCorrect ? questionMarks : 0;
        if (isCorrect) score += awarded;
        if (studentAnswer) {
          studentAnswer.marksAwarded = awarded;
          if (selectedShuffledIndices.length > 0) {
            studentAnswer.selectedIndices = selectedShuffledIndices;
          }
        }

        return {
          questionId: q._id,
          questionText: q.text,
          type,
          marks: questionMarks,
          marksAwarded: awarded,
          selectedShuffledIndices,
          originalSelectedIndices: originalIndices,
          correctOption: correctOptionsText,
          studentOption: studentOptionText,
          isCorrect,
        };
      } else {
        // Descriptive — stored, pending manual grading
        const textAnswer = studentAnswer ? studentAnswer.textAnswer || '' : '';
        if (studentAnswer) studentAnswer.marksAwarded = 0;

        return {
          questionId: q._id,
          questionText: q.text,
          type,
          marks: questionMarks,
          marksAwarded: 0,
          textAnswer,
          isCorrect: null,
          gradingPending: true,
        };
      }
    });

    submission.score = score;
    submission.totalQuestions = questions.length;
    submission.percentage = totalPossibleMarks > 0 ? Math.round((score / totalPossibleMarks) * 100) : 0;
    submission.submittedAt = new Date();
    submission.isAutoSubmitted = isAutoSubmitted === true;

    await submission.save();

    const response = {
      message: 'Exam submitted successfully.',
      submittedAt: submission.submittedAt,
      isAutoSubmitted: submission.isAutoSubmitted,
    };

    if (exam.showResultAfterSubmit) {
      response.result = {
        score: submission.score,
        totalMarks: exam.totalMarks,
        totalQuestions: submission.totalQuestions,
        percentage: submission.percentage,
        gradedAnswers,
      };
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExam,
  listExams,
  getExam,
  updateExam,
  deleteExam,
  publishExam,
  endExam,
  getExamResults,
  checkEligibility,
  submitExam,
};
