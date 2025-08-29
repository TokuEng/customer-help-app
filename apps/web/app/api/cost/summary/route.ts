import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Company system prompt as specified
const SYSTEM_PROMPT = `You are a Customer Success Manager/HR Manager for a global Employer of Record (EOR) company. Your job is to calculate the total employer cost of hiring an employee in any given country, based on a specified gross annual salary.

For each query, provide:
- Gross annual salary
- Side by side Employee social contributions (list types, % and local currency amounts), and Employer social contributions (list types, % and local currency amounts)
- After tax net salary (gross minus employee deductions and income tax)
- Total employer cost (gross + employer contributions)
- Effective employer burden as a %, list side by side next employee and employer cost items
- A clean, side-by-side comparison table: employee and employer columns next to each other, not rows below each other
- Short descriptions of each contribution type
- A client-ready email summarizing the numbers and referencing the table

Always make clear that values are estimates and may vary by local regulations, sector agreements, or employee specifics. When applicable, clarify that income tax is an estimate for a 30-year-old single person unless local rules say otherwise. If data is missing, explain what's missing and what can be estimated.
Format for business use with headers, bullets, and a concise tone.`;

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { country, rule, out } = body;

    // Input validation
    if (!country || !rule || !out || typeof country !== 'string') {
      return new Response('Invalid input parameters', { status: 400 });
    }

    // Validate country code format
    if (!/^[A-Z]{2,3}$/.test(country)) {
      return new Response('Invalid country code format', { status: 400 });
    }

    // Create a structured prompt with the calculated data
    const userPrompt = `
COUNTRY: ${rule.countryName} (${country})
CURRENCY: ${out.currency}
GROSS ANNUAL SALARY: ${out.grossAnnual.toLocaleString()} ${out.currency}

CALCULATED DATA:

Employee Deductions:
${out.employeeDeductions.map((d: { label: string; amount: number; rate: number }) => `- ${d.label}: ${d.amount.toLocaleString()} ${out.currency} (${(d.rate * 100).toFixed(1)}%)`).join('\n')}
- Income Tax (estimate): ${out.incomeTaxEstimate.toLocaleString()} ${out.currency}
Total Employee Deductions: ${out.employeeTotal.toLocaleString()} ${out.currency}
Net Salary (estimate): ${out.netSalaryEstimate.toLocaleString()} ${out.currency}

Employer Contributions:
${out.employerContribs.map((c: { label: string; amount: number; rate: number }) => `- ${c.label}: ${c.amount.toLocaleString()} ${out.currency} (${(c.rate * 100).toFixed(1)}%)`).join('\n')}
Total Employer Contributions: ${out.employerTotal.toLocaleString()} ${out.currency}
Total Employer Cost: ${out.totalEmployerCost.toLocaleString()} ${out.currency}
Employer Burden: ${(out.employerBurdenPct * 100).toFixed(1)}%

CONTRIBUTION NOTES:
${rule.contributions.filter((c: { notes?: string }) => c.notes).map((c: { label: string; notes?: string }) => `- ${c.label}: ${c.notes}`).join('\n')}

TASKS:
1) Write a concise, professional client-ready email (200-250 words) that:
   - Starts with "Subject: Employer Cost Calculation for Hiring in ${rule.countryName}"
   - Opens with "Dear [Client's Name],"
   - Summarizes the employer cost calculation
   - Highlights key figures using ### for section headers
   - Uses ** for bold important figures and terms
   - Uses bullet points (- ) for lists
   - Briefly explains the main contribution types
   - Includes appropriate caveats about estimates
   - Maintains a helpful, consultative tone
   - Signs off as "Your Toku Team"

2) Format the email with:
   - Clear markdown formatting (###, **, -)
   - Proper line breaks between sections
   - Scannable structure with headers

3) Emphasize that these are estimates and actual costs may vary.`;

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    // Internal error occurred
    return new Response('Failed to generate summary', { status: 500 });
  }
}
