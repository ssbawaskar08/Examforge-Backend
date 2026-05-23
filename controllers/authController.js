const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signToken = (id, role, name, email) =>
  jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/teacher/login
 */
const teacherLogin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email }).select('+passwordHash');
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(teacher._id, 'teacher', teacher.name, teacher.email);

    res.json({
      token,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/teacher/register
 */
const teacherRegister = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email is already in use.' });
    }

    const name = email.split('@')[0];
    const teacher = await Teacher.create({
      name,
      email,
      passwordHash: password,
    });

    const token = signToken(teacher._id, 'teacher', teacher.name, teacher.email);

    res.status(201).json({
      token,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/student/login
 */
const studentLogin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log("logged in student", { email, password })
    const student = await Student.findOne({ email }).select('+passwordHash');
    if (!student) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(student._id, 'student', student.name, student.email);

    res.json({
      token,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        year: student.year,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'teacher') {
      const user = await Teacher.findById(id);
      if (!user) return res.status(404).json({ message: 'Teacher not found.' });
      return res.json({
        role: 'teacher',
        user: { _id: user._id, name: user.name, email: user.email, department: user.department },
      });
    } else {
      const user = await Student.findById(id);
      if (!user) return res.status(404).json({ message: 'Student not found.' });
      return res.json({
        role: 'student',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          rollNumber: user.rollNumber,
          department: user.department,
          year: user.year,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { teacherLogin, teacherRegister, studentLogin, getMe };
