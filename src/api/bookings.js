'use strict';

const express = require('express');
const router = express.Router();

const Booking = require('../models/Booking');
const Client = require('../models/Client');
const bookingService = require('../services/bookingService');

// ---------------------------------------------------------------------------
// GET /api/bookings — list all bookings
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const bookings = Booking.getAll();

    // Enrich each booking with client name
    const data = bookings.map((b) => {
      const client = Client.getById(b.client_id);
      return {
        ...b,
        client_name: client ? client.name : 'Unknown',
        client_email: client ? client.email : '',
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[API /bookings] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/:token — get booking details (for booking page)
// ---------------------------------------------------------------------------
router.get('/:token', (req, res) => {
  try {
    const booking = Booking.getByToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const client = Client.getById(booking.client_id);
    const isExpired = new Date() > new Date(booking.expires_at);

    res.json({
      success: true,
      data: {
        ...booking,
        client_name: client ? client.name : 'Unknown',
        client_email: client ? client.email : '',
        is_expired: isExpired,
      },
    });
  } catch (err) {
    console.error('[API /bookings] GET /:token error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/:token/confirm — confirm a booking (creates session)
// ---------------------------------------------------------------------------
router.post('/:token/confirm', (req, res) => {
  try {
    const { session_date, session_type } = req.body;

    const result = bookingService.confirmBooking(
      req.params.token,
      session_date || new Date().toISOString(),
      session_type || 'General'
    );

    if (!result) {
      return res.status(400).json({
        success: false,
        error: 'Unable to confirm booking. The link may be expired or already used.',
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Booking confirmed! Your session has been scheduled.',
    });
  } catch (err) {
    console.error('[API /bookings] POST /:token/confirm error:', err.message);
    const status = err.message.includes('expired') || err.message.includes('already been used') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/create/:clientId — manually create booking link for a client
// ---------------------------------------------------------------------------
router.post('/create/:clientId', (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const client = Client.getById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const result = bookingService.createBookingLink(clientId);

    res.status(201).json({
      success: true,
      data: result,
      message: `Booking link created for ${client.name}`,
    });
  } catch (err) {
    console.error('[API /bookings] POST /create/:clientId error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
