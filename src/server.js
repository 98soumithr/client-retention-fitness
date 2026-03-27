'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

// ---------------------------------------------------------------------------
// Initialise Express
// ---------------------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Static files — serve the dashboard frontend
// ---------------------------------------------------------------------------

app.use(express.static(path.join(__dirname, 'dashboard')));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

const clientRoutes    = require('./api/clients');
const sessionRoutes   = require('./api/sessions');
const followUpRoutes  = require('./api/followups');
const bookingRoutes   = require('./api/bookings');
const dashboardRoutes = require('./api/dashboard');
const demoRoutes      = require('./api/demo');

app.use('/api/clients',    clientRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/bookings',   bookingRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/demo',       demoRoutes);

// ---------------------------------------------------------------------------
// Booking page — GET /book/:token
// Serves a self-contained HTML page with Tailwind CDN
// ---------------------------------------------------------------------------

const Booking = require('./models/Booking');
const Client = require('./models/Client');
const defaults = require('./config/defaults');

app.get('/book/:token', (req, res) => {
  try {
    const booking = Booking.getByToken(req.params.token);

    if (!booking) {
      return res.status(404).send(renderBookingPage({
        error: true,
        errorTitle: 'Booking Not Found',
        errorMessage: 'This booking link is invalid or does not exist.',
      }));
    }

    const client = Client.getById(booking.client_id);
    const isExpired = new Date() > new Date(booking.expires_at);
    const isUsed = Boolean(booking.used);

    if (isExpired) {
      return res.send(renderBookingPage({
        error: true,
        errorTitle: 'Link Expired',
        errorMessage: 'This booking link has expired. Please contact the studio for a new link.',
      }));
    }

    if (isUsed) {
      return res.send(renderBookingPage({
        error: true,
        errorTitle: 'Already Booked',
        errorMessage: 'This booking link has already been used. See you at your session!',
      }));
    }

    res.send(renderBookingPage({
      error: false,
      studioName: defaults.studio.name,
      clientName: client ? client.name : 'there',
      token: booking.token,
      expiresAt: booking.expires_at,
    }));
  } catch (err) {
    console.error('[Server] GET /book/:token error:', err.message);
    res.status(500).send(renderBookingPage({
      error: true,
      errorTitle: 'Something Went Wrong',
      errorMessage: 'An unexpected error occurred. Please try again later.',
    }));
  }
});

// ---------------------------------------------------------------------------
// Booking page HTML generator
// ---------------------------------------------------------------------------

