'use strict';

// ---------------------------------------------------------------------------
// Minimal test runner for Client Retention Automation
// ---------------------------------------------------------------------------

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  dim:    '\x1b[2m',
};

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  passed++;
  console.log(`  ${c.green}PASS${c.reset}  ${name}`);
}

function fail(name, err) {
  failed++;
  failures.push({ name, err });
  console.log(`  ${c.red}FAIL${c.reset}  ${name}`);
  console.log(`        ${c.dim}${err.message || err}${c.reset}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

console.log(`\n${c.bold}  Running tests...${c.reset}\n`);

// 1. Database connection
try {
  const db = require('../src/models/database');
  assert(db, 'Database module should export a truthy value');
  // Quick query to verify the connection works
  const row = db.prepare("SELECT 1 AS ok").get();
  assert(row.ok === 1, 'SELECT 1 should return { ok: 1 }');
  pass('Database connection');
} catch (err) {
  fail('Database connection', err);
}

// 2. Table existence
try {
  const db = require('../src/models/database');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(r => r.name);

  const expected = ['bookings', 'clients', 'email_templates', 'follow_up_rules', 'follow_ups', 'sessions'];
  for (const t of expected) {
    assert(tables.includes(t), `Table "${t}" should exist, found: ${tables.join(', ')}`);
  }
  pass('All required tables exist');
} catch (err) {
  fail('All required tables exist', err);
}

// 3. Create a client
let testClientId;
try {
  const Client = require('../src/models/Client');
  const client = Client.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    phone: '555-9999',
    membership_type: 'standard',
  });
  assert(client, 'Client.create should return the new client');
  assert(client.id, 'New client should have an id');
  assert(client.name === 'Test User', `Name should be "Test User", got "${client.name}"`);
  assert(client.status === 'active', `Default status should be "active", got "${client.status}"`);
  testClientId = client.id;
  pass('Create a client');
} catch (err) {
  fail('Create a client', err);
}

// 4. Retrieve client by ID
try {
  const Client = require('../src/models/Client');
  assert(testClientId, 'testClientId must be set from previous test');
  const client = Client.getById(testClientId);
  assert(client, 'getById should return the client');
  assert(client.name === 'Test User', 'Retrieved client name should match');
  pass('Retrieve client by ID');
} catch (err) {
  fail('Retrieve client by ID', err);
}

// 5. Create a session
let testSessionId;
try {
  const Session = require('../src/models/Session');
  assert(testClientId, 'testClientId must be set from previous test');
  const session = Session.create({
    client_id: testClientId,
    session_date: new Date().toISOString(),
    session_type: 'HIIT',
    duration_minutes: 45,
    completed: 1,
  });
  assert(session, 'Session.create should return the new session');
  assert(session.id, 'New session should have an id');
  assert(session.session_type === 'HIIT', `Session type should be "HIIT", got "${session.session_type}"`);
  assert(session.duration_minutes === 45, `Duration should be 45, got ${session.duration_minutes}`);
  testSessionId = session.id;
  pass('Create a session');
} catch (err) {
  fail('Create a session', err);
}

// 6. Retrieve sessions by client
try {
  const Session = require('../src/models/Session');
  assert(testClientId, 'testClientId must be set');
  const sessions = Session.findByClientId(testClientId);
  assert(Array.isArray(sessions), 'findByClientId should return an array');
  assert(sessions.length >= 1, 'Should find at least 1 session');
  pass('Retrieve sessions by client');
} catch (err) {
  fail('Retrieve sessions by client', err);
}

// 7. Follow-up rule matching
try {
  const db = require('../src/models/database');

  // Insert a test template
  const tplInfo = db.prepare(`
    INSERT INTO email_templates (name, subject, body, created_at)
    VALUES ('test-tpl', 'Test Subject', 'Test Body', ?)
  `).run(new Date().toISOString());

  // Insert a follow-up rule
  const ruleInfo = db.prepare(`
    INSERT INTO follow_up_rules (name, trigger_days, template_id, priority, active)
    VALUES ('Test Rule', 5, ?, 1, 1)
  `).run(tplInfo.lastInsertRowid);

  // Query for rules that would match a client absent 6 days
  const matchingRules = db.prepare(`
    SELECT * FROM follow_up_rules WHERE trigger_days <= ? AND active = 1 ORDER BY trigger_days DESC
  `).all(6);

  assert(matchingRules.length >= 1, 'Should find at least 1 matching rule for 6 days absent');
  const found = matchingRules.some(r => r.name === 'Test Rule');
  assert(found, 'Test Rule should be among matching rules');
  pass('Follow-up rule matching');

  // Clean up
  db.prepare('DELETE FROM follow_up_rules WHERE id = ?').run(ruleInfo.lastInsertRowid);
  db.prepare('DELETE FROM email_templates WHERE id = ?').run(tplInfo.lastInsertRowid);
} catch (err) {
  fail('Follow-up rule matching', err);
}

// 8. Booking link creation and validation
try {
  const db = require('../src/models/database');
  const { v4: uuidv4 } = require('uuid');

  assert(testClientId, 'testClientId must be set');
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO bookings (client_id, token, booking_url, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(testClientId, token, `http://localhost:3000/book/${token}`, expiresAt, new Date().toISOString());

  // Validate the booking exists and is not expired
  const booking = db.prepare('SELECT * FROM bookings WHERE token = ?').get(token);
  assert(booking, 'Booking should be retrievable by token');
  assert(booking.used === 0, 'Booking should not be used yet');
  assert(new Date(booking.expires_at) > new Date(), 'Booking should not be expired');

  // Mark as used
  db.prepare('UPDATE bookings SET used = 1 WHERE token = ?').run(token);
  const usedBooking = db.prepare('SELECT * FROM bookings WHERE token = ?').get(token);
  assert(usedBooking.used === 1, 'Booking should be marked as used');

  pass('Booking link creation and validation');

  // Clean up
  db.prepare('DELETE FROM bookings WHERE token = ?').run(token);
} catch (err) {
  fail('Booking link creation and validation', err);
}

// 9. Email template rendering
try {
  const db = require('../src/models/database');

  // Insert a template with placeholders
  const tplInfo = db.prepare(`
    INSERT INTO email_templates (name, subject, body, created_at)
    VALUES ('render-test', 'Hello {{first_name}}!', 'Hi {{first_name}}, your last {{session_type}} session was great!', ?)
  `).run(new Date().toISOString());

  const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(tplInfo.lastInsertRowid);
  assert(template, 'Template should be retrievable');

  // Simple rendering — replace placeholders
  const data = { first_name: 'Sarah', session_type: 'Yoga' };
  let renderedSubject = template.subject;
  let renderedBody = template.body;
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    renderedSubject = renderedSubject.replace(regex, val);
    renderedBody = renderedBody.replace(regex, val);
  }

  assert(renderedSubject === 'Hello Sarah!', `Subject should be "Hello Sarah!", got "${renderedSubject}"`);
  assert(renderedBody.includes('Hi Sarah'), 'Body should contain "Hi Sarah"');
  assert(renderedBody.includes('Yoga'), 'Body should contain "Yoga"');
  assert(!renderedBody.includes('{{'), 'Body should not contain unresolved placeholders');

  pass('Email template rendering');

  // Clean up
  db.prepare('DELETE FROM email_templates WHERE id = ?').run(tplInfo.lastInsertRowid);
} catch (err) {
  fail('Email template rendering', err);
}

