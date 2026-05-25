require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      attempt++;
      console.error(`❌ MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log(`   Retrying in 3 seconds...`);
        await new Promise((res) => setTimeout(res, 3000));
      } else {
        console.error('   All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
