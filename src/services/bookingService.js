'use strict';

const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Client = require('../models/Client');
const defaults = require('../config/defaults');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a unique booking link for a client.
 *
 * @param {number} clientId          - The client's database ID
 * @param {number} [expiresInHours]  - Hours until the link expires (default: 72)
 * @returns {{ token: string, url: string, booking: object }}
 */
function createBookingLink(clientId, expiresInHours) {
  try {
    const hours = expiresInHours || defaults.booking.defaultExpiryHours;
    const booking = Booking.create(clientId, hours);

    console.log(`[BookingService] Booking link created for client #${clientId}`);
    console.log(`[BookingService]   Token      : ${booking.token}`);
    console.log(`[BookingService]   URL        : ${booking.booking_url}`);
    console.log(`[BookingService]   Expires at : ${booking.expires_at}`);

    return { token: booking.token, url: booking.booking_url, booking };
  } catch (err) {
    console.error(`[BookingService] Failed to create booking link for client #${clientId}:`, err.message);
    throw err;
  }
}

/**
 * Validate a booking token. Returns the booking record if valid and not
 * expired; otherwise returns null.
 *
 * @param {string} token - The booking UUID token
 * @returns {object|null}
 */
function validateBooking(token) {
  try {
    const booking = Booking.getByToken(token);

    if (!booking) {
      console.log(`[BookingService] Token not found: ${token}`);
      return null;
    }

    if (booking.used) {
      console.log(`[BookingService] Token already used: ${token}`);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(booking.expires_at);
    if (now > expiresAt) {
      console.log(`[BookingService] Token expired: ${token} (expired ${booking.expires_at})`);
      return null;
    }

    console.log(`[BookingService] Token validated: ${token}`);
    return booking;
  } catch (err) {
    console.error(`[BookingService] Failed to validate token ${token}:`, err.message);
    throw err;
  }
}

/**
 * Confirm a booking: mark the token as used and create a new session for
 * the client.
 *
 * @param {string} token        - The booking UUID token
 * @param {string} sessionDate  - ISO date string for the session
 * @param {string} sessionType  - Type of session (e.g., 'Yoga', 'HIIT')
 * @returns {{ booking: object, session: object }|null}
 */
function confirmBooking(token, sessionDate, sessionType) {
  try {
    const booking = validateBooking(token);
    if (!booking) {
      console.log(`[BookingService] Cannot confirm invalid/expired token: ${token}`);
      return null;
    }

    // Mark booking as used (by token, not id)
    Booking.markUsed(booking.token);

    // Create a new session for the client
    const session = Session.create({
      client_id: booking.client_id,
      session_date: sessionDate,
      session_type: sessionType || 'General',
      duration_minutes: 60,
      completed: 0,
    });

    // Update client's last_session_at
    Client.update(booking.client_id, { last_session_at: sessionDate });

    console.log(`[BookingService] Booking confirmed: ${token}`);
    console.log(`[BookingService]   Client  : #${booking.client_id}`);
    console.log(`[BookingService]   Session : #${session.id} on ${sessionDate} (${sessionType || 'General'})`);

    return {
      booking: Booking.getByToken(token),
      session,
    };
  } catch (err) {
    console.error(`[BookingService] Failed to confirm booking ${token}:`, err.message);
    throw err;
  }
}

/**
 * Build the full booking page URL for a token.
 *
 * @param {string} token - The booking UUID token
 * @returns {string}
 */
function getBookingPageUrl(token) {
  const baseUrl = defaults.booking.baseUrl;
  return `${baseUrl}/book/${token}`;
}

/**
 * Delete all expired, unused booking records from the database.
 *
 * @returns {{ deleted: number }}
 */
function cleanupExpiredBookings() {
  try {
    const result = Booking.deleteExpired();
    const deleted = result.changes || 0;

    if (deleted > 0) {
      console.log(`[BookingService] Cleaned up ${deleted} expired booking(s)`);
    }

    return { deleted };
  } catch (err) {
    console.error('[BookingService] Failed to clean up expired bookings:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createBookingLink,
  validateBooking,
  confirmBooking,
  getBookingPageUrl,
  cleanupExpiredBookings,
};