// 10. Client status update
try {
  const Client = require('../src/models/Client');
  assert(testClientId, 'testClientId must be set');

  const updated = Client.updateStatus(testClientId, 'inactive');
  assert(updated.status === 'inactive', `Status should be "inactive", got "${updated.status}"`);

  // Restore
  Client.updateStatus(testClientId, 'active');
  pass('Client status update');
} catch (err) {
  fail('Client status update', err);
}

// 11. Session count by client (via findByClientId length)
try {
  const Session = require('../src/models/Session');
  assert(testClientId, 'testClientId must be set');
  const sessions = Session.findByClientId(testClientId);
  assert(Array.isArray(sessions), 'findByClientId should return an array');
  const count = sessions.length;
  assert(typeof count === 'number', 'Session count should be a number');
  assert(count >= 1, `Should have at least 1 session, got ${count}`);
  pass('Session count by client');
} catch (err) {
  fail('Session count by client', err);
}

// ---- Cleanup test data ----
try {
  const db = require('../src/models/database');
  if (testClientId) {
    db.prepare('DELETE FROM bookings WHERE client_id = ?').run(testClientId);
    db.prepare('DELETE FROM follow_ups WHERE client_id = ?').run(testClientId);
    db.prepare('DELETE FROM sessions WHERE client_id = ?').run(testClientId);
    db.prepare('DELETE FROM clients WHERE id = ?').run(testClientId);
  }
} catch (_) {
  // Cleanup errors are non-fatal
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n  ─────────────────────────────────────');
console.log(`  ${c.bold}Results:${c.reset}  ${c.green}${passed} passed${c.reset}  ${failed > 0 ? c.red : c.dim}${failed} failed${c.reset}`);
console.log('  ─────────────────────────────────────');

if (failures.length > 0) {
  console.log(`\n  ${c.red}${c.bold}Failures:${c.reset}\n`);
  for (const f of failures) {
    console.log(`    ${c.red}x${c.reset} ${f.name}`);
    console.log(`      ${c.dim}${f.err.message || f.err}${c.reset}`);
  }
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
