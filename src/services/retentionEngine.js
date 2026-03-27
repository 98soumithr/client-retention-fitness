'use strict';

const db = require('../models/database');
const Client = require('../models/Client');
const Session = require('../models/Session');
const FollowUp = require('../models/FollowUp');
const Booking = require('../models/Booking');
const EmailTemplate = require('../models/EmailTemplate');
const bookingService = require('./bookingService');
const emailService = require('./emailService');
const defaults = require('../config/defaults');

// ---------------------------------------------------------------------------
// Prepared statements for rules and stats
// ---------------------------------------------------------------------------

const ruleStmts = {
  getActiveRules: db.prepare(`
    SELECT r.*, t.name AS template_name, t.subject, t.body
    FROM follow_up_rules r
    LEFT JOIN email_templates t ON t.id = r.template_id
    WHERE r.active = 1
    ORDER BY r.trigger_days ASC
  `),
  getAllRules: db.prepare(`
    SELECT r.*, t.name AS template_name
    FROM follow_up_rules r
    LEFT JOIN email_templates t ON t.id = r.template_id
    ORDER BY r.trigger_days ASC
  `),
  getRuleByName: db.prepare('SELECT * FROM follow_up_rules WHERE name = ?'),
};

// ---------------------------------------------------------------------------
// Core retention logic
// ---------------------------------------------------------------------------

/**
 * Main retention check -- called periodically by the scheduler.
 *
 * 1. Get all active clients needing follow-up (3+ days since last session)
 * 2. For each client, use the pre-calculated days_since value
 * 3. Match against active follow-up rules (sorted by trigger_days ascending)
 * 4. If a match is found AND no existing follow-up for that client+rule: trigger
 * 5. Return a summary of actions taken
 *
 * @returns {Promise<{ checked: number, triggered: number, skipped: number, errors: number, details: Array }>}
 */
async function checkAllClients() {
  const summary = {
    checked: 0,
    triggered: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    // Get active clients whose last completed session was 3+ days ago
    // Each result includes .days_since and .most_recent_session
    const clients = Client.getClientsNeedingFollowUp();
    summary.checked = clients.length;

    console.log(`[RetentionEngine] Checking ${clients.length} client(s) for follow-up`);

    // Load active rules from DB (joined with templates)
    const dbRules = ruleStmts.getActiveRules.all();

    if (dbRules.length === 0) {
      console.log('[RetentionEngine] No active follow-up rules configured in DB');
    }

    // Also build a fallback list from defaults config, sorted ascending
    const defaultRules = [...defaults.followUpRules].sort((a, b) => a.trigger_days - b.trigger_days);

    for (const client of clients) {
      try {
        const daysSince = client.days_since;

        // --- Strategy 1: Match against database rules ---
        let matched = false;

        if (dbRules.length > 0) {
          // Find the highest-trigger rule that the client qualifies for
          let bestRule = null;
          for (const rule of dbRules) {
            if (daysSince >= rule.trigger_days) {
              bestRule = rule;
            }
          }

          if (bestRule) {
            // Check if follow-up already exists for this client + rule
            if (FollowUp.hasExistingFollowUp(client.id, bestRule.id)) {
              summary.skipped++;
              summary.details.push({
                client: client.name,
                action: 'skipped',
                reason: `Already has follow-up for rule '${bestRule.name}'`,
              });
              continue;
            }

            // Build template object from the joined data
            const template = bestRule.subject
              ? { subject: bestRule.subject, body: bestRule.body }
              : null;

            if (template) {
              const result = await triggerFollowUp(client, bestRule, template, bestRule.id);
              summary.triggered++;
              summary.details.push({
                client: client.name,
                action: 'triggered',
                rule: bestRule.name,
                daysSince,
                previewUrl: result.previewUrl || null,
              });
              matched = true;
            }
          }
        }

        // --- Strategy 2: Fall back to defaults config if no DB rule matched ---
        if (!matched) {
          let bestDefault = null;
          for (const rule of defaultRules) {
            if (daysSince >= rule.trigger_days) {
              bestDefault = rule;
            }
          }

          if (!bestDefault) {
            summary.skipped++;
            continue;
          }

          // Look up the template from DB by the defaults templateName
          const template = EmailTemplate.getByName(bestDefault.templateName);
          if (!template) {
            console.warn(`[RetentionEngine] Template '${bestDefault.templateName}' not found for default rule '${bestDefault.name}', skipping`);
            summary.skipped++;
            continue;
          }

          // Look up the DB rule by name (if it exists) for proper tracking
          const dbRule = ruleStmts.getRuleByName.get(bestDefault.name);
          const ruleId = dbRule ? dbRule.id : null;

          if (ruleId && FollowUp.hasExistingFollowUp(client.id, ruleId)) {
            summary.skipped++;
            summary.details.push({
              client: client.name,
              action: 'skipped',
              reason: `Already has follow-up for default rule '${bestDefault.name}'`,
            });
            continue;
          }

          const result = await triggerFollowUp(client, bestDefault, template, ruleId);
          summary.triggered++;
          summary.details.push({
            client: client.name,
            action: 'triggered',
            rule: bestDefault.name,
            daysSince,
            previewUrl: result.previewUrl || null,
          });
        }
      } catch (clientErr) {
        summary.errors++;
        summary.details.push({
          client: client.name,
          action: 'error',
          error: clientErr.message,
        });
        console.error(`[RetentionEngine] Error processing client #${client.id} (${client.name}):`, clientErr.message);
      }
    }

    console.log(`[RetentionEngine] Check complete: ${summary.triggered} triggered, ${summary.skipped} skipped, ${summary.errors} error(s)`);
    return summary;
  } catch (err) {
    console.error('[RetentionEngine] checkAllClients failed:', err.message);
    throw err;
  }
}

