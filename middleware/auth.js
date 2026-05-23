const jwt = require('jsonwebtoken');


const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided. Authorization denied.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name, email }
    req.role = decoded.role;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Authorization denied.' });
  }
};

/**
 * Role-specific middleware factories.
 */
const requireTeacher = (req, res, next) => {
  auth(req, res, () => {
    if (req.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teacher account required.' });
    }
    next();
  });
};

const requireStudent = (req, res, next) => {
  auth(req, res, () => {
    if (req.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student account required.' });
    }
    next();
  });
};

module.exports = { auth, requireTeacher, requireStudent };
