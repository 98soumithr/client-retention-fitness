'use strict';

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  under:   '\x1b[4m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlue:  '\x1b[44m',
  bgGreen: '\x1b[42m',
};

function heading(text) {
  console.log(`\n${c.bgBlue}${c.white}${c.bold}  ${text}  ${c.reset}\n`);
}

function step(num, title) {
  console.log(`  ${c.cyan}${c.bold}Step ${num}${c.reset}  ${c.bold}${title}${c.reset}`);
}

function action(text) {
  console.log(`  ${c.yellow}  ->  ${text}${c.reset}`);
}

function explain(text) {
  console.log(`  ${c.dim}       ${text}${c.reset}`);
}

function highlight(text) {
  console.log(`  ${c.green}${c.bold}  ★   ${text}${c.reset}`);
}

function separator() {
  console.log(`\n  ${c.dim}${'─'.repeat(60)}${c.reset}\n`);
}

function note(text) {
  console.log(`  ${c.magenta}  [!] ${text}${c.reset}`);
}

// ---------------------------------------------------------------------------
// Demo walkthrough
// ---------------------------------------------------------------------------

console.log(`
${c.bgGreen}${c.white}${c.bold}                                                              ${c.reset}
${c.bgGreen}${c.white}${c.bold}    CLIENT RETENTION AUTOMATION — DEMO WALKTHROUGH             ${c.reset}
${c.bgGreen}${c.white}${c.bold}    For Fitness Studio Owners                                  ${c.reset}
${c.bgGreen}${c.white}${c.bold}                                                              ${c.reset}
`);

console.log(`  ${c.dim}This walkthrough guides you through demonstrating the
  client retention automation system. Follow each step to
  showcase the key features.${c.reset}`);

separator();

// ---- Pre-demo setup ----
heading('PRE-DEMO SETUP');

step(0, 'Seed the database with demo data');
action('Run: npm run seed');
explain('This creates 15 realistic client profiles with varied');
explain('attendance patterns, sessions, and follow-up history.');

step(0.5, 'Start the server in demo mode');
action('Run: npm run demo');
explain('The server starts at http://localhost:3000 with demo mode enabled.');
explain('Demo mode enables sample data indicators in the dashboard.');

separator();

// ---- Dashboard overview ----
heading('PART 1: DASHBOARD OVERVIEW');

step(1, 'Open the Dashboard');
action('Navigate to http://localhost:3000 in your browser');
explain('The main dashboard loads showing retention metrics at a glance.');

step(2, 'Review the KPI cards at the top');
action('Point out: Active clients, At-risk clients, Follow-ups sent, Retention rate');
highlight('Key insight: "See how the system automatically identifies at-risk clients"');

step(3, 'Show the client activity timeline');
action('Scroll to the activity chart');
explain('This shows a 30-day view of client sessions vs. drop-offs.');
highlight('Key insight: "Visual patterns show when clients typically disengage"');

separator();

// ---- Client profiles ----
heading('PART 2: CLIENT PROFILES & RISK DETECTION');

step(4, 'Open the Clients page');
action('Click "Clients" in the sidebar or navigate to /api/clients');
explain('The client list shows all members with color-coded retention status.');

step(5, 'Show a healthy client — Sarah Chen');
action('Click on Sarah Chen\'s profile');
explain('Sarah visited 2 days ago. Status: Active (green).');
explain('She has 15 sessions over the past 2 months — very consistent.');
highlight('Key insight: "No action needed — the system knows to leave happy clients alone"');

step(6, 'Show an at-risk client — Marcus Johnson');
action('Click on Marcus Johnson\'s profile');
explain('Marcus visited 5 days ago. The system flagged him for a 3-day check-in.');
explain('Notice the follow-up was already sent automatically.');
highlight('Key insight: "Without this system, Marcus might slip away unnoticed"');

step(7, 'Show a lapsed client — James Wilson');
action('Click on James Wilson\'s profile');
explain('James hasn\'t been in for 16 days. He received a 14-day win-back email.');
explain('He clicked the booking link — the system tracked engagement.');
highlight('Key insight: "Automated win-back emails bring clients back before they\'re gone"');

