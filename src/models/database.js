'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/retention.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create singleton database connection
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Table creation
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    membership_type TEXT DEFAULT 'standard',
    joined_at       TEXT NOT NULL,
    last_session_at TEXT,
    status          TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id        INTEGER NOT NULL REFERENCES clients(id),
    session_date     TEXT NOT NULL,
    session_type     TEXT,
    duration_minutes INTEGER DEFAULT 60,
    completed        INTEGER DEFAULT 1,
    notes            TEXT,
    created_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS follow_up_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    trigger_days INTEGER NOT NULL,
    template_id INTEGER REFERENCES email_templates(id),
    priority    INTEGER DEFAULT 0,
    active      INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id         INTEGER NOT NULL REFERENCES clients(id),
    rule_id           INTEGER REFERENCES follow_up_rules(id),
    scheduled_at      TEXT NOT NULL,
    sent_at           TEXT,
    status            TEXT DEFAULT 'pending',
    email_preview_url TEXT,
    booking_id        INTEGER
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER NOT NULL REFERENCES clients(id),
    token       TEXT UNIQUE NOT NULL,
    booking_url TEXT,
    expires_at  TEXT NOT NULL,
    used        INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL
  );
`);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_client_id   ON sessions(client_id);
  CREATE INDEX IF NOT EXISTS idx_follow_ups_client_id ON follow_ups(client_id);
  CREATE INDEX IF NOT EXISTS idx_follow_ups_status    ON follow_ups(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_token       ON bookings(token);
  CREATE INDEX IF NOT EXISTS idx_bookings_client_id   ON bookings(client_id);
  CREATE INDEX IF NOT EXISTS idx_clients_status       ON clients(status);
  CREATE INDEX IF NOT EXISTS idx_clients_email        ON clients(email);
`);

module.exports = db;
