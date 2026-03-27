'use strict';

module.exports = {
  studio: {
    name: 'FitLife Studio',
    email: 'hello@fitlifestudio.com',
    phone: '(555) 123-4567',
    address: '123 Wellness Ave, Fitness City',
    website: 'http://localhost:3000',
  },
  followUpRules: [
    { name: '3-Day Check-in', trigger_days: 3, templateName: 'gentle_checkin' },
    { name: '7-Day Motivation', trigger_days: 7, templateName: 'motivation_offer' },
    { name: '14-Day Win-Back', trigger_days: 14, templateName: 'winback_incentive' },
    { name: '30-Day Re-engagement', trigger_days: 30, templateName: 'reengagement' },
  ],
  emailTemplates: [
    {
      name: 'gentle_checkin',
      subject: 'We miss you at {{studio_name}}, {{name}}! \uD83D\uDCAA',
      body: 'Hi {{name}},\n\nIt\'s been {{days_since}} days since your last session. We hope you\'re doing great!\n\nYour fitness journey is important to us, and we\'d love to see you back at the studio. Your next session is just a click away:\n\n{{booking_button}}\n\nKeep up the great work!\n\nWarm regards,\nThe {{studio_name}} Team',
    },
    {
      name: 'motivation_offer',
      subject: '{{name}}, your body will thank you! \uD83D\uDD25',
      body: 'Hey {{name}},\n\nA week without training? No worries \u2014 we all need a break sometimes!\n\nBut your goals are waiting for you. Come back this week and enjoy a complimentary smoothie after your session.\n\n{{booking_button}}\n\nLet\'s get back on track together!\n\nYour team at {{studio_name}}',
    },
    {
      name: 'winback_incentive',
      subject: 'Special offer just for you, {{name}} \uD83C\uDF81',
      body: 'Hi {{name}},\n\nWe\'ve noticed it\'s been {{days_since}} days since your last visit. We want to make it easy for you to come back!\n\nAs a valued member, we\'re offering you 20% off your next session package. Just book through the link below:\n\n{{booking_button}}\n\nThis offer expires in 72 hours \u2014 don\'t miss out!\n\nSee you soon,\n{{studio_name}}',
    },
    {
      name: 'reengagement',
      subject: 'We\'d love to have you back, {{name}} \u2764\uFE0F',
      body: 'Dear {{name}},\n\nIt\'s been a while since we saw you at {{studio_name}}. We understand life gets busy, but your health matters!\n\nWe\'ve added new classes and trainers since your last visit. Come check them out with a FREE trial session on us:\n\n{{booking_button}}\n\nNo strings attached \u2014 just come in and see what\'s new.\n\nWith care,\nThe {{studio_name}} Family',
    },
  ],
  email: {
    quietHoursStart: 21, // 9 PM
    quietHoursEnd: 8,    // 8 AM
    maxPerDay: 50,
  },
  booking: {
    defaultExpiryHours: 72,
    baseUrl: 'http://localhost:3000',
  },
};