step(8, 'Show the highest-risk client — Priya Patel');
action('Click on Priya Patel\'s profile');
explain('35 days absent. The 30-day re-engagement offer was sent.');
explain('She has an active booking link waiting to be used.');
highlight('Key insight: "Even long-absent clients get a tailored re-engagement offer"');

separator();

// ---- Follow-up automation ----
heading('PART 3: FOLLOW-UP AUTOMATION ENGINE');

step(9, 'Open Follow-up Rules');
action('Navigate to the Follow-up Rules page or /api/follow-up-rules');
explain('Show the 4 automated trigger rules:');
explain('  - 3 days  -> Check-in email');
explain('  - 7 days  -> Motivation boost');
explain('  - 14 days -> Win-back offer');
explain('  - 30 days -> Re-engagement campaign');
highlight('Key insight: "Rules are fully customizable — set your own thresholds"');

step(10, 'Show the email templates');
action('Open the email template editor or /api/email-templates');
explain('Each template uses personalization: client name, session type, stats.');
explain('Preview a template to show how it looks when rendered.');
highlight('Key insight: "Personal, not spammy — each email feels hand-written"');

step(11, 'Show the follow-up queue');
action('Navigate to the follow-ups page or /api/follow-ups');
explain('Show pending follow-ups (Emily, Tom) vs. sent ones (Marcus, James).');
explain('Each follow-up has a timestamp and links to the client profile.');
highlight('Key insight: "Full audit trail — see exactly what was sent and when"');

separator();

// ---- Booking links ----
heading('PART 4: BOOKING LINK TRACKING');

step(12, 'Show the booking system');
action('Navigate to /api/bookings');
explain('Each follow-up email can include a unique booking link.');
explain('Show James Wilson\'s used booking and Priya\'s pending one.');

step(13, 'Demonstrate a booking link');
action('Copy a booking URL and open it in a new tab');
explain('The link validates the token, checks expiry, and marks as used.');
highlight('Key insight: "Track exactly which emails drive re-bookings"');

separator();

// ---- API demo ----
heading('PART 5: API & INTEGRATION POINTS');

step(14, 'Show the REST API');
action('Open a new terminal tab and demonstrate:');
console.log(`
    ${c.cyan}curl http://localhost:3000/api/clients${c.reset}
    ${c.cyan}curl http://localhost:3000/api/clients/1/sessions${c.reset}
    ${c.cyan}curl http://localhost:3000/api/follow-ups?status=pending${c.reset}
    ${c.cyan}curl http://localhost:3000/api/dashboard/stats${c.reset}
`);
explain('The API is fully RESTful — integrates with any gym management system.');
highlight('Key insight: "Plug into MindBody, Zen Planner, or any existing system"');

separator();

// ---- Closing ----
heading('CLOSING THE DEMO');

step(15, 'Summarize the value proposition');
console.log(`
  ${c.bold}Key talking points:${c.reset}

  ${c.green}1.${c.reset} ${c.bold}Automatic risk detection${c.reset} — Never lose a client silently
  ${c.green}2.${c.reset} ${c.bold}Personalized outreach${c.reset} — Emails that feel human, sent at the right time
  ${c.green}3.${c.reset} ${c.bold}Measurable results${c.reset} — Track which emails bring clients back
  ${c.green}4.${c.reset} ${c.bold}Zero manual work${c.reset} — Set rules once, automation handles the rest
  ${c.green}5.${c.reset} ${c.bold}Full visibility${c.reset} — Dashboard shows retention health at a glance
`);

note('Typical result: 15-25% improvement in client retention within 60 days');

separator();

console.log(`  ${c.bold}Demo data includes:${c.reset}`);
console.log(`  ${c.dim}  - 15 clients with varied attendance patterns${c.reset}`);
console.log(`  ${c.dim}  - 100+ session records spanning 1-3 months${c.reset}`);
console.log(`  ${c.dim}  - Pre-configured follow-up rules and email templates${c.reset}`);
console.log(`  ${c.dim}  - Sample sent and pending follow-ups${c.reset}`);
console.log(`  ${c.dim}  - Booking link tracking examples${c.reset}`);

console.log(`\n  ${c.bgGreen}${c.white}${c.bold}  Happy demoing!  ${c.reset}\n`);
