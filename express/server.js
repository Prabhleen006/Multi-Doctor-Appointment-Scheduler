require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Multi-Doctor Appointment Conflict Scheduler API (Phase 2)'
  });
});

// Serve frontend static assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use(express.static(path.join(frontendPath, 'html')));

// Fallback to frontend index for root
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'html', 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Connect to MongoDB and start HTTP listener when executed directly
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`[Server] Medical Scheduler Phase 2 running on port ${PORT}`);
        console.log(`[Server] Web application accessible at: http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('[Fatal Error] Unable to start server: MongoDB connection failed.');
      process.exit(1);
    }
  })();
}

module.exports = app;
