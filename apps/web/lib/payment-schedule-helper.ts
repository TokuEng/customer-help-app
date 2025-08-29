import { buildContractorEvents } from './contractor-dates';

export function getPaymentScheduleContext(): string {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Get events for current and next month
  const currentMonthEvents = buildContractorEvents(currentYear, currentMonth);
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthEvents = buildContractorEvents(nextYear, nextMonth);
  
  // Format dates for the context
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      weekday: 'long'
    });
  };
  
  const formatEventList = (events: ReturnType<typeof buildContractorEvents>, monthName: string) => {
    return events.map(event => 
      `- ${event.label}: ${formatDate(event.date)}`
    ).join('\n');
  };
  
  const currentMonthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextMonthName = new Date(nextYear, nextMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return `
CONTRACTOR PAYMENT SCHEDULE INFORMATION:

Payment Schedule Rules:
1. Invoice Due: 20th of each month (if weekend → previous business day)
2. Pre-funding Sent: 2 business days after invoice approval
3. Pre-funding Due: 3 calendar days before contractor payment (if weekend → previous business day)
4. Contractor Payment: Last business day of the month

Important Dates for ${currentMonthName}:
${formatEventList(currentMonthEvents, currentMonthName)}

Important Dates for ${nextMonthName}:
${formatEventList(nextMonthEvents, nextMonthName)}

Today's Date: ${formatDate(today)}
`;
}

export function getUpcomingPaymentDates(): Array<{
  type: string;
  date: Date;
  label: string;
  daysFromNow: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Get events for current and next two months
  const allEvents = [];
  
  for (let i = 0; i < 3; i++) {
    const month = (currentMonth + i) % 12;
    const year = currentMonth + i > 11 ? currentYear + 1 : currentYear;
    const events = buildContractorEvents(year, month);
    
    for (const event of events) {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const daysFromNow = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Include only future events (today and onwards)
      if (daysFromNow >= 0) {
        allEvents.push({
          type: event.type,
          date: event.date,
          label: event.label,
          daysFromNow
        });
      }
    }
  }
  
  // Sort by date
  return allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
}
