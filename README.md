# Client Retention Automation for Fitness Studios

Automated client retention system that detects at-risk members, sends personalized follow-up emails, and tracks re-engagement — so no client silently walks away.

## Features

- **Automatic risk detection** — Flags clients based on days since last session
- **Tiered follow-up engine** — 3-day check-in, 7-day motivation, 14-day win-back, 30-day re-engagement
- **Personalized email templates** — Dynamic placeholders for client name, session type, stats
- **Booking link tracking** — Unique, expiring links to measure email-to-booking conversion
- **Dashboard analytics** — Retention rate, at-risk count, follow-up activity at a glance
- **RESTful API** — Integrates with any gym management system (MindBody, Zen Planner, etc.)

## Quick Start

```bash
npm install
npm run seed      # Load demo data (15 clients, 100+ sessions)
npm run dev       # Start server at http://localhost:3000
```

## Architecture

```
client-retention-fitness/
├── src/
│   ├── server.js              # Express app entry point
│   ├── api/                   # REST API route handlers
│   ├── config/
│   │   └── defaults.js        # Email templates & follow-up rules
│   ├── dashboard/             # Frontend dashboard
│   │   ├── assets/
│   │   ├── components/
│   │   └── pages/
│   ├── middleware/             # Auth, error handling, logging
│   ├── models/
│   │   ├── database.js        # SQLite connection & schema
│   │   ├── Client.js          # Client CRUD operations
│   │   └── Session.js         # Session CRUD operations
│   ├── services/              # Business logic (follow-up engine, mailer)
│   └── utils/                 # Shared helpers
├── scripts/
│   ├── seed.js                # Database seeder with demo data
│   └── demo-walkthrough.js    # Guided demo script
├── tests/
│   └── run.js                 # Test runner
├── config/                    # Environment-specific config
├── data/                      # SQLite database (gitignored)
├── templates/                 # Email template files
└── docs/                      # Documentation
```

## API Endpoints

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| GET    | `/api/clients`                  | List all clients                     |
| GET    | `/api/clients/:id`              | Get client by ID                     |
| POST   | `/api/clients`                  | Create a new client                  |
| PUT    | `/api/clients/:id`              | Update client details                |
| DELETE | `/api/clients/:id`              | Remove a client                      |
| GET    | `/api/clients/:id/sessions`     | Get sessions for a client            |
| GET    | `/api/sessions`                 | List all sessions                    |
| POST   | `/api/sessions`                 | Log a new session                    |
| GET    | `/api/email-templates`          | List email templates                 |
| POST   | `/api/email-templates`          | Create a template                    |
| GET    | `/api/follow-up-rules`          | List follow-up rules                 |
| POST   | `/api/follow-up-rules`          | Create a follow-up rule              |
| GET    | `/api/follow-ups`               | List follow-ups (filter by status)   |
| POST   | `/api/follow-ups/trigger`       | Manually trigger follow-up scan      |
| GET    | `/api/bookings`                 | List booking links                   |
| GET    | `/book/:token`                  | Redeem a booking link                |
| GET    | `/api/dashboard/stats`          | Dashboard KPIs and metrics           |

## Demo

Run the full demo with pre-loaded data:

```bash
npm run demo
```

Or view the step-by-step demo guide:

```bash
node scripts/demo-walkthrough.js
```

The demo includes 15 clients with realistic attendance patterns:
- **Active clients** (Sarah Chen, Lisa Thompson, Rachel Foster) — visit regularly
- **At-risk clients** (Marcus Johnson, Nina Gupta) — starting to slip
- **Lapsed clients** (James Wilson, Tom Harris) — need win-back
- **Disengaged clients** (Priya Patel, Zoe Martinez) — require re-engagement

## Running Tests

```bash
npm test
```

Tests cover database connection, CRUD operations, follow-up rule matching, booking link validation, and email template rendering.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite via better-sqlite3
- **Email:** Nodemailer
- **Scheduling:** node-cron
- **Frontend:** HTML dashboard (served by Express)
