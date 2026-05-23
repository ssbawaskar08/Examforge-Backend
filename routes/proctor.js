const router = require('express').Router();
const { body } = require('express-validator');
const { requireTeacher, requireStudent } = require('../middleware/auth');
const { recordEvent, getEvents, getCheats, incrementCheats, VALID_TYPES } = require('../controllers/proctorController');

router.post(
  '/event',
  requireStudent,
  [
    body('examId').notEmpty().withMessage('examId is required'),
    body('type').isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
  ],
  recordEvent
);

router.get('/events/:examId/:studentId', requireTeacher, getEvents);

router.get('/cheats/:examId/:studentId', getCheats);
router.post('/cheats/:examId/:studentId', incrementCheats);

module.exports = router;
