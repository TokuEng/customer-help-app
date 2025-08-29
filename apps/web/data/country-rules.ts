import { CountryRule } from "@/types/cost";

export const COUNTRY_RULES: CountryRule[] = [
  {
    countryCode: "DE",
    countryName: "Germany",
    currency: "EUR",
    incomeTaxModel: "estimate",
    contributions: [
      { 
        code: "pension", 
        label: "Pension", 
        rateEmployee: 0.09, 
        rateEmployer: 0.09, 
        notes: "Statutory pension insurance" 
      },
      { 
        code: "health",  
        label: "Health Insurance", 
        rateEmployee: 0.075, 
        rateEmployer: 0.075, 
        notes: "Public health funds; supplemental varies" 
      },
      { 
        code: "unemp",   
        label: "Unemployment", 
        rateEmployee: 0.012, 
        rateEmployer: 0.012 
      },
      {
        code: "nursingcare",
        label: "Nursing Care",
        rateEmployee: 0.0175,
        rateEmployer: 0.0175,
        notes: "Long-term care insurance"
      }
    ],
  },
  {
    countryCode: "HU",
    countryName: "Hungary",
    currency: "HUF",
    incomeTaxModel: "estimate",
    contributions: [
      { 
        code: "social", 
        label: "Social Security", 
        rateEmployee: 0.185, 
        rateEmployer: 0.13,
        notes: "Includes pension and health insurance"
      },
      { 
        code: "voctraining", 
        label: "Vocational Training", 
        rateEmployee: 0.00, 
        rateEmployer: 0.015,
        notes: "Employer-only contribution"
      },
    ],
  },
  {
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    incomeTaxModel: "estimate",
    contributions: [
      {
        code: "epf",
        label: "EPF (Provident Fund)",
        rateEmployee: 0.12,
        rateEmployer: 0.12,
        notes: "Employee Provident Fund"
      },
      {
        code: "esi",
        label: "ESI (Health Insurance)",
        rateEmployee: 0.0075,
        rateEmployer: 0.0325,
        notes: "Employee State Insurance - applies to salaries below threshold"
      }
    ]
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    incomeTaxModel: "estimate",
    contributions: [
      {
        code: "ni",
        label: "National Insurance",
        rateEmployee: 0.12,
        rateEmployer: 0.138,
        notes: "National Insurance contributions"
      },
      {
        code: "pension",
        label: "Workplace Pension",
        rateEmployee: 0.05,
        rateEmployer: 0.03,
        notes: "Auto-enrollment minimum rates"
      }
    ]
  },
  {
    countryCode: "US",
    countryName: "United States",
    currency: "USD",
    incomeTaxModel: "estimate",
    contributions: [
      {
        code: "socialsec",
        label: "Social Security",
        rateEmployee: 0.062,
        rateEmployer: 0.062,
        notes: "OASDI - capped at wage base limit"
      },
      {
        code: "medicare",
        label: "Medicare",
        rateEmployee: 0.0145,
        rateEmployer: 0.0145,
        notes: "Medicare tax - no wage cap"
      },
      {
        code: "futa",
        label: "Federal Unemployment",
        rateEmployee: 0.00,
        rateEmployer: 0.006,
        notes: "FUTA - employer only, on first $7k"
      },
      {
        code: "suta",
        label: "State Unemployment",
        rateEmployee: 0.00,
        rateEmployer: 0.027,
        notes: "State UI - varies by state, this is average"
      }
    ]
  }
];

export const findRule = (code: string) => COUNTRY_RULES.find(c => c.countryCode === code);
