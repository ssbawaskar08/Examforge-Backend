const { getExamDetails, startExam, heartbeat, finalSubmit } = require('../controllers/joinExam');
const { requireStudent } = require('../middleware/auth');

const router = require('express').Router();

router.post('/join', requireStudent, getExamDetails);
router.post('/start', requireStudent, startExam);
router.get('/heartbeat/:examId', requireStudent, heartbeat);
router.post('/submit', requireStudent, finalSubmit);

module.exports = router;