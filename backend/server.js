/**
 * server.js
 * PetCare Connect – Express API server entry point.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
const authRoutes         = require('./routes/auth');
const petRoutes          = require('./routes/pets');
const shelterRoutes      = require('./routes/shelters');
const adoptionRoutes     = require('./routes/adoptions');
const appointmentRoutes  = require('./routes/appointments');
const videoRoutes        = require('./routes/videos');
const petCareVideoRoutes  = require('./routes/pet-care-videos');
const boardingRoutes     = require('./routes/boarding');
const notificationRoutes = require('./routes/notifications');
const adminRoutes        = require('./routes/admin');
const foodRoutes         = require('./routes/food');
const medicineRoutes     = require('./routes/medicine');
const supportRoutes       = require('./routes/support');
const chatRoutes          = require('./routes/chat');

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const isProduction = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// CORS
// Allow requests from the frontend origin (and localhost variants in dev).
// ---------------------------------------------------------------------------
if (isProduction && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL must be set to the deployed frontend origin in production.');
}

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
];

if (!isProduction) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin "${origin}" is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------------------------------------------------------------------------
// Body parsers
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Request logger (development)
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'PetCare Connect API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ---------------------------------------------------------------------------
// Supabase connectivity check
// Performs a minimal read-only query against the pets table (public SELECT).
// Selecting is_listed also verifies the listing migration on this project.
// Never exposes env vars, API keys, or secrets in the response.
// ---------------------------------------------------------------------------
app.get('/api/test-supabase', async (_req, res) => {
  try {
    const { supabase } = require('./config/supabase');

    // Fetch at most 1 row to verify the configured project has the listing column.
    const { data, error, status } = await supabase
      .from('pets')
      .select('id, is_listed')
      .limit(1);

    if (error) {
      console.error('[test-supabase] Supabase query error:', error.message);
      return res.status(502).json({
        success: false,
        message: 'Supabase query failed',
        details: error.message,
        hint: error.hint || null,
        httpStatus: status,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connection is healthy',
      rowsReturned: data.length,
      isListedColumnVerified: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[test-supabase] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reach Supabase',
      details: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth',          authRoutes);
app.use('/api/pets',          petRoutes);
app.use('/api/shelters',      shelterRoutes);
app.use('/api/adoptions',     adoptionRoutes);
app.use('/api/appointments',  appointmentRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/pet-care-videos', petCareVideoRoutes);
app.use('/api/boarding',      boardingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/food',          foodRoutes);
app.use('/api/medicine',      medicineRoutes);
app.use('/api/support',       supportRoutes);
app.use('/api/chat',          chatRoutes);

// Serve the existing static frontend from the same origin as the API.
app.use(express.static(FRONTEND_DIR));

// ---------------------------------------------------------------------------
// 404 handler – unknown routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Global Error Handler]', err);

  // CORS errors surfaced from the cors() middleware
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅  PetCare Connect API listening on port ${PORT}`);
  console.log(`   Health check → http://localhost:${PORT}/api/health`);
  console.log(`   Environment  → ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // for testing
