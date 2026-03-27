'use strict';

const express = require('express');
const router = express.Router();

const db = require('../models/database');
const Client = require('../models/Client');
const Session = require('../models/Session');
const FollowUp = require('../models/FollowUp');
const Booking = require('../models/Booking');
const retentionEngine = require('../services/retentionEngine');

// ---------------------------------------------------------------------------
// GET /api/dashboard/stats — overview stats
// ---------------------------------------------------------------------------
router.get('/stats', (_req, res) => {
  try {
    const stats = retentionEngine.getRetentionStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[API /dashboard] GET /stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/timeline — recent activity timeline
// Aggregates sessions, follow-ups, and bookings into a unified timeline
// ---------------------------------------------------------------------------
router.get('/timeline', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;

    // Fetch recent items from each table
    const recentSessions = Session.getRecent(limit);
    const recentFollowUps = FollowUp.findAll().slice(0, limit);
    const recentBookings = Booking.getAll().slice(0, limit);

    // Build unified timeline entries
    const timeline = [];

    for (const s of recentSessions) {
      timeline.push({
        type: 'session',
        date: s.session_date,
        description: `${s.client_name} attended a ${s.session_type || 'General'} session (${s.duration_minutes} min)`,
        client_name: s.client_name,
        detail: s,
      });
    }

    for (const f of recentFollowUps) {
      timeline.push({
        type: 'follow_up',
        date: f.sent_at || f.scheduled_at,
        description: `Follow-up ${f.status === 'sent' ? 'sent to' : 'scheduled for'} ${f.client_name}${f.rule_name ? ` (${f.rule_name})` : ''}`,
        client_name: f.client_name,
        detail: f,
      });
    }

    for (const b of recentBookings) {
      const client = Client.getById(b.client_id);
      const clientName = client ? client.name : 'Unknown';
      timeline.push({
        type: 'booking',
        date: b.created_at,
        description: `Booking link ${b.used ? 'used by' : 'created for'} ${clientName}`,
        client_name: clientName,
        detail: b,
      });
    }

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: timeline.slice(0, limit) });
  } catch (err) {
    console.error('[API /dashboard] GET /timeline error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/at-risk — clients who haven't visited in 7+ days
// ---------------------------------------------------------------------------
router.get('/at-risk', (req, res) => {
  try {
    const thresholdDays = Number(req.query.days) || 7;

    const atRiskClients = db.prepare(`
      SELECT c.*,
             MAX(s.session_date) AS last_session_date,
             CAST(julianday('now') - julianday(MAX(s.session_date)) AS INTEGER) AS days_since_last
      FROM clients c
      LEFT JOIN sessions s ON s.client_id = c.id
      WHERE c.status IN ('active', 'at-risk')
      GROUP BY c.id
      HAVING days_since_last >= ?
      ORDER BY days_since_last DESC
    `).all(thresholdDays);

    res.json({
      success: true,
      data: atRiskClients,
      meta: {
        threshold_days: thresholdDays,
        count: atRiskClients.length,
      },
    });
  } catch (err) {
    console.error('[API /dashboard] GET /at-risk error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/rules — current follow-up rules with stats
// ---------------------------------------------------------------------------
router.get('/rules', (_req, res) => {
  try {
    const rules = db.prepare(`
      SELECT r.id, r.name, r.trigger_days, r.active, r.priority, r.template_id,
             t.name AS template_name,
             COUNT(f.id) AS total_follow_ups,
             SUM(CASE WHEN f.status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
             SUM(CASE WHEN f.status = 'pending' THEN 1 ELSE 0 END) AS pending_count
      FROM follow_up_rules r
      LEFT JOIN email_templates t ON t.id = r.template_id
      LEFT JOIN follow_ups f ON f.rule_id = r.id
      GROUP BY r.id
      ORDER BY r.trigger_days ASC
    `).all();

    res.json({ success: true, data: rules });
  } catch (err) {
    console.error('[API /dashboard] GET /rules error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/dashboard/rules/:id — update a follow-up rule
// ---------------------------------------------------------------------------
router.put('/rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM follow_up_rules WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    const { name, trigger_days, active, priority } = req.body;

    db.prepare(`
      UPDATE follow_up_rules
      SET name = COALESCE(?, name),
          trigger_days = COALESCE(?, trigger_days),
          active = COALESCE(?, active),
          priority = COALESCE(?, priority)
      WHERE id = ?
    `).run(
      name !== undefined ? name : null,
      trigger_days !== undefined ? trigger_days : null,
      active !== undefined ? (active ? 1 : 0) : null,
      priority !== undefined ? priority : null,
      id
    );

    const updated = db.prepare('SELECT * FROM follow_up_rules WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[API /dashboard] PUT /rules/:id error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
