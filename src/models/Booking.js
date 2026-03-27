'use strict';

const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  findById: db.prepare(`SELECT * FROM bookings WHERE id = ?`),

  findByToken: db.prepare(`SELECT * FROM bookings WHERE token = ?`),

  insert: db.prepare(`
    INSERT INTO bookings (client_id, token, booking_url, expires_at, used, created_at)
    VALUES (@client_id, @token, @booking_url, @expires_at, @used, @created_at)
  `),

  markUsed: db.prepare(`UPDATE bookings SET used = 1 WHERE token = ? AND used = 0`),

  cleanExpired: db.prepare(`
    DELETE FROM bookings
    WHERE used = 0 AND expires_at < ?
  `),
};

// ---------------------------------------------------------------------------
// Booking model
// ---------------------------------------------------------------------------

const Booking = {
  /**
   * Create a new booking link for a client.
   * @param {number} clientId - The client's ID
   * @param {number} [expiresInHours=72] - Hours until the booking link expires
   * @returns {object} The created booking row
   */
  create(clientId, expiresInHours = 72) {
    const now = new Date();
    const token = uuidv4();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
    const bookingUrl = Booking.generateBookingUrl(token);

    const params = {
      client_id: clientId,
      token,
      booking_url: bookingUrl,
      expires_at: expiresAt.toISOString(),
      used: 0,
      created_at: now.toISOString(),
    };

    const info = stmts.insert.run(params);
    return stmts.findById.get(info.lastInsertRowid);
  },

  /**
   * Find a booking by its unique token.
   */
  findByToken(token) {
    return stmts.findByToken.get(token) || null;
  },

  /**
   * Mark a booking as used by its token. Returns the updated row or null
   * if the token was not found or was already used.
   */
  markUsed(token) {
    const info = stmts.markUsed.run(token);
    if (info.changes === 0) return null;
    return stmts.findByToken.get(token);
  },

  /**
   * Generate the full booking URL for a given token.
   */
  generateBookingUrl(token) {
    return `${BASE_URL}/book/${token}`;
  },

  /**
   * Delete all expired, unused bookings.
   * Returns the number of rows removed.
   */
  cleanExpired() {
    const now = new Date().toISOString();
    const info = stmts.cleanExpired.run(now);
    return info.changes;
  },
};

// Aliases for cross-module compatibility
Booking.getByToken = Booking.findByToken;
Booking.getAll = function () {
  return db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
};
Booking.countAll = function () {
  return db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
};
Booking.countUsed = function () {
  return db.prepare("SELECT COUNT(*) as count FROM bookings WHERE used = 1").get().count;
};
Booking.deleteExpired = function () {
  const now = new Date().toISOString();
  return db.prepare('DELETE FROM bookings WHERE used = 0 AND expires_at < ?').run(now);
};

module.exports = Booking;
