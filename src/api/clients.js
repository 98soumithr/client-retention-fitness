'use strict';

const express = require('express');
const router = express.Router();

const Client = require('../models/Client');
const Session = require('../models/Session');
const FollowUp = require('../models/FollowUp');

// ---------------------------------------------------------------------------
// GET /api/clients — list all clients with their last session info
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const clients = Client.getAll();

    // Attach last session info to each client
    const data = clients.map((client) => {
      const lastSession = Client.getLastSession(client.id);
      return {
        ...client,
        last_session: lastSession || null,
        days_since_last_session: Client.getDaysSinceLastSession(client.id),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[API /clients] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:id — single client with sessions and follow-ups
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const client = Client.getById(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const sessions = Session.getByClientId(client.id);
    const followUps = FollowUp.findByClientId(client.id);
    const daysSince = Client.getDaysSinceLastSession(client.id);

    res.json({
      success: true,
      data: {
        ...client,
        days_since_last_session: daysSince,
        sessions,
        follow_ups: followUps,
      },
    });
  } catch (err) {
    console.error('[API /clients] GET /:id error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients — create new client
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, email, phone, membership_type } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Check for duplicate email
    const existing = Client.getByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'A client with this email already exists' });
    }

    const client = Client.create({ name, email, phone, membership_type });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    console.error('[API /clients] POST / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/clients/:id — update client
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = Client.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const updated = Client.update(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[API /clients] PUT /:id error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:id/sessions — client's session history
// ---------------------------------------------------------------------------
router.get('/:id/sessions', (req, res) => {
  try {
    const id = Number(req.params.id);
    const client = Client.getById(id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const sessions = Session.getByClientId(id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[API /clients] GET /:id/sessions error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:id/follow-ups — client's follow-up history
// ---------------------------------------------------------------------------
router.get('/:id/follow-ups', (req, res) => {
  try {
    const id = Number(req.params.id);
    const client = Client.getById(id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const followUps = FollowUp.findByClientId(id);
    res.json({ success: true, data: followUps });
  } catch (err) {
    console.error('[API /clients] GET /:id/follow-ups error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
