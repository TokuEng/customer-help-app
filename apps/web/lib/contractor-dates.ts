import { addBusinessDays, lastBusinessDayOfMonth, prevBusinessDay } from "./business-days";

export type PaymentEventType = "invoice" | "prefunding-sent" | "prefunding-due" | "payment";

export interface PaymentEvent {
  type: PaymentEventType;
  date: Date;
  label: string;
  description: string;
}

const COLORS: Record<PaymentEventType, string> = {
  invoice: "bg-red-500",
  "prefunding-sent": "bg-blue-600",
  "prefunding-due": "bg-orange-500",
  payment: "bg-green-600",
};
export const eventColor = (t: PaymentEventType) => COLORS[t];

// Build events for a given month (0=Jan)
export function buildContractorEvents(year: number, monthIndex: number): PaymentEvent[] {
  // Invoice due (20th, weekend -> business day before)
  const twenty = new Date(year, monthIndex, 20);
  const invoice = (twenty.getDay() === 0 || twenty.getDay() === 6) ? prevBusinessDay(twenty) : twenty;

  // Pre-funding sent: 2 business days after invoice
  const prefundingSent = addBusinessDays(invoice, 2);

  // Contractor payment: last business day of the month
  const payment = lastBusinessDayOfMonth(year, monthIndex);

  // Pre-funding due: 3 calendar days before payment, then weekend -> previous business day
  const prefundingDueRaw = new Date(payment.getFullYear(), payment.getMonth(), payment.getDate() - 3);
  const prefundingDue = (prefundingDueRaw.getDay() === 0 || prefundingDueRaw.getDay() === 6)
    ? prevBusinessDay(prefundingDueRaw)
    : prefundingDueRaw;

  return [
    {
      type: "invoice",
      date: invoice,
      label: "Invoice Due",
      description: "Contractor invoices must be submitted & approved (20th; previous business day if weekend)",
    },
    {
      type: "prefunding-sent",
      date: prefundingSent,
      label: "Pre-funding Sent",
      description: "We send pre-funding invoice to client (2 business days after approval)",
    },
    {
      type: "prefunding-due",
      date: prefundingDue,
      label: "Pre-funding Due",
      description: "Client payment due (3 days before contractor payment, previous business day if weekend)",
    },
    {
      type: "payment",
      date: payment,
      label: "Contractor Payment",
      description: "Contractors are paid (last business day of month)",
    },
  ];
}
