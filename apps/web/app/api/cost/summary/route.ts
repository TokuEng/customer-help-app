import { NextRequest } from "next/server";

// Company system prompt as specified
const SYSTEM_PROMPT = `You are an HR professional for a global Employer of Record (EOR) company. Your job is to create compelling job offer emails that transparently explain compensation breakdowns to potential employees.

Your role is to:
- Present the gross annual salary and what the employee will actually take home
- Clearly explain employee deductions (social contributions and estimated taxes)
- Show the net monthly and annual salary estimates
- Make the compensation package attractive while being transparent about deductions
- Use a warm, welcoming tone that excites the candidate about the opportunity
- Explain how the social contributions benefit the employee (pension, healthcare, etc.)

Focus on what matters to the employee:
- Their gross salary
- Their net take-home pay (monthly and annually)
- What their social contributions provide them
- Why working through an EOR is beneficial

Always clarify that tax calculations are estimates and may vary based on personal circumstances. Format the email to be engaging, easy to read, and professional.`;

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
1) Write an engaging job offer email (250-300 words) that:
   - Starts with "Subject: Your Job Offer - ${rule.countryName} Position"
   - Opens with "Dear [Candidate's Name],"
   - Congratulates them and expresses excitement about them joining
   - Clearly presents their compensation package:
     * Gross annual salary
     * Estimated net monthly take-home pay
     * Estimated net annual take-home pay
   - Explains deductions in a positive way (what benefits they provide)
   - Highlights the advantages of working through a global EOR
   - Uses ### for section headers
   - Uses ** for bold important figures
   - Uses bullet points (- ) for lists
   - Maintains an enthusiastic, welcoming tone
   - Includes next steps
   - Signs off as "The Toku Talent Team"

2) Format the email to be:
   - Warm and inviting
   - Easy to scan with clear sections
   - Focused on the employee's benefits
   - Professional yet friendly

3) Include a note that tax estimates are based on standard deductions and may vary based on personal circumstances.`;

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    // Call OpenAI API directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response('Failed to generate summary', { status: 500 });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch {
    // Internal error occurred
    return new Response('Failed to generate summary', { status: 500 });
  }
}