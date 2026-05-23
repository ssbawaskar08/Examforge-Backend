const { autoUpdateStatus } = require("../helpers");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const Attendance = require("../models/attendance");
const Result = require("../models/result");
const { generateOrder } = require("../utils/shuffle");

const getExamDetails = async (req, res, next) => {
  try {
    const { accessCode } = req.body;
    const studentId = req.user.id;

    if (!accessCode) {
      return res.status(400).json({
        message: "Access code is required.",
      });
    }

    const exam = await Exam.findOne({
      accessCode: accessCode.toUpperCase(),
    });

    if (!exam) {
      return res.status(404).json({
        message: "Invalid access code. No exam found.",
      });
    }

    await autoUpdateStatus(exam);
    await exam.save();

    if (exam.status === "draft") {
      return res.status(403).json({
        message: "This exam is not yet published.",
      });
    }

    if (exam.status === "scheduled") {
      return res.status(403).json({
        message: "Exam has not started yet.",
        scheduledStart: exam.scheduledStart,
      });
    }

    if (exam.status === "ended") {
      return res.status(403).json({
        message: "This exam has ended.",
      });
    }

   

    const isAssigned = exam.assignedStudents.some(
      (s) => s.toString() === studentId,
    );

    if (!isAssigned) {
      return res.status(403).json({
        message: "You are not assigned to this exam.",
      });
    }

    const existingSubmission = await Submission.findOne({
      examId: exam._id,
      studentId,
    });

    if (existingSubmission?.submittedAt) {
      return res.status(400).json({
        message: "You have already submitted this exam.",
      });
    }

    return res.json({
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
        totalMarks: exam.totalMarks,
        rules: exam.rules,
        shuffleOptions: exam.shuffleOptions,
        showResultAfterSubmit: exam.showResultAfterSubmit,
      },
    });
  } catch (err) {
    next(err);
  }
};

const startExam = async (req, res, next) => {
  try {
    const { examId } = req.body;

    const studentId = req.user.id;

    // VALIDATION
    if (!examId) {
      return res.status(400).json({
        message: "Exam ID is required.",
      });
    }

    // FIND EXAM
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found.",
      });
    }

    // UPDATE STATUS
    await autoUpdateStatus(exam);

    await exam.save();

    // EXAM MUST BE LIVE
    if (exam.status !== "live") {
      return res.status(403).json({
        message: "Exam is not live.",
      });
    }

    // VERIFY STUDENT ASSIGNED
    const isAssigned = exam.assignedStudents.some(
      (s) => s.toString() === studentId,
    );

    if (!isAssigned) {
      return res.status(403).json({
        message: "You are not assigned to this exam.",
      });
    }

    // FETCH QUESTIONS
    let questions = await Question.find({
      examId,
    }).sort({ createdAt: 1 }).select(`
        text
        options
        marks
        type
        description
        isMultiSelect
      `);

    if (!questions.length) {
      return res.status(404).json({
        message: "No questions found.",
      });
    }

    // FIND ATTENDANCE
    let attendance = await Attendance.findOne({
      examId,
      studentId,
    });

    let paperSet;
    let questionOrder;
    let optionOrders;

    // FIRST START
    if (!attendance) {
      paperSet = Math.floor(Math.random() * 8) + 1;

      // QUESTION ORDER
      questionOrder = generateOrder(questions.length, paperSet);

      optionOrders = {};

      // OPTION ORDERS
      questions.forEach((q, index) => {
        // ONLY MCQ
        if (q.type === "mcq" && Array.isArray(q.options)) {
          optionOrders[q._id.toString()] = generateOrder(
            q.options.length,
            paperSet + index,
          );
        }
      });

      // CREATE ATTENDANCE
      attendance = await Attendance.create({
        examId,
        studentId,

        paperSet,
        questionOrder,
        optionOrders,

        deviceInfo: {
          userAgent: req.headers["user-agent"],

          ipAddress: req.ip,
        },
      });
    }

    // RECONNECT
    else {
      attendance.lastSeenAt = new Date();

      attendance.reconnectCount += 1;

      await attendance.save();

      paperSet = attendance.paperSet;

      questionOrder = attendance.questionOrder;

      optionOrders = attendance.optionOrders;
    }

    // APPLY QUESTION ORDER
    questions = questionOrder.map((index) => questions[index]);

    // APPLY OPTION SHUFFLE
    questions = questions.map((q) => {
      // DESCRIPTIVE
      if (q.type === "descriptive") {
        return q;
      }

      const order = optionOrders[q._id.toString()];

      const shuffledOptions = order.map((index) => q.options[index]);

      return {
        ...q.toObject(),

        options: shuffledOptions,
      };
    });

    // FIND SUBMISSION
    let submission = await Submission.findOne({
      examId,
      studentId,
    });

    // PREVENT RESTART
    if (
      submission?.status === "submitted" ||
      submission?.status === "auto_submitted"
    ) {
      return res.status(400).json({
        message: "Exam already submitted.",
      });
    }

    // CREATE SUBMISSION
    if (!submission) {
      submission = await Submission.create({
        examId,
        studentId,

        paperSet,

        startedAt: new Date(),

        status: "in_progress",

        currentQuestionIndex: 0,

        answers: [],

        ipAddress: req.ip,

        userAgent: req.headers["user-agent"],
      });
    }

    // TIMER
    const durationInSeconds = exam.duration * 60;

    const elapsed = Math.floor(
      (Date.now() - submission.startedAt.getTime()) / 1000,
    );

    const remainingTime = Math.max(durationInSeconds - elapsed, 0);

    // AUTO SUBMIT
    if (remainingTime <= 0) {
      submission.status = "auto_submitted";

      submission.submittedAt = new Date();

      await submission.save();

      return res.status(403).json({
        message: "Exam time expired.",
      });
    }

    // RESPONSE
    return res.json({
      exam: {
        _id: exam._id,

        title: exam.title,

        duration: exam.duration,
      },

      paperSet,

      startedAt: submission.startedAt,

      remainingTime,

      currentQuestionIndex: submission.currentQuestionIndex,

      savedAnswers: submission.answers,

      serverTime: Date.now(),

      questions,
    });
  } catch (err) {
    next(err);
  }
};

