export type Currency = "EUR" | "USD" | "GBP" | "HUF" | "INR";

export type ContributionItem = {
  code: string;                // "pension", "health", "unemployment" ...
  label: string;               // UI label
  rateEmployee: number;        // 0..1 (e.g., 0.07)
  rateEmployer: number;        // 0..1
  notes?: string;              // short hint for the AI/explanations
};

export type CountryRule = {
  countryCode: string;         // "DE", "HU", "IN"
  countryName: string;
  currency: Currency;
  contributions: ContributionItem[];
  incomeTaxModel: "flat" | "progressive" | "estimate"; // we'll start with "estimate"
};
