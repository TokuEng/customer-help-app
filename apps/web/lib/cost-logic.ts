import { CountryRule } from "@/types/cost";

export type CalcInput = { 
  countryCode: string; 
  grossAnnual: number; 
};

export type CalcOutput = {
  currency: string;
  grossAnnual: number;
  employeeDeductions: { 
    code: string; 
    label: string; 
    amount: number; 
    rate: number; 
  }[];
  employerContribs: { 
    code: string; 
    label: string; 
    amount: number; 
    rate: number; 
  }[];
  employeeTotal: number;
  employerTotal: number;
  incomeTaxEstimate: number;   // rough, not authoritative
  netSalaryEstimate: number;   // gross - employeeDeductions - incomeTaxEstimate
  totalEmployerCost: number;   // gross + employerTotal
  employerBurdenPct: number;   // employerTotal / gross
};

// Rough income tax estimates by country
const TAX_RATES: Record<string, number> = {
  DE: 0.25,   // Germany - progressive, but ~25% average
  HU: 0.15,   // Hungary - 15% flat
  IN: 0.20,   // India - progressive, ~20% average
  GB: 0.22,   // UK - progressive, ~22% average  
  US: 0.22,   // US Federal + State average
};

export function calculate(rule: CountryRule, grossAnnual: number): CalcOutput {
  const toAmt = (rate: number) => +(grossAnnual * rate).toFixed(2);

  const employeeDeductions = rule.contributions
    .filter(c => c.rateEmployee > 0)
    .map(c => ({ 
      code: c.code, 
      label: c.label, 
      rate: c.rateEmployee, 
      amount: toAmt(c.rateEmployee) 
    }));

  const employerContribs = rule.contributions
    .filter(c => c.rateEmployer > 0)
    .map(c => ({ 
      code: c.code, 
      label: c.label, 
      rate: c.rateEmployer, 
      amount: toAmt(c.rateEmployer) 
    }));

  const employeeTotal = +employeeDeductions.reduce((s, c) => s + c.amount, 0).toFixed(2);
  const employerTotal = +employerContribs.reduce((s, c) => s + c.amount, 0).toFixed(2);

  // Use country-specific tax rate or default to 18%
  const taxRate = TAX_RATES[rule.countryCode] || 0.18;
  const incomeTaxEstimate = +(grossAnnual * taxRate).toFixed(2);

  const netSalaryEstimate = +(grossAnnual - employeeTotal - incomeTaxEstimate).toFixed(2);
  const totalEmployerCost = +(grossAnnual + employerTotal).toFixed(2);
  const employerBurdenPct = grossAnnual > 0 ? +(employerTotal / grossAnnual).toFixed(4) : 0;

  return {
    currency: rule.currency,
    grossAnnual,
    employeeDeductions,
    employerContribs,
    employeeTotal,
    employerTotal,
    incomeTaxEstimate,
    netSalaryEstimate,
    totalEmployerCost,
    employerBurdenPct
  };
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string): string {
  const locale = {
    EUR: 'de-DE',
    USD: 'en-US',
    GBP: 'en-GB',
    HUF: 'hu-HU',
    INR: 'en-IN'
  }[currency] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
