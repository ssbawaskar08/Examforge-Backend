const router = require('express').Router();
const { requireTeacher } = require('../middleware/auth');
const {
  getExamOverview,
  getScoreDistribution,
  getCheatReport,
  getQuestionAnalysis,
  getClassesAndYears,
  getThresholdReport,
} = require('../controllers/teacherAnalytics');

// GET /api/teacher/analytics/exams
// All exams created by the teacher + class groups of assigned students
router.get('/analytics/exams', requireTeacher, getExamOverview);

// GET /api/teacher/analytics/classes-years
// Distinct classes, years, and teacher exams
router.get('/analytics/classes-years', requireTeacher, getClassesAndYears);

// GET /api/teacher/analytics/threshold-report
// Stats for students in a class/year based on a mark threshold
router.get('/analytics/threshold-report', requireTeacher, getThresholdReport);

// GET /api/teacher/analytics/exams/:examId/score-distribution
// ?semester=&studentClass=&division=  (all optional filters)
router.get('/analytics/exams/:examId/score-distribution', requireTeacher, getScoreDistribution);

// GET /api/teacher/analytics/exams/:examId/cheat-report
// Students sorted by cheat count desc
router.get('/analytics/exams/:examId/cheat-report', requireTeacher, getCheatReport);

// GET /api/teacher/analytics/exams/:examId/question-analysis
// Per-question correct / wrong / skipped student lists
router.get('/analytics/exams/:examId/question-analysis', requireTeacher, getQuestionAnalysis);

module.exports = router;