function renderBookingPage(opts) {
  const {
    error = false,
    errorTitle = '',
    errorMessage = '',
    studioName = defaults.studio.name,
    clientName = '',
    token = '',
    expiresAt = '',
  } = opts;

  if (error) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${errorTitle} — ${studioName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">${errorTitle}</h1>
    <p class="text-gray-600 mb-6">${errorMessage}</p>
    <p class="text-sm text-gray-400">${studioName}</p>
  </div>
</body>
</html>`;
  }

  const expiresDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book a Session — ${studioName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gradient-to-br from-brand-50 to-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-lg w-full">
    <!-- Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">${studioName}</h1>
      <p class="text-gray-500 mt-1">Book Your Next Session</p>
    </div>

    <!-- Card -->
    <div id="booking-form-card" class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Welcome banner -->
      <div class="bg-gradient-to-r from-brand-600 to-purple-600 px-8 py-6">
        <h2 class="text-xl font-semibold text-white">Welcome back, ${clientName}!</h2>
        <p class="text-brand-100 text-sm mt-1">Choose a date, time, and session type below.</p>
      </div>

      <!-- Form -->
      <form id="booking-form" class="p-8 space-y-6">
        <!-- Session Type -->
        <div>
          <label for="session_type" class="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <label class="session-type-option">
              <input type="radio" name="session_type" value="Yoga" class="sr-only peer" checked>
              <div class="cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm font-medium transition-all peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-gray-300">
                Yoga
              </div>
            </label>
            <label class="session-type-option">
              <input type="radio" name="session_type" value="HIIT" class="sr-only peer">
              <div class="cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm font-medium transition-all peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-gray-300">
                HIIT
              </div>
            </label>
            <label class="session-type-option">
              <input type="radio" name="session_type" value="Pilates" class="sr-only peer">
              <div class="cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm font-medium transition-all peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-gray-300">
                Pilates
              </div>
            </label>
            <label class="session-type-option">
              <input type="radio" name="session_type" value="Strength" class="sr-only peer">
              <div class="cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm font-medium transition-all peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-gray-300">
                Strength
              </div>
            </label>
            <label class="session-type-option">
              <input type="radio" name="session_type" value="Cardio" class="sr-only peer">
              <div class="cursor-pointer rounded-xl border-2 border-gray-200 p-3 text-center text-sm font-medium transition-all peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700 hover:border-gray-300">
                Cardio
              </div>
            </label>
          </div>
        </div>

        <!-- Date -->
        <div>
          <label for="session_date" class="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
          <input type="date" id="session_date" name="session_date" required
                 class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-600 focus:ring-0 focus:outline-none transition-colors">
        </div>

        <!-- Time -->
        <div>
          <label for="session_time" class="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
          <select id="session_time" name="session_time" required
                  class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-600 focus:ring-0 focus:outline-none transition-colors bg-white">
            <option value="">Select a time...</option>
            <option value="06:00">6:00 AM</option>
            <option value="07:00">7:00 AM</option>
            <option value="08:00">8:00 AM</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
            <option value="17:00">5:00 PM</option>
            <option value="18:00">6:00 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="20:00">8:00 PM</option>
          </select>
        </div>

        <!-- Submit -->
        <button type="submit" id="submit-btn"
                class="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors shadow-lg shadow-brand-600/25 text-lg">
          Confirm Booking
        </button>

        <p class="text-xs text-gray-400 text-center">
          This link expires on ${expiresDate}
        </p>
      </form>
    </div>

    <!-- Success state (hidden by default) -->
    <div id="booking-success" class="hidden bg-white rounded-2xl shadow-xl p-8 text-center">
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
      <p class="text-gray-600 mb-1">Your session has been booked.</p>
      <p id="success-details" class="text-gray-500 text-sm mb-6"></p>
      <div class="bg-brand-50 rounded-xl p-4">
        <p class="text-brand-700 font-medium text-sm">See you at ${studioName}!</p>
      </div>
    </div>

    <!-- Error state (hidden by default) -->
    <div id="booking-error" class="hidden bg-white rounded-2xl shadow-xl p-8 text-center">
      <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Booking Failed</h2>
      <p id="error-message" class="text-gray-600 mb-6"></p>
      <button onclick="location.reload()" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
        Try Again
      </button>
    </div>

    <!-- Footer -->
    <p class="text-center text-gray-400 text-xs mt-6">
      ${studioName} &middot; ${defaults.studio.address} &middot; ${defaults.studio.phone}
    </p>
  </div>

  <script>
    // Set default date to today
    const dateInput = document.getElementById('session_date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;

    // Handle form submission
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Booking...';

      const sessionType = document.querySelector('input[name="session_type"]:checked').value;
      const sessionDate = dateInput.value;
      const sessionTime = document.getElementById('session_time').value;

      if (!sessionDate || !sessionTime) {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
        alert('Please select a date and time.');
        return;
      }

      const sessionDateTime = sessionDate + 'T' + sessionTime + ':00.000Z';

      try {
        const response = await fetch('/api/bookings/${token}/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_date: sessionDateTime,
            session_type: sessionType,
          }),
        });

        const result = await response.json();

        if (result.success) {
          document.getElementById('booking-form-card').classList.add('hidden');
          document.getElementById('booking-success').classList.remove('hidden');
          document.getElementById('success-details').textContent =
            sessionType + ' on ' + new Date(sessionDateTime).toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            }) + ' at ' + sessionTime;
        } else {
          document.getElementById('booking-form-card').classList.add('hidden');
          document.getElementById('booking-error').classList.remove('hidden');
          document.getElementById('error-message').textContent = result.error || 'Something went wrong.';
        }
      } catch (err) {
        document.getElementById('booking-form-card').classList.add('hidden');
        document.getElementById('booking-error').classList.remove('hidden');
        document.getElementById('error-message').textContent = 'Network error. Please try again.';
      }
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const scheduler = require('./services/scheduler');

app.listen(PORT, () => {
  console.log('');
  console.log('==========================================================');
  console.log(`  CLIENT RETENTION SYSTEM — ${defaults.studio.name}`);
  console.log('==========================================================');
  console.log(`  Mode        : ${DEMO_MODE ? 'DEMO' : 'PRODUCTION'}`);
  console.log(`  Server      : http://localhost:${PORT}`);
  console.log(`  Dashboard   : http://localhost:${PORT}/`);
  console.log('');
  console.log('  API Endpoints:');
  console.log('  ─────────────────────────────────────────────────────');
  console.log('  Clients:');
  console.log(`    GET    /api/clients              — List all clients`);
  console.log(`    GET    /api/clients/:id           — Single client detail`);
  console.log(`    POST   /api/clients               — Create new client`);
  console.log(`    PUT    /api/clients/:id            — Update client`);
  console.log(`    GET    /api/clients/:id/sessions   — Client session history`);
  console.log(`    GET    /api/clients/:id/follow-ups — Client follow-up history`);
  console.log('');
  console.log('  Sessions:');
  console.log(`    GET    /api/sessions              — List recent sessions`);
  console.log(`    POST   /api/sessions              — Record new session`);
  console.log(`    POST   /api/sessions/:id/complete — Mark session completed`);
  console.log(`    GET    /api/sessions/today         — Today's sessions`);
  console.log('');
  console.log('  Follow-Ups:');
  console.log(`    GET    /api/follow-ups            — List all follow-ups`);
  console.log(`    GET    /api/follow-ups/pending     — Pending follow-ups`);
  console.log(`    POST   /api/follow-ups/trigger     — Trigger retention check`);
  console.log(`    POST   /api/follow-ups/:id/send    — Send specific follow-up`);
  console.log(`    GET    /api/follow-ups/stats       — Follow-up statistics`);
  console.log('');
  console.log('  Bookings:');
  console.log(`    GET    /api/bookings              — List all bookings`);
  console.log(`    GET    /api/bookings/:token        — Booking details`);
  console.log(`    POST   /api/bookings/:token/confirm — Confirm booking`);
  console.log(`    POST   /api/bookings/create/:id    — Create booking link`);
  console.log('');
  console.log('  Dashboard:');
  console.log(`    GET    /api/dashboard/stats        — Overview stats`);
  console.log(`    GET    /api/dashboard/timeline      — Activity timeline`);
  console.log(`    GET    /api/dashboard/at-risk       — At-risk clients`);
  console.log(`    GET    /api/dashboard/rules         — Follow-up rules`);
  console.log(`    PUT    /api/dashboard/rules/:id     — Update rule`);
  console.log('');
  console.log('  Demo:');
  console.log(`    POST   /api/demo/advance-time       — Simulate time passing`);
  console.log(`    POST   /api/demo/trigger-check      — Run retention check`);
  console.log(`    POST   /api/demo/reset              — Reset database`);
  console.log(`    GET    /api/demo/email-previews     — Email preview URLs`);
  console.log('');
  console.log('  Booking Page:');
  console.log(`    GET    /book/:token                 — Client booking page`);
  console.log('==========================================================');
  console.log('');

  // Start the scheduler
  scheduler.start();
});

module.exports = app;
