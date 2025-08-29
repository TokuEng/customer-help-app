"use client";
import { useMemo, useState, useEffect } from "react";
import { COUNTRY_RULES, findRule } from "@/data/country-rules";
import { calculate, formatCurrency } from "@/lib/cost-logic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Copy, Calculator, AlertCircle, Mail, Check } from "lucide-react";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

export default function EmployerCostPage() {
  const [country, setCountry] = useState("DE");
  const [gross, setGross] = useState(60000);
  const [inputValue, setInputValue] = useState("60000");
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailText, setEmailText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const rule = useMemo(() => findRule(country)!, [country]);
  const out = useMemo(() => calculate(rule, gross), [rule, gross]);

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      const numValue = parseFloat(inputValue) || 0;
      if (numValue !== gross) {
        setGross(numValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, gross]);

  async function genEmail() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/cost/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, rule, out }),
      });
      const text = await res.text();
      setEmailText(text);
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to generate email:", error);
      setEmailText("Failed to generate email. Please try again.");
      setDialogOpen(true);
    } finally {
      setIsGenerating(false);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatEmailContent = (content: string) => {
    // Parse and format the email content
    const lines = content.split('\n');
    const formatted = lines.map((line, index) => {
      // Headers with ###
      if (line.startsWith('###')) {
        return <h3 key={index} className="font-semibold text-base mt-4 mb-2">{line.replace(/###/g, '').trim()}</h3>;
      }
      // Bold text with **
      if (line.includes('**')) {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
              }
              return part;
            })}
          </p>
        );
      }
      // List items
      if (line.trim().startsWith('-')) {
        return <li key={index} className="ml-4 mb-1">{line.replace(/^-\s*/, '')}</li>;
      }
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Regular lines
      return <p key={index} className="mb-2">{line}</p>;
    });
    return formatted;
  };

  // Animated Currency Component
  const AnimatedCurrency = ({ amount, currency, className = "" }: { amount: number; currency: string; className?: string }) => {
    const animatedValue = useAnimatedNumber(amount, 800, 0);
    return <span className={className}>{formatCurrency(animatedValue, currency)}</span>;
  };

  // Animated Percentage Component
  const AnimatedPercentage = ({ value, className = "" }: { value: number; className?: string }) => {
    const animatedValue = useAnimatedNumber(value * 100, 600, 1);
    return <span className={className}>{animatedValue.toFixed(1)}%</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employer Cost Calculator</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">
            Calculate the total cost of employment including all social contributions, taxes, and employer burdens. 
            Get AI-powered explanations and client-ready email summaries.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium text-gray-700">
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {COUNTRY_RULES.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.countryName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="gross" className="text-sm font-medium text-gray-700">
                Gross Annual Salary ({rule.currency})
              </label>
              <input
                id="gross"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={genEmail}
                disabled={isGenerating}
                className="w-full sm:w-auto h-11 sm:h-10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Generate Client Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Results Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
          {/* Employee Side */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Employee Deductions</h3>
            <div className="space-y-3">
              {out.employeeDeductions.map((item) => (
                <div key={item.code} className="flex justify-between items-start sm:items-center">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-sm sm:text-base text-gray-700 block sm:inline">{item.label}</span>
                    <span className="text-xs sm:text-sm text-gray-500 block sm:inline sm:ml-2">
                      (<AnimatedPercentage value={item.rate} />)
                    </span>
                  </div>
                  <AnimatedCurrency 
                    amount={item.amount} 
                    currency={out.currency} 
                    className="text-sm sm:text-base font-medium whitespace-nowrap"
                  />
                </div>
              ))}
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-700">Income Tax (estimate)</span>
                  <AnimatedCurrency 
                    amount={out.incomeTaxEstimate} 
                    currency={out.currency} 
                    className="text-sm sm:text-base font-medium"
                  />
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-semibold text-gray-900">Net Salary (estimate)</span>
                  <AnimatedCurrency 
                    amount={out.netSalaryEstimate} 
                    currency={out.currency} 
                    className="text-base sm:text-lg font-bold text-green-600"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Employer Side */}
          <Card className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Employer Contributions</h3>
            <div className="space-y-3">
              {out.employerContribs.map((item) => (
                <div key={item.code} className="flex justify-between items-start sm:items-center">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-sm sm:text-base text-gray-700 block sm:inline">{item.label}</span>
                    <span className="text-xs sm:text-sm text-gray-500 block sm:inline sm:ml-2">
                      (<AnimatedPercentage value={item.rate} />)
                    </span>
                  </div>
                  <AnimatedCurrency 
                    amount={item.amount} 
                    currency={out.currency} 
                    className="text-sm sm:text-base font-medium whitespace-nowrap"
                  />
                </div>
              ))}
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-700">Gross Annual Salary</span>
                  <AnimatedCurrency 
                    amount={out.grossAnnual} 
                    currency={out.currency} 
                    className="text-sm sm:text-base font-medium"
                  />
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-semibold text-gray-900">Total Employer Cost</span>
                  <AnimatedCurrency 
                    amount={out.totalEmployerCost} 
                    currency={out.currency} 
                    className="text-base sm:text-lg font-bold text-primary"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs sm:text-sm text-gray-600">Employer Burden</span>
                  <AnimatedPercentage 
                    value={out.employerBurdenPct} 
                    className="text-xs sm:text-sm font-medium text-gray-700"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Disclaimer */}
        <Card className="p-3 sm:p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-medium mb-1">Important Notice</p>
              <p>
                All figures are estimates based on standard rates and may vary significantly based on:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Sector-specific regulations and collective bargaining agreements</li>
                <li>Employee age, family status, and number of dependents</li>
                <li>Regional variations and local tax rules</li>
                <li>Income thresholds and caps for certain contributions</li>
              </ul>
              <p className="mt-2">
                Always consult with local tax and employment law experts for accurate calculations.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Email Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Client-Ready Email
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              This email has been generated based on the calculated employer costs. You can copy and send it directly to your client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Email Content */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 max-h-[50vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none text-xs sm:text-sm">
                {emailText ? formatEmailContent(emailText) : (
                  <p className="text-gray-500">Generating email content...</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 sm:mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}