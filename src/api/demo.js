'use strict';

const express = require('express');
const router = express.Router();

const db = require('../models/database');
const retentionEngine = require('../services/retentionEngine');
const FollowUp = require('../models/FollowUp');

// ---------------------------------------------------------------------------
// POST /api/demo/advance-time — simulate time passing
// Shifts all dates in the database backwards by N days (so "now" appears N
// days in the future relative to the data).
// ---------------------------------------------------------------------------
router.post('/advance-time', (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) {
      return res.status(400).json({ success: false, error: 'days must be a positive number' });
    }

    const offset = `-${days} days`;

    // Shift session dates backward
    db.prepare(`
      UPDATE sessions SET session_date = datetime(session_date, ?), created_at = datetime(created_at, ?)
    `).run(offset, offset);

    // Shift client joined_at and last_session_at backward
    db.prepare(`
      UPDATE clients
      SET joined_at = datetime(joined_at, ?),
          last_session_at = CASE
            WHEN last_session_at IS NOT NULL THEN datetime(last_session_at, ?)
            ELSE NULL
          END
    `).run(offset, offset);

    // Shift follow-up dates backward
    db.prepare(`
      UPDATE follow_ups
      SET scheduled_at = datetime(scheduled_at, ?),
          sent_at = CASE WHEN sent_at IS NOT NULL THEN datetime(sent_at, ?) ELSE NULL END
    `).run(offset, offset);

    // Shift booking dates backward
    db.prepare(`
      UPDATE bookings
      SET created_at = datetime(created_at, ?),
          expires_at = datetime(expires_at, ?)
    `).run(offset, offset);

    res.json({
      success: true,
      message: `Time advanced by ${days} day(s). All dates shifted.`,
      data: { days_advanced: days },
    });
  } catch (err) {
    console.error('[API /demo] POST /advance-time error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/demo/trigger-check — manually run retention engine check
// ---------------------------------------------------------------------------
router.post('/trigger-check', async (_req, res) => {
  try {
    const result = await retentionEngine.checkAllClients();
    res.json({
      success: true,
      data: result,
      message: `Retention check complete: ${result.triggered} triggered, ${result.skipped} skipped, ${result.errors} error(s)`,
    });
  } catch (err) {
    console.error('[API /demo] POST /trigger-check error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/demo/reset — reset database and re-seed
// Drops all data and re-runs the seed script
// ---------------------------------------------------------------------------
router.post('/reset', (req, res) => {
  try {
    // Delete all data in dependency order
    db.prepare('DELETE FROM follow_ups').run();
    db.prepare('DELETE FROM bookings').run();
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM follow_up_rules').run();
    db.prepare('DELETE FROM email_templates').run();
    db.prepare('DELETE FROM clients').run();

    // Reset auto-increment counters
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('clients','sessions','follow_ups','bookings','email_templates','follow_up_rules')").run();

    res.json({
      success: true,
      message: 'Database reset. Run `npm run seed` to re-populate, or seed via the API.',
    });
  } catch (err) {
    console.error('[API /demo] POST /reset error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/demo/email-previews — list all email preview URLs from Ethereal
// ---------------------------------------------------------------------------
router.get('/email-previews', (_req, res) => {
  try {
    const previews = db.prepare(`
      SELECT f.id, f.email_preview_url, f.sent_at, f.status,
             c.name AS client_name, c.email AS client_email,
             r.name AS rule_name
      FROM follow_ups f
      JOIN clients c ON c.id = f.client_id
      LEFT JOIN follow_up_rules r ON r.id = f.rule_id
      WHERE f.email_preview_url IS NOT NULL
      ORDER BY f.sent_at DESC
    `).all();

    res.json({ success: true, data: previews });
  } catch (err) {
    console.error('[API /demo] GET /email-previews error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
