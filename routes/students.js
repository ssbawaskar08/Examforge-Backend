const router = require('express').Router();
const { requireTeacher } = require('../middleware/auth');
const {
  listStudents,
  seedStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudents,
} = require('../controllers/studentController');

// GET  /api/students       — list all students (teacher only)
router.get('/', requireTeacher, listStudents);

// POST /api/students       — create single student (teacher only)
router.post('/', requireTeacher, createStudent);

// POST /api/students/import — import students via parsed Excel JSON (teacher only)
router.post('/import', requireTeacher, importStudents);

// PUT  /api/students/:id   — update student details (teacher only)
router.put('/:id', requireTeacher, updateStudent);

// DELETE /api/students/:id — delete student (teacher only)
router.delete('/:id', requireTeacher, deleteStudent);

// POST /api/students/seed  — bulk-insert students (dev only)
router.post('/seed', seedStudents);

module.exports = router;

