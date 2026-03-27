'use strict';

const db = require('./database');

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  findAll: db.prepare(`
    SELECT f.*, c.name AS client_name, c.email AS client_email
    FROM follow_ups f
    JOIN clients c ON c.id = f.client_id
    ORDER BY f.scheduled_at DESC
  `),

  findByClientId: db.prepare(`
    SELECT f.*, r.name AS rule_name
    FROM follow_ups f
    LEFT JOIN follow_up_rules r ON r.id = f.rule_id
    WHERE f.client_id = ?
    ORDER BY f.scheduled_at DESC
  `),

  findById: db.prepare(`SELECT * FROM follow_ups WHERE id = ?`),

  insert: db.prepare(`
    INSERT INTO follow_ups (client_id, rule_id, scheduled_at, sent_at, status, email_preview_url, booking_id)
    VALUES (@client_id, @rule_id, @scheduled_at, @sent_at, @status, @email_preview_url, @booking_id)
  `),

  updateStatus: db.prepare(`
    UPDATE follow_ups
    SET status            = @status,
        sent_at           = COALESCE(@sent_at, sent_at),
        email_preview_url = COALESCE(@email_preview_url, email_preview_url),
        booking_id        = COALESCE(@booking_id, booking_id)
    WHERE id = @id
  `),

  getPending: db.prepare(`
    SELECT f.*, c.name AS client_name, c.email AS client_email,
           r.name AS rule_name, r.template_id
    FROM follow_ups f
    JOIN clients c ON c.id = f.client_id
    LEFT JOIN follow_up_rules r ON r.id = f.rule_id
    WHERE f.status = 'pending'
    ORDER BY f.scheduled_at ASC
  `),

  hasExisting: db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM follow_ups
    WHERE client_id = ? AND rule_id = ? AND status IN ('pending', 'sent')
  `),

  stats: db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM follow_ups
    GROUP BY status
  `),
};

// ---------------------------------------------------------------------------
// FollowUp model
// ---------------------------------------------------------------------------

const FollowUp = {
  /**
   * Return all follow-ups with client info, most recent first.
   */
  findAll() {
    return stmts.findAll.all();
  },

  /**
   * Return all follow-ups for a given client with rule info.
   */
  findByClientId(clientId) {
    return stmts.findByClientId.all(clientId);
  },

  /**
   * Create a new follow-up record. Returns the created row.
   */
  create(data) {
    const now = new Date().toISOString();
    const params = {
      client_id: data.client_id,
      rule_id: data.rule_id || null,
      scheduled_at: data.scheduled_at || now,
      sent_at: data.sent_at || null,
      status: data.status || 'pending',
      email_preview_url: data.email_preview_url || null,
      booking_id: data.booking_id || null,
    };
    const info = stmts.insert.run(params);
    return stmts.findById.get(info.lastInsertRowid);
  },

  /**
   * Update the status of a follow-up. Accepts optional extras like
   * sent_at, email_preview_url, and booking_id.
   */
  updateStatus(id, status, extras = {}) {
    const params = {
      id,
      status,
      sent_at: extras.sent_at || null,
      email_preview_url: extras.email_preview_url || null,
      booking_id: extras.booking_id || null,
    };
    stmts.updateStatus.run(params);
    return stmts.findById.get(id) || null;
  },

  /**
   * Return all follow-ups with status 'pending', ordered by scheduled date.
   */
  getPending() {
    return stmts.getPending.all();
  },

  /**
   * Check if a pending or sent follow-up already exists for a client + rule combo.
   */
  hasExistingFollowUp(clientId, ruleId) {
    const row = stmts.hasExisting.get(clientId, ruleId);
    return row.cnt > 0;
  },

  /**
   * Return an object with counts grouped by status.
   * Example: { pending: 5, sent: 12, failed: 1 }
   */
  getStats() {
    const rows = stmts.stats.all();
    const result = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  },
};

module.exports = FollowUp;
