'use strict';

const cron = require('node-cron');
const retentionEngine = require('./retentionEngine');
const bookingService = require('./bookingService');

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let cronJob = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date object into a readable timestamp string.
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Determine if demo mode is enabled via environment variable.
 */
function isDemoMode() {
  return process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
}

// ---------------------------------------------------------------------------
// Core run function
// ---------------------------------------------------------------------------

/**
 * Execute a single retention check cycle.
 * Logs timing and result summary.
 *
 * @returns {Promise<object>} - The summary from retentionEngine.checkAllClients()
 */
async function runRetentionCheck() {
  if (isRunning) {
    console.log(`[Scheduler] ${timestamp()} - Skipping: previous run still in progress`);
    return null;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log(`[Scheduler] ${timestamp()} - Retention check started`);

    // Run the main retention engine check
    const summary = await retentionEngine.checkAllClients();

    // Also clean up expired booking links
    const cleanup = bookingService.cleanupExpiredBookings();

    const elapsed = Date.now() - startTime;

    console.log(`[Scheduler] ${timestamp()} - Retention check complete (${elapsed}ms)`);
    console.log(`[Scheduler]   Clients checked : ${summary.checked}`);
    console.log(`[Scheduler]   Follow-ups sent : ${summary.triggered}`);
    console.log(`[Scheduler]   Skipped         : ${summary.skipped}`);
    console.log(`[Scheduler]   Errors          : ${summary.errors}`);
    if (cleanup.deleted > 0) {
      console.log(`[Scheduler]   Expired cleaned : ${cleanup.deleted}`);
    }

    return summary;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Scheduler] ${timestamp()} - Retention check failed after ${elapsed}ms:`, err.message);
    return null;
  } finally {
    isRunning = false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the background scheduler.
 *
 * - Normal mode: runs every hour at the top of the hour
 * - Demo mode (DEMO_MODE=true): runs every 10 seconds
 */
function start() {
  if (cronJob) {
    console.log('[Scheduler] Already running. Call stop() first to restart.');
    return;
  }

  const demo = isDemoMode();
  const schedule = demo ? '*/10 * * * * *' : '0 * * * *';
  const modeLabel = demo ? 'DEMO (every 10 seconds)' : 'PRODUCTION (every hour)';

  console.log(`[Scheduler] Starting in ${modeLabel} mode`);
  console.log(`[Scheduler] Cron expression: ${schedule}`);

  cronJob = cron.schedule(schedule, async () => {
    await runRetentionCheck();
  }, {
    scheduled: true,
    timezone: 'America/New_York',
  });

  console.log(`[Scheduler] ${timestamp()} - Scheduler started`);
}

/**
 * Stop the background scheduler.
 */
function stop() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log(`[Scheduler] ${timestamp()} - Scheduler stopped`);
  } else {
    console.log('[Scheduler] No active scheduler to stop');
  }
}

/**
 * Manually trigger a retention check (does not affect the cron schedule).
 *
 * @returns {Promise<object>} - The summary from the retention check
 */
async function runNow() {
  console.log(`[Scheduler] ${timestamp()} - Manual retention check triggered`);
  return await runRetentionCheck();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  start,
  stop,
  runNow,
};
