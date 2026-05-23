const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const TeacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
TeacherSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  // passwordHash field stores the plain text temporarily, then gets hashed here
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Instance method to compare password
TeacherSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Teacher', TeacherSchema);
