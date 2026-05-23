const router = require('express').Router();
const { body } = require('express-validator');
const { requireTeacher, requireStudent } = require('../middleware/auth');
const {
  createExam,
  listExams,
  getExam,
  updateExam,
  deleteExam,
  publishExam,
  endExam,
  getExamResults,
  checkEligibility,
  joinExam,
  submitExam,
} = require('../controllers/examController');

// ─── Teacher Routes ───────────────────────────────────────────────────────────

// POST   /api/exams          — create a new exam (draft)
router.post(
  '/',
  requireTeacher,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('questions').optional().isArray().withMessage('Questions must be an array'),
    body('totalMarks').optional().isNumeric().withMessage('Total marks must be a number'),
    body('rules').optional().isArray().withMessage('Rules must be an array'),
  ],
  createExam
);

// GET    /api/exams          — list teacher's exams
router.get('/', requireTeacher, listExams);

// GET    /api/exams/:id      — get single exam detail
router.get('/:id', requireTeacher, getExam);

// PUT    /api/exams/:id      — update a draft exam
router.put('/:id', requireTeacher, updateExam);

// DELETE /api/exams/:id      — delete a draft exam
router.delete('/:id', requireTeacher, deleteExam);

// POST   /api/exams/:id/publish — publish exam
router.post('/:id/publish', requireTeacher, publishExam);

// POST   /api/exams/:id/end    — manually end an exam
router.post('/:id/end', requireTeacher, endExam);

// GET    /api/exams/:id/results — get all submissions + violations
router.get('/:id/results', requireTeacher, getExamResults);

// ─── Student Routes ───────────────────────────────────────────────────────────

// POST /api/exams/attempt/eligibility - check if student can join
router.post('/attempt/eligibility', requireStudent, checkEligibility);


// POST /api/exams/attempt/submit — submit answers
router.post('/attempt/submit', requireStudent, submitExam);

module.exports = router;
