'use strict';

const db = require('./database');

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  findAll: db.prepare(`SELECT * FROM sessions ORDER BY session_date DESC`),

  findByClientId: db.prepare(`
    SELECT * FROM sessions WHERE client_id = ? ORDER BY session_date DESC
  `),

  findById: db.prepare(`SELECT * FROM sessions WHERE id = ?`),

  insert: db.prepare(`
    INSERT INTO sessions (client_id, session_date, session_type, duration_minutes, completed, notes, created_at)
    VALUES (@client_id, @session_date, @session_type, @duration_minutes, @completed, @notes, @created_at)
  `),

  getRecent: db.prepare(`
    SELECT s.*, c.name AS client_name, c.email AS client_email
    FROM sessions s
    JOIN clients c ON c.id = s.client_id
    ORDER BY s.session_date DESC
    LIMIT ?
  `),

  markCompleted: db.prepare(`UPDATE sessions SET completed = 1 WHERE id = ?`),

  updateClientLastSession: db.prepare(`
    UPDATE clients
    SET last_session_at = (
      SELECT MAX(session_date) FROM sessions WHERE client_id = ? AND completed = 1
    )
    WHERE id = ?
  `),
};

// ---------------------------------------------------------------------------
// Session model
// ---------------------------------------------------------------------------

const Session = {
  /**
   * Return all sessions, most recent first.
   */
  findAll() {
    return stmts.findAll.all();
  },

  /**
   * Return all sessions for a given client, most recent first.
   */
  findByClientId(clientId) {
    return stmts.findByClientId.all(clientId);
  },

  /**
   * Create a new session. Returns the created row.
   * Automatically updates the client's last_session_at if completed.
   */
  create(data) {
    const now = new Date().toISOString();
    const params = {
      client_id: data.client_id,
      session_date: data.session_date || now,
      session_type: data.session_type || null,
      duration_minutes: data.duration_minutes ?? 60,
      completed: data.completed ?? 1,
      notes: data.notes || null,
      created_at: now,
    };
    const info = stmts.insert.run(params);
    const session = stmts.findById.get(info.lastInsertRowid);

    // If the session is marked completed, update the client's last_session_at
    if (session.completed) {
      stmts.updateClientLastSession.run(data.client_id, data.client_id);
    }

    return session;
  },

  /**
   * Return the N most recent sessions with client info attached.
   */
  getRecent(limit = 10) {
    return stmts.getRecent.all(limit);
  },

  /**
   * Mark a session as completed and update the client's last_session_at.
   * Returns the updated session or null if not found.
   */
  completeSession(id) {
    stmts.markCompleted.run(id);
    const session = stmts.findById.get(id);
    if (session) {
      stmts.updateClientLastSession.run(session.client_id, session.client_id);
    }
    return session || null;
  },
};

// Aliases for cross-module compatibility
Session.getByClientId = Session.findByClientId;
Session.getById = function (id) {
  return stmts.findById.get(id) || null;
};
Session.getToday = function () {
  return db.prepare(`
    SELECT s.*, c.name AS client_name, c.email AS client_email
    FROM sessions s
    JOIN clients c ON c.id = s.client_id
    WHERE date(s.session_date) = date('now')
    ORDER BY s.session_date DESC
  `).all();
};
Session.markCompleted = Session.completeSession;

module.exports = Session;
