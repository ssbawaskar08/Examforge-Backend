require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes             = require('./routes/auth');
const examRoutes             = require('./routes/exams');
const pollRoutes             = require('./routes/polls');
const proctorRoutes          = require('./routes/proctor');
const studentRoutes          = require('./routes/students');
const studentDashboardRoutes = require('./routes/student');
const joinExamRoutes         = require('./routes/joinExam.js');
const teacherRoutes          = require('./routes/teacher');

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ─── Body Parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',    authLimiter, authRoutes);
app.use('/api/exams',   examRoutes);
app.use('/api/polls',   pollRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student',  studentDashboardRoutes);
app.use('/api/attempt',  joinExamRoutes);
app.use('/api/teacher',  teacherRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 ExamForge server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
