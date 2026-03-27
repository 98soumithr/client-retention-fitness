'use strict';

const express = require('express');
const router = express.Router();

const FollowUp = require('../models/FollowUp');
const retentionEngine = require('../services/retentionEngine');

// ---------------------------------------------------------------------------
// GET /api/follow-ups — list all follow-ups with client and rule info
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const followUps = FollowUp.findAll();
    res.json({ success: true, data: followUps });
  } catch (err) {
    console.error('[API /follow-ups] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/follow-ups/pending — pending follow-ups only
// ---------------------------------------------------------------------------
router.get('/pending', (_req, res) => {
  try {
    const pending = FollowUp.getPending();
    res.json({ success: true, data: pending });
  } catch (err) {
    console.error('[API /follow-ups] GET /pending error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/follow-ups/stats — follow-up statistics
// ---------------------------------------------------------------------------
router.get('/stats', (_req, res) => {
  try {
    const stats = FollowUp.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[API /follow-ups] GET /stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/follow-ups/trigger — manually trigger retention check for all clients
// ---------------------------------------------------------------------------
router.post('/trigger', async (_req, res) => {
  try {
    const result = await retentionEngine.checkAllClients();
    res.json({
      success: true,
      data: result,
      message: `Retention check complete: ${result.triggered} follow-ups triggered, ${result.skipped} skipped`,
    });
  } catch (err) {
    console.error('[API /follow-ups] POST /trigger error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/follow-ups/:id/send — manually send a specific follow-up
// ---------------------------------------------------------------------------
router.post('/:id/send', async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Look up the follow-up with full info
    const followUp = FollowUp.getPending().find((f) => f.id === id);
    if (!followUp) {
      // Maybe it exists but is not pending
      const all = FollowUp.findAll().find((f) => f.id === id);
      if (!all) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }
      if (all.status === 'sent') {
        return res.status(400).json({ success: false, error: 'Follow-up has already been sent' });
      }
    }

    const result = await retentionEngine.triggerFollowUp(
      { id: followUp.client_id || followUp.client_id, name: followUp.client_name, email: followUp.client_email },
      { name: followUp.rule_name || 'Manual Send', trigger_days: 0 },
      followUp.template_id
        ? require('../models/EmailTemplate').getById(followUp.template_id)
        : { subject: `Checking in from FitLife Studio`, body: `Hi {{name}}, we miss you! Book your next session: {{booking_link}}` },
      followUp.rule_id
    );

    // Update original follow-up status
    FollowUp.updateStatus(id, 'sent', {
      sent_at: new Date().toISOString(),
      email_preview_url: result.previewUrl || null,
    });

    res.json({
      success: true,
      data: {
        followUp: FollowUp.findByClientId(followUp.client_id)[0],
        previewUrl: result.previewUrl || null,
      },
      message: 'Follow-up sent successfully',
    });
  } catch (err) {
    console.error('[API /follow-ups] POST /:id/send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
