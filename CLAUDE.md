# Client Retention Automation — Fitness Studio

## Project Overview
Automated client retention system for fitness studios. Tracks session completions, triggers personalized follow-up emails at optimal intervals, and includes direct booking links to re-engage clients.

## Architecture
- **Backend**: Node.js + Express REST API
- **Database**: SQLite (portable, zero-config for demo)
- **Email**: Nodemailer (Ethereal SMTP for demo, swap to SendGrid for production)
- **Scheduler**: node-cron for background follow-up checks
- **Frontend**: Single-page dashboard with Tailwind CSS
- **Demo Mode**: Seed data, time acceleration, Ethereal email preview

## Core Modules
| Module | Path | Purpose |
|--------|------|---------|
| API Server | `src/api/` | Express routes for clients, sessions, follow-ups, bookings |
| Retention Engine | `src/services/retentionEngine.js` | Rules engine — decides when to trigger follow-ups |
| Email Service | `src/services/emailService.js` | Sends personalized emails with booking links |
| Booking Service | `src/services/bookingService.js` | Generates unique booking tokens and links |
| Scheduler | `src/services/scheduler.js` | Cron job that runs retention checks |
| Dashboard | `src/dashboard/` | Studio owner UI — client list, follow-up status, analytics |

## Database Schema
- `clients` — name, email, membership_type, joined_at
- `sessions` — client_id, session_date, session_type, completed
- `follow_up_rules` — trigger_days, template_id, priority, active
- `email_templates` — name, subject, body (with {{variables}})
- `follow_ups` — client_id, rule_id, scheduled_at, sent_at, status, email_preview_url
- `bookings` — client_id, token, url, expires_at, used

## Follow-Up Logic
1. Client completes a session → record in DB
2. Scheduler runs every hour (every 10s in demo mode)
3. For each client: calculate days since last session
4. Match against active follow-up rules
5. If match found and no pending follow-up exists → create and send email
6. Email includes personalized greeting + direct booking link

## Default Follow-Up Rules
| Days Since Last Session | Email Type |
|------------------------|------------|
| 3 days | Gentle check-in |
| 7 days | Motivation + offer |
| 14 days | Win-back with incentive |
| 30 days | Re-engagement campaign |

## Demo Features
- Time acceleration (simulate days passing in seconds)
- Pre-seeded client data with varied session histories
- Ethereal email preview (view sent emails in browser)
- Real-time dashboard updates
- One-click booking flow

## Commands
```bash
npm install          # Install dependencies
npm run seed         # Seed demo data
npm run dev          # Start server + scheduler + dashboard
npm run demo         # Full demo mode (seed + accelerated time)
```

## Rules
- All emails must include unsubscribe link
- Booking links expire after 72 hours
- Never send more than 1 follow-up per rule per client
- Respect quiet hours (no emails before 8am or after 9pm)
