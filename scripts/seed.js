'use strict';

const db = require('../src/models/database');
const defaults = require('../src/config/defaults');
const { emailTemplates, followUpRules } = defaults;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return an ISO string for `daysAgo` days before now */
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Return an ISO string for `daysAgo` days before now at a given hour */
function daysAgoAt(days, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Pick a random element from an array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a realistic session history for a client */
function generateSessions(clientId, sessionType, pattern) {
  const sessions = [];
  const { startDaysAgo, intervalMin, intervalMax, count } = pattern;
  let cursor = startDaysAgo;

  for (let i = 0; i < count; i++) {
    const hour = pick([6, 7, 8, 9, 10, 16, 17, 18, 19]);
    const duration = sessionType === 'HIIT' ? pick([30, 45]) : pick([45, 60, 75]);
    sessions.push({
      client_id: clientId,
      session_date: daysAgoAt(cursor, hour),
      session_type: sessionType,
      duration_minutes: duration,
      completed: 1,
      notes: null,
      created_at: daysAgoAt(cursor, hour),
    });
    const gap = intervalMin + Math.floor(Math.random() * (intervalMax - intervalMin + 1));
    cursor += gap;
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// Client definitions — each tells part of a retention story
// ---------------------------------------------------------------------------

const clientProfiles = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '555-0101',
    membership_type: 'premium',
    status: 'active',
    sessionType: 'Yoga',
    lastSessionDays: 2,
    pattern: { startDaysAgo: 2, intervalMin: 2, intervalMax: 3, count: 15 },
  },
  {
    name: 'Marcus Johnson',
    email: 'marcus.j@email.com',
    phone: '555-0102',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'HIIT',
    lastSessionDays: 5,
    pattern: { startDaysAgo: 5, intervalMin: 2, intervalMax: 4, count: 12 },
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '555-0103',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Pilates',
    lastSessionDays: 8,
    pattern: { startDaysAgo: 8, intervalMin: 3, intervalMax: 5, count: 10 },
  },
  {
    name: 'James Wilson',
    email: 'james.w@email.com',
    phone: '555-0104',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Strength Training',
    lastSessionDays: 16,
    pattern: { startDaysAgo: 16, intervalMin: 2, intervalMax: 4, count: 12 },
  },
  {
    name: 'Priya Patel',
    email: 'priya.p@email.com',
    phone: '555-0105',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Cardio',
    lastSessionDays: 35,
    pattern: { startDaysAgo: 35, intervalMin: 4, intervalMax: 7, count: 8 },
  },
  {
    name: 'David Kim',
    email: 'david.k@email.com',
    phone: '555-0106',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Group Fitness',
    lastSessionDays: 1,
    pattern: { startDaysAgo: 1, intervalMin: 0, intervalMax: 0, count: 1 },
  },
  {
    name: 'Lisa Thompson',
    email: 'lisa.t@email.com',
    phone: '555-0107',
    membership_type: 'premium',
    status: 'active',
    sessionType: 'Yoga',
    lastSessionDays: 1,
    pattern: { startDaysAgo: 1, intervalMin: 2, intervalMax: 3, count: 15 },
  },
  {
    name: 'Mike Brown',
    email: 'mike.b@email.com',
    phone: '555-0108',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Strength Training',
    lastSessionDays: 10,
    pattern: { startDaysAgo: 10, intervalMin: 2, intervalMax: 3, count: 14 },
  },
  {
    name: 'Anna Kowalski',
    email: 'anna.k@email.com',
    phone: '555-0109',
    membership_type: 'premium',
    status: 'active',
    sessionType: 'Pilates',
    lastSessionDays: 4,
    pattern: { startDaysAgo: 4, intervalMin: 2, intervalMax: 3, count: 13 },
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.m@email.com',
    phone: '555-0110',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Group Fitness',
    lastSessionDays: 12,
    pattern: { startDaysAgo: 12, intervalMin: 3, intervalMax: 5, count: 9 },
  },
  {
    name: 'Rachel Foster',
    email: 'rachel.f@email.com',
    phone: '555-0111',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Yoga',
    lastSessionDays: 1,
    pattern: { startDaysAgo: 1, intervalMin: 1, intervalMax: 2, count: 15 },
  },
  {
    name: 'Tom Harris',
    email: 'tom.h@email.com',
    phone: '555-0112',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'HIIT',
    lastSessionDays: 20,
    pattern: { startDaysAgo: 20, intervalMin: 3, intervalMax: 5, count: 8 },
  },
  {
    name: 'Nina Gupta',
    email: 'nina.g@email.com',
    phone: '555-0113',
    membership_type: 'standard',
    status: 'active',
    sessionType: 'Cardio',
    lastSessionDays: 6,
    pattern: { startDaysAgo: 6, intervalMin: 5, intervalMax: 8, count: 6 },
  },
  {
    name: 'Chris Lee',
    email: 'chris.l@email.com',
    phone: '555-0114',
    membership_type: 'premium',
    status: 'active',
    sessionType: 'Strength Training',
    lastSessionDays: 9,
    pattern: { startDaysAgo: 9, intervalMin: 3, intervalMax: 4, count: 10 },
  },
  {
    name: 'Zoe Martinez',
    email: 'zoe.m@email.com',
    phone: '555-0115',
    membership_type: 'trial',
    status: 'active',
    sessionType: 'Group Fitness',
    lastSessionDays: 25,
    pattern: { startDaysAgo: 25, intervalMin: 0, intervalMax: 0, count: 1 },
  },
];

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

function seed() {
  console.log('\n  Seeding database...\n');

  // ---- Clear all existing data (order matters for foreign keys) ----------
  db.exec('DELETE FROM follow_ups');
  db.exec('DELETE FROM bookings');
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM follow_up_rules');
  db.exec('DELETE FROM email_templates');
  db.exec('DELETE FROM clients');

  // Reset auto-increment counters
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('clients','sessions','email_templates','follow_up_rules','follow_ups','bookings')");

  // ---- Insert email templates -------------------------------------------
  const insertTemplate = db.prepare(`
    INSERT INTO email_templates (name, subject, body, created_at)
    VALUES (@name, @subject, @body, @created_at)
  `);

  const templateMap = {};
  for (const tpl of emailTemplates) {
    const info = insertTemplate.run({
      ...tpl,
      created_at: new Date().toISOString(),
    });
    templateMap[tpl.name] = info.lastInsertRowid;
  }
  console.log(`  [+] ${emailTemplates.length} email templates inserted`);

  // ---- Insert follow-up rules -------------------------------------------
  const insertRule = db.prepare(`
    INSERT INTO follow_up_rules (name, trigger_days, template_id, priority, active)
    VALUES (@name, @trigger_days, @template_id, @priority, @active)
  `);

  const ruleMap = {};
  for (let i = 0; i < followUpRules.length; i++) {
    const rule = followUpRules[i];
    const templateId = templateMap[rule.templateName];
    const info = insertRule.run({
      name: rule.name,
      trigger_days: rule.trigger_days,
      template_id: templateId,
      priority: i + 1,
      active: 1,
    });
    ruleMap[rule.trigger_days] = info.lastInsertRowid;
  }
  console.log(`  [+] ${followUpRules.length} follow-up rules inserted`);

  // ---- Insert clients and their sessions --------------------------------
  const insertClient = db.prepare(`
    INSERT INTO clients (name, email, phone, membership_type, joined_at, last_session_at, status)
    VALUES (@name, @email, @phone, @membership_type, @joined_at, @last_session_at, @status)
  `);

  const insertSession = db.prepare(`
    INSERT INTO sessions (client_id, session_date, session_type, duration_minutes, completed, notes, created_at)
    VALUES (@client_id, @session_date, @session_type, @duration_minutes, @completed, @notes, @created_at)
  `);

  let totalSessions = 0;
  const clientIds = {};

  const insertAllClients = db.transaction(() => {
    for (const profile of clientProfiles) {
      // Calculate joined_at based on pattern (oldest session + a few days before)
      const oldestSessionDays = profile.pattern.startDaysAgo +
        (profile.pattern.count - 1) * ((profile.pattern.intervalMin + profile.pattern.intervalMax) / 2);
      const joinedDaysAgo = Math.min(oldestSessionDays + 5, 90);

      const clientInfo = insertClient.run({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        membership_type: profile.membership_type,
        joined_at: daysAgo(joinedDaysAgo),
        last_session_at: daysAgoAt(profile.lastSessionDays, pick([7, 8, 9, 17, 18])),
        status: profile.status,
      });

      const clientId = clientInfo.lastInsertRowid;
      clientIds[profile.name] = clientId;

      // Generate sessions
      const sessions = generateSessions(clientId, profile.sessionType, profile.pattern);
      for (const sess of sessions) {
        insertSession.run(sess);
      }
      totalSessions += sessions.length;
    }
  });

  insertAllClients();
  console.log(`  [+] ${clientProfiles.length} clients inserted`);
  console.log(`  [+] ${totalSessions} sessions inserted`);

  // ---- Insert sample follow-ups (some sent, some pending) ---------------
  const insertFollowUp = db.prepare(`
    INSERT INTO follow_ups (client_id, rule_id, scheduled_at, sent_at, status, email_preview_url, booking_id)
    VALUES (@client_id, @rule_id, @scheduled_at, @sent_at, @status, @email_preview_url, @booking_id)
  `);

  const sampleFollowUps = [
    // Marcus got a 3-day check-in that was sent
    {
      client_id: clientIds['Marcus Johnson'],
      rule_id: ruleMap[3],
      scheduled_at: daysAgoAt(2, 10),
      sent_at: daysAgoAt(2, 10),
      status: 'sent',
      email_preview_url: null,
      booking_id: null,
    },
    // Emily should have a 7-day motivation pending
    {
      client_id: clientIds['Emily Rodriguez'],
      rule_id: ruleMap[7],
      scheduled_at: daysAgoAt(1, 9),
      sent_at: null,
      status: 'pending',
      email_preview_url: null,
      booking_id: null,
    },
    // James got a 14-day win-back that was sent
    {
      client_id: clientIds['James Wilson'],
      rule_id: ruleMap[14],
      scheduled_at: daysAgoAt(2, 10),
      sent_at: daysAgoAt(2, 10),
      status: 'sent',
      email_preview_url: null,
      booking_id: null,
    },
    // Priya has a 30-day re-engagement pending
    {
      client_id: clientIds['Priya Patel'],
      rule_id: ruleMap[30],
      scheduled_at: daysAgoAt(5, 9),
      sent_at: daysAgoAt(5, 9),
      status: 'sent',
      email_preview_url: null,
      booking_id: null,
    },
    // Tom should have a 14-day follow-up pending
    {
      client_id: clientIds['Tom Harris'],
      rule_id: ruleMap[14],
      scheduled_at: daysAgoAt(6, 10),
      sent_at: null,
      status: 'pending',
      email_preview_url: null,
      booking_id: null,
    },
    // Zoe should have a 14-day + 30-day pending (trial risk)
    {
      client_id: clientIds['Zoe Martinez'],
      rule_id: ruleMap[14],
      scheduled_at: daysAgoAt(11, 9),
      sent_at: daysAgoAt(11, 9),
      status: 'sent',
      email_preview_url: null,
      booking_id: null,
    },
  ];

  for (const fu of sampleFollowUps) {
    insertFollowUp.run(fu);
  }
  console.log(`  [+] ${sampleFollowUps.length} follow-ups inserted`);

  // ---- Insert sample bookings -------------------------------------------
  const { v4: uuidv4 } = require('uuid');

  const insertBooking = db.prepare(`
    INSERT INTO bookings (client_id, token, booking_url, expires_at, used, created_at)
    VALUES (@client_id, @token, @booking_url, @expires_at, @used, @created_at)
  `);

  const token1 = uuidv4();
  const token2 = uuidv4();

  const sampleBookings = [
    // James used his booking link
    {
      client_id: clientIds['James Wilson'],
      token: token1,
      booking_url: `http://localhost:3000/book/${token1}`,
      expires_at: daysAgoAt(-7, 23), // expires in 7 days
      used: 1,
      created_at: daysAgoAt(3, 10),
    },
    // Priya has a pending booking link
    {
      client_id: clientIds['Priya Patel'],
      token: token2,
      booking_url: `http://localhost:3000/book/${token2}`,
      expires_at: daysAgoAt(-5, 23), // expires in 5 days
      used: 0,
      created_at: daysAgoAt(2, 10),
    },
  ];

  for (const bk of sampleBookings) {
    insertBooking.run(bk);
  }
  console.log(`  [+] ${sampleBookings.length} bookings inserted`);

  // ---- Summary table ----------------------------------------------------
  console.log('\n  ─────────────────────────────────────────────────────────────');
  console.log('  SEED SUMMARY');
  console.log('  ─────────────────────────────────────────────────────────────');

  const clientSummary = clientProfiles.map((p) => {
    const daysSince = p.lastSessionDays;
    let retentionStatus;
    if (daysSince <= 3) retentionStatus = 'Active';
    else if (daysSince <= 7) retentionStatus = 'Check-in needed';
    else if (daysSince <= 14) retentionStatus = 'At risk';
    else if (daysSince <= 30) retentionStatus = 'Win-back';
    else retentionStatus = 'Re-engage';

    return {
      Name: p.name,
      Type: p.sessionType,
      Membership: p.membership_type,
      'Days Since': daysSince,
      Sessions: p.pattern.count,
      Status: retentionStatus,
    };
  });

  console.table(clientSummary);

  console.log('  ─────────────────────────────────────────────────────────────');
  console.log(`  Total clients:    ${clientProfiles.length}`);
  console.log(`  Total sessions:   ${totalSessions}`);
  console.log(`  Email templates:  ${emailTemplates.length}`);
  console.log(`  Follow-up rules:  ${followUpRules.length}`);
  console.log(`  Sample follow-ups: ${sampleFollowUps.length}`);
  console.log(`  Sample bookings:  ${sampleBookings.length}`);
  console.log('  ─────────────────────────────────────────────────────────────');
  console.log('\n  Database seeded successfully!\n');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

try {
  seed();
} catch (err) {
  console.error('\n  Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
