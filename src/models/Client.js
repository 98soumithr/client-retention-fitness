'use strict';

const db = require('./database');

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  findAll: db.prepare(`SELECT * FROM clients ORDER BY name ASC`),

  findById: db.prepare(`SELECT * FROM clients WHERE id = ?`),

  findByEmail: db.prepare(`SELECT * FROM clients WHERE email = ?`),

  insert: db.prepare(`
    INSERT INTO clients (name, email, phone, membership_type, joined_at, last_session_at, status)
    VALUES (@name, @email, @phone, @membership_type, @joined_at, @last_session_at, @status)
  `),

  update: db.prepare(`
    UPDATE clients
    SET name            = COALESCE(@name, name),
        email           = COALESCE(@email, email),
        phone           = COALESCE(@phone, phone),
        membership_type = COALESCE(@membership_type, membership_type),
        last_session_at = COALESCE(@last_session_at, last_session_at),
        status          = COALESCE(@status, status)
    WHERE id = @id
  `),

  lastSession: db.prepare(`
    SELECT * FROM sessions
    WHERE client_id = ?
    ORDER BY session_date DESC
    LIMIT 1
  `),

  needingFollowUp: db.prepare(`
    SELECT c.*,
           MAX(s.session_date) AS most_recent_session,
           CAST(julianday('now') - julianday(MAX(s.session_date)) AS INTEGER) AS days_since
    FROM clients c
    JOIN sessions s ON s.client_id = c.id AND s.completed = 1
    WHERE c.status = 'active'
    GROUP BY c.id
    HAVING days_since >= 3
    ORDER BY days_since DESC
  `),
};

// ---------------------------------------------------------------------------
// Client model
// ---------------------------------------------------------------------------

const Client = {
  /**
   * Return all clients ordered by name.
   */
  findAll() {
    return stmts.findAll.all();
  },

  /**
   * Find a single client by primary key.
   */
  findById(id) {
    return stmts.findById.get(id) || null;
  },

  /**
   * Find a single client by email address.
   */
  findByEmail(email) {
    return stmts.findByEmail.get(email) || null;
  },

  /**
   * Create a new client. Returns the created row.
   */
  create(data) {
    const now = new Date().toISOString();
    const params = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      membership_type: data.membership_type || 'standard',
      joined_at: data.joined_at || now,
      last_session_at: data.last_session_at || null,
      status: data.status || 'active',
    };
    const info = stmts.insert.run(params);
    return Client.findById(info.lastInsertRowid);
  },

  /**
   * Update an existing client. Returns the updated row.
   */
  update(id, data) {
    const params = {
      id,
      name: data.name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      membership_type: data.membership_type ?? null,
      last_session_at: data.last_session_at ?? null,
      status: data.status ?? null,
    };
    stmts.update.run(params);
    return Client.findById(id);
  },

  /**
   * Return the most recent session for a client (completed or not).
   */
  getLastSession(clientId) {
    return stmts.lastSession.get(clientId) || null;
  },

  /**
   * Return the number of days since the client's most recent session.
   * Returns null if the client has no sessions.
   */
  getDaysSinceLastSession(clientId) {
    const session = Client.getLastSession(clientId);
    if (!session) return null;

    const lastDate = new Date(session.session_date);
    const now = new Date();
    const diffMs = now - lastDate;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Return active clients whose most recent completed session was 3+ days ago.
   * Each result includes `most_recent_session` and `days_since` fields.
   */
  getClientsNeedingFollowUp() {
    return stmts.needingFollowUp.all();
  },
};

// Aliases for API route compatibility
Client.getAll = Client.findAll;
Client.getById = Client.findById;
Client.getByEmail = Client.findByEmail;
Client.getActive = function () {
  return db.prepare("SELECT * FROM clients WHERE status = 'active' ORDER BY name ASC").all();
};
Client.updateLastSession = function (id, dateISO) {
  db.prepare('UPDATE clients SET last_session_at = ? WHERE id = ?').run(dateISO, id);
  return Client.findById(id);
};
Client.updateStatus = function (id, status) {
  db.prepare('UPDATE clients SET status = ? WHERE id = ?').run(status, id);
  return Client.findById(id);
};
Client.count = function () {
  return db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
};
Client.countActive = function () {
  return db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get().count;
};
Client.delete = function (id) {
  return db.prepare('DELETE FROM clients WHERE id = ?').run(id);
};

module.exports = Client;