const heartbeat = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;
    const submission = await Submission.findOne({
      examId,
      studentId,
    });
    if (!submission) {
      return res.status(404).json({
        message: "Submission not found.",
      });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found.",
      });
    }

    const durationInSeconds = exam.duration * 60;

    const elapsed = Math.floor(
      (Date.now() - submission.startedAt.getTime()) / 1000,
    );

    const remainingTime = Math.max(durationInSeconds - elapsed, 0);

    if (remainingTime <= 0 && submission.status === "in_progress") {
      submission.status = "auto_submitted";
      submission.submittedAt = new Date();
      await submission.save();
    }

    await Attendance.updateOne(
      {
        examId,
        studentId,
      },
      {
        lastSeenAt: new Date(),
      },
    );

    return res.json({
      remainingTime,

      status: submission.status,

      currentQuestionIndex: submission.currentQuestionIndex,

      serverTime: Date.now(),
    });
  } catch (err) {
    next(err);
  }
};

const finalSubmit = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { examId, answers } = req.body;

    // VALIDATION
    if (!examId) {
      return res.status(400).json({
        message: "Exam ID is required.",
      });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "Answers array is required.",
      });
    }

    // FIND EXAM
    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found.",
      });
    }

    // FIND SUBMISSION
    const submission = await Submission.findOne({
      examId,
      studentId,
    });

    if (!submission) {
      return res.status(404).json({
        message: "Submission not found.",
      });
    }

    // PREVENT DOUBLE SUBMIT
    if (
      submission.status === "submitted" ||
      submission.status === "auto_submitted"
    ) {
      return res.status(400).json({
        message: "Exam already submitted.",
      });
    }

    // FIND ATTENDANCE
    const attendance = await Attendance.findOne({
      examId,
      studentId,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "Attendance not found.",
      });
    }

    // TIMER CHECK
    const durationInSeconds = exam.duration * 60;

    const elapsed = Math.floor(
      (Date.now() - submission.startedAt.getTime()) / 1000,
    );

    const remainingTime = Math.max(durationInSeconds - elapsed, 0);

    // FETCH QUESTIONS
    const questions = await Question.find({
      examId,
    }).select(
      `
        text
        options
        correctOption
        correctOptions
        isMultiSelect
        marks
        type
        description
        explanation
        `,
    );

    // QUESTION MAP
    const questionMap = {};

    questions.forEach((q) => {
      questionMap[q._id.toString()] = q;
    });

    // RESULT STATS
    let totalScore = 0;

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let unanswered = 0;

    const correctQuestions = [];

    const incorrectQuestions = [];

    const unansweredQuestions = [];

    // PROCESS ANSWERS
    const processedAnswers = answers.map((answer) => {
      const question = questionMap[answer.questionId];

      if (!question) {
        return {
          ...answer,
          marksAwarded: 0,
        };
      }

      let marksAwarded = 0;

      let isCorrect = false;

      // UNANSWERED
      if (answer.selectedIndex === -1 || answer.selectedIndex === undefined) {
        unanswered++;

        unansweredQuestions.push({
          questionId: question._id,

          question: question.text,
        });
      }

      // MCQ GRADING
      else if (question.type === "mcq") {
        // GET SHUFFLE MAP
        const optionOrder = attendance.optionOrders.get(
          question._id.toString(),
        );

        let selectedOptions = [];
        let correctOptionsText = "";

        if (question.correctOptions && question.correctOptions.length > 0) {
          const selectedIndices = Array.isArray(answer.selectedIndices)
            ? answer.selectedIndices
            : (answer.selectedIndex !== -1 && answer.selectedIndex !== undefined ? [answer.selectedIndex] : []);
          
          const originalIndices = selectedIndices.map(idx => optionOrder[idx]).filter(idx => idx !== undefined);
          selectedOptions = originalIndices.map(idx => question.options[idx]).filter(Boolean);

          if (selectedOptions.length === question.correctOptions.length) {
            isCorrect = question.correctOptions.every(opt => selectedOptions.includes(opt)) &&
                        selectedOptions.every(opt => question.correctOptions.includes(opt));
          }
          correctOptionsText = question.correctOptions.join(", ");
        } else {
          const originalIndex = optionOrder[answer.selectedIndex];
          const selectedOption = question.options[originalIndex];
          if (selectedOption) selectedOptions.push(selectedOption);

          if (selectedOption === question.correctOption) {
            isCorrect = true;
          }
          correctOptionsText = question.correctOption;
        }

        if (isCorrect) {
          marksAwarded = question.marks || 1;

          correctAnswers++;

          correctQuestions.push({
            questionId: question._id,

            question: question.text,

            selectedOption: selectedOptions.join(", ") || "Not selected",

            correctOption: correctOptionsText,

            marksAwarded,
          });
        } else {
          wrongAnswers++;

          incorrectQuestions.push({
            questionId: question._id,

            question: question.text,

            selectedOption: selectedOptions.join(", ") || "Not selected",

            correctOption: correctOptionsText,

            explanation: question.explanation || "",

            marksAwarded: 0,
          });
        }
      }

      totalScore += marksAwarded;

      return {
        questionId: answer.questionId,

        selectedIndex: answer.selectedIndex ?? -1,

        selectedIndices: answer.selectedIndices ?? (answer.selectedIndex !== -1 && answer.selectedIndex !== undefined ? [answer.selectedIndex] : []),

        textAnswer: answer.textAnswer || "",

        answeredAt: answer.answeredAt || new Date(),

        marksAwarded,

        isCorrect,
      };
    });

    // TOTAL MARKS
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // PERCENTAGE
    const percentage =
      totalMarks > 0 ? Number(((totalScore / totalMarks) * 100).toFixed(2)) : 0;

    // UPDATE SUBMISSION
    submission.answers = processedAnswers;

    submission.score = totalScore;

    submission.totalQuestions = questions.length;

    submission.percentage = percentage;

    submission.submittedAt = new Date();

    submission.lastSyncedAt = new Date();

    submission.status = remainingTime <= 0 ? "auto_submitted" : "submitted";

    // SAVE SUBMISSION FIRST
    await submission.save();

    // CREATE RESULT
    await Result.create({
      examId,

      studentId,

      submissionId: submission._id,

      score: totalScore,

      totalMarks,

      percentage,

      correctAnswers,

      wrongAnswers,

      unanswered,

      submittedAt: submission.submittedAt,

      status: submission.status,
    });

    // UPDATE ATTENDANCE
    await Attendance.updateOne(
      {
        examId,
        studentId,
      },
      {
        status: "submitted",
        lastSeenAt: new Date(),
      },
    );

    // BASE RESPONSE
    const baseResponse = {
      message:
        submission.status === "auto_submitted"
          ? "Exam auto-submitted due to timeout."
          : "Exam submitted successfully.",

      submitted: true,
    };

    // IF RESULTS ARE HIDDEN
    if (!exam.showResultAfterSubmit) {
      return res.json(baseResponse);
    }

    // SHOW RESULT
    return res.json({
      ...baseResponse,

      result: {
        score: totalScore,

        totalMarks,

        percentage,

        correctAnswers,

        wrongAnswers,

        unanswered,

        submittedAt: submission.submittedAt,

        status: submission.status,

        correctQuestions,

        incorrectQuestions,

        unansweredQuestions,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getExamDetails,
  startExam,
  heartbeat,
  finalSubmit,
};
