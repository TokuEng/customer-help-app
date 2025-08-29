// Test script for payment schedule helper
// Run with: node scripts/test-payment-schedule.js

import { getPaymentScheduleContext, getUpcomingPaymentDates } from '../apps/web/lib/payment-schedule-helper.js';

console.log('=== Payment Schedule Context ===');
console.log(getPaymentScheduleContext());

console.log('\n=== Upcoming Payment Dates ===');
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
  console.log(`- ${event.label}: ${dateStr}${status}`);
});