/**
 * Trigger a follow-up for a specific client:
 * 1. Create a booking link
 * 2. Render and send the email via emailService
 * 3. Record the follow-up in the database
 *
 * @param {object}      client   - Client record (with .id, .name, .email, .days_since)
 * @param {object}      rule     - Rule object (from DB or defaults, with .name, .trigger_days)
 * @param {object}      template - Template with .subject and .body
 * @param {number|null} ruleId   - Database follow_up_rules.id (or null if no DB rule)
 * @returns {Promise<{ followUp: object, previewUrl: string|null }>}
 */
async function triggerFollowUp(client, rule, template, ruleId) {
  try {
    console.log(`[RetentionEngine] Triggering '${rule.name}' for ${client.name} (${client.email})`);

    // 1. Create booking link
    const { token, url: bookingUrl, booking } = bookingService.createBookingLink(client.id);

    // 2. Render and send email
    const emailResult = await emailService.sendFollowUpEmail(client, template, bookingUrl);

    // 3. Record the follow-up in the database
    const followUp = FollowUp.create({
      client_id: client.id,
      rule_id: ruleId,
      scheduled_at: new Date().toISOString(),
      status: 'sent',
      sent_at: new Date().toISOString(),
      email_preview_url: emailResult.previewUrl || null,
      booking_id: booking.id,
    });

    // Ensure status is marked as 'sent' with all metadata
    FollowUp.updateStatus(followUp.id, 'sent', {
      sent_at: new Date().toISOString(),
      email_preview_url: emailResult.previewUrl || null,
      booking_id: booking.id,
    });

    console.log(`[RetentionEngine] Follow-up recorded: #${followUp.id} for client #${client.id}`);

    return {
      followUp,
      previewUrl: emailResult.previewUrl,
    };
  } catch (err) {
    console.error(`[RetentionEngine] triggerFollowUp failed for client #${client.id}:`, err.message);
    throw err;
  }
}

/**
 * Return retention dashboard statistics.
 *
 * @returns {{ totalClients: number, activeClients: number, pendingFollowUps: number, sentToday: number, bookingRate: number }}
 */
function getRetentionStats() {
  try {
    // Total clients
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    const totalClients = totalRow.count;

    // Active clients
    const activeRow = db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get();
    const activeClients = activeRow.count;

    // Pending follow-ups
    const followUpStats = FollowUp.getStats();
    const pendingFollowUps = followUpStats.pending || 0;

    // Emails sent today
    const sentTodayRow = db.prepare(`
      SELECT COUNT(*) as count FROM follow_ups
      WHERE date(sent_at) = date('now') AND status = 'sent'
    `).get();
    const sentToday = sentTodayRow.count;

    // Booking rate: used bookings / total bookings
    const totalBookings = Booking.countAll();
    const usedBookings = Booking.countUsed();
    const bookingRate = totalBookings > 0
      ? Math.round((usedBookings / totalBookings) * 100) / 100
      : 0;

    const stats = {
      totalClients,
      activeClients,
      pendingFollowUps,
      sentToday,
      bookingRate,
    };

    console.log('[RetentionEngine] Stats:', JSON.stringify(stats));
    return stats;
  } catch (err) {
    console.error('[RetentionEngine] getRetentionStats failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  checkAllClients,
  triggerFollowUp,
  getRetentionStats,
};
