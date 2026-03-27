'use strict';

const db = require('./database');

// ---------------------------------------------------------------------------
// Prepared statements
// ---------------------------------------------------------------------------

const stmts = {
  findAll: db.prepare(`SELECT * FROM email_templates ORDER BY name ASC`),

  findById: db.prepare(`SELECT * FROM email_templates WHERE id = ?`),

  insert: db.prepare(`
    INSERT INTO email_templates (name, subject, body, created_at)
    VALUES (@name, @subject, @body, @created_at)
  `),

  update: db.prepare(`
    UPDATE email_templates
    SET name    = COALESCE(@name, name),
        subject = COALESCE(@subject, subject),
        body    = COALESCE(@body, body)
    WHERE id = @id
  `),
};

// ---------------------------------------------------------------------------
// Default variable values (used when a variable is not provided)
// ---------------------------------------------------------------------------

const DEFAULT_VARS = {
  name: 'there',
  booking_link: '#',
  days_since: '?',
  studio_name: 'Our Studio',
  date: new Date().toLocaleDateString(),
};

// ---------------------------------------------------------------------------
// EmailTemplate model
// ---------------------------------------------------------------------------

const EmailTemplate = {
  /**
   * Return all templates ordered by name.
   */
  findAll() {
    return stmts.findAll.all();
  },

  /**
   * Find a single template by primary key.
   */
  findById(id) {
    return stmts.findById.get(id) || null;
  },

  /**
   * Create a new email template. Returns the created row.
   */
  create(data) {
    const now = new Date().toISOString();
    const params = {
      name: data.name,
      subject: data.subject,
      body: data.body,
      created_at: now,
    };
    const info = stmts.insert.run(params);
    return stmts.findById.get(info.lastInsertRowid);
  },

  /**
   * Update an existing template. Returns the updated row.
   */
  update(id, data) {
    const params = {
      id,
      name: data.name ?? null,
      subject: data.subject ?? null,
      body: data.body ?? null,
    };
    stmts.update.run(params);
    return stmts.findById.get(id) || null;
  },

  /**
   * Render a template by replacing {{variable}} placeholders in the
   * subject and body with the supplied variables.
   *
   * Supported variables: name, booking_link, days_since, studio_name,
   * date, and any custom key you pass in.
   *
   * @param {number} id - Template ID
   * @param {object} variables - Key/value pairs for replacement
   * @returns {{ subject: string, body: string } | null}
   */
  render(id, variables = {}) {
    const template = stmts.findById.get(id);
    if (!template) return null;

    const vars = { ...DEFAULT_VARS, ...variables };

    const replace = (text) =>
      text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
      });

    return {
      subject: replace(template.subject),
      body: replace(template.body),
    };
  },
};

// Aliases for compatibility with emailService and retentionEngine
EmailTemplate.getById = EmailTemplate.findById;
EmailTemplate.getAll = EmailTemplate.findAll;
EmailTemplate.getByName = function (name) {
  return db.prepare('SELECT * FROM email_templates WHERE name = ?').get(name) || null;
};

module.exports = EmailTemplate;
