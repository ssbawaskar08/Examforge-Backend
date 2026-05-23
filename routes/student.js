const router = require('express').Router();
const { requireStudent } = require('../middleware/auth');
const { getDashboard } = require('../controllers/studentDashboard');

router.get('/dashboard', requireStudent, getDashboard);

module.exports = router;
