const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const Result = require('../models/result');

/**
 * GET /api/student/dashboard
 *
 * Returns for the authenticated student:
 *  - liveExams      : status === 'live' and student has not submitted
 *  - scheduledExams : status === 'scheduled' and student has not submitted
 *  - endedExams     : status === 'ended' and student has not submitted
 *  - completedExams : student has submitted (status submitted/auto_submitted)
 *  - draft exams are excluded entirely
 */
const getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // All non-draft exams this student is assigned to
    const allExams = await Exam.find({
      assignedStudents: studentId,
      status: { $in: ['live', 'scheduled', 'ended'] },
    })
      .select('title description duration scheduledStart scheduledEnd latestJoinTime status totalMarks showResultAfterSubmit')
      .sort({ scheduledStart: 1 })
      .lean();

    // All submissions by this student
    const submissions = await Submission.find({ studentId })
      .select('examId status startedAt submittedAt')
      .lean();

    const submissionMap = {};
    for (const s of submissions) {
      submissionMap[s.examId.toString()] = s;
    }

    // All results for this student
    const results = await Result.find({ studentId })
      .select('examId score totalMarks percentage correctAnswers wrongAnswers unanswered status submittedAt')
      .lean();

    const resultMap = {};
    for (const r of results) {
      resultMap[r.examId.toString()] = r;
    }

    const liveExams      = [];
    const scheduledExams = [];
    const endedExams     = [];
    const completedExams = [];

    for (const exam of allExams) {
      const eid = exam._id.toString();
      const sub = submissionMap[eid];
      const result = resultMap[eid];

      const isDone =
        sub?.status === 'submitted' || sub?.status === 'auto_submitted';

      if (isDone) {
        completedExams.push({
          exam,
          submission: {
            status:      sub.status,
            startedAt:   sub.startedAt,
            submittedAt: sub.submittedAt,
          },
          // Only include result numbers if the exam is configured to show them
          result: exam.showResultAfterSubmit && result
            ? {
                score:          result.score,
                totalMarks:     result.totalMarks,
                percentage:     result.percentage,
                correctAnswers: result.correctAnswers,
                wrongAnswers:   result.wrongAnswers,
                unanswered:     result.unanswered,
                status:         result.status,
              }
            : null,
        });
      } else if (exam.status === 'live') {
        liveExams.push({ exam });
      } else if (exam.status === 'scheduled') {
        scheduledExams.push({ exam });
      } else if (exam.status === 'ended') {
        endedExams.push({ exam });
      }
    }

    return res.json({
      liveExams,
      scheduledExams,
      endedExams,
      completedExams,
      counts: {
        live:      liveExams.length,
        scheduled: scheduledExams.length,
        ended:     endedExams.length,
        completed: completedExams.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
