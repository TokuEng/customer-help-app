// Test script for payment schedule helper
// Run with: node scripts/test-payment-schedule.js

import { getPaymentScheduleContext, getUpcomingPaymentDates } from '../apps/web/lib/payment-schedule-helper.js';

// Payment Schedule Context
getPaymentScheduleContext();

// Upcoming Payment Dates
const upcoming = getUpcomingPaymentDates();
upcoming.forEach(event => {
  const dateStr = event.date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  const status = event.daysFromNow === 0 ? ' (TODAY)' : 
                 event.daysFromNow === 1 ? ' (TOMORROW)' : 
                 ` (in ${event.daysFromNow} days)`;
  // ${event.label}: ${dateStr}${status}
});
