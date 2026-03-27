'use strict';

const express = require('express');
const router = express.Router();

const Session = require('../models/Session');
const Client = require('../models/Client');

// ---------------------------------------------------------------------------
// GET /api/sessions — list recent sessions (with client name)
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const sessions = Session.getRecent(limit);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[API /sessions] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/sessions/today — today's sessions
// ---------------------------------------------------------------------------
router.get('/today', (_req, res) => {
  try {
    const sessions = Session.getToday();
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[API /sessions] GET /today error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sessions — record a new session
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { client_id, session_type, session_date, duration_minutes } = req.body;

    if (!client_id) {
      return res.status(400).json({ success: false, error: 'client_id is required' });
    }

    const client = Client.getById(Number(client_id));
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const session = Session.create({
      client_id: Number(client_id),
      session_type: session_type || 'General',
      session_date: session_date || new Date().toISOString(),
      duration_minutes: duration_minutes || 60,
      completed: 0,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error('[API /sessions] POST / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/sessions/:id/complete — mark session as completed
// This triggers retention tracking: updates client last_session_at and status
// ---------------------------------------------------------------------------
router.post('/:id/complete', (req, res) => {
  try {
    const id = Number(req.params.id);
    const session = Session.getById(id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.completed) {
      return res.status(400).json({ success: false, error: 'Session is already completed' });
    }

    // Mark session as completed
    const updated = Session.markCompleted(id);

    // Update client's last session date
    Client.updateLastSession(session.client_id, updated.session_date);

    // Reactivate client if they were at-risk or inactive
    const client = Client.getById(session.client_id);
    if (client && client.status !== 'active') {
      Client.updateStatus(session.client_id, 'active');
    }

    res.json({
      success: true,
      data: updated,
      message: `Session completed. ${client.name}'s last session date updated.`,
    });
  } catch (err) {
    console.error('[API /sessions] POST /:id/complete error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
