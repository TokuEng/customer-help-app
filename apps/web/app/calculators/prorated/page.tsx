"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Calendar, DollarSign } from "lucide-react";
import {
  endOfMonth,
  startOfMonth,
  eachDayOfInterval,
  isWeekend,
  format,
  parseISO,
  isValid
} from "date-fns";

export default function ProratedCalculatorPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [monthlyCompensation, setMonthlyCompensation] = useState<string>("");
  const [calculationResult, setCalculationResult] = useState<{
    proratedAmount: number;
    workingDaysUsed: number;
    totalWorkingDaysInMonth: number;
    monthName: string;
  } | null>(null);

  const calculateProratedAmount = () => {
    if (!startDate || !monthlyCompensation) return;

    const start = parseISO(startDate);
    if (!isValid(start)) return;

    const compensation = parseFloat(monthlyCompensation);
    if (isNaN(compensation) || compensation <= 0) return;

    // Get the month and year from the start date
    const monthStart = startOfMonth(start);
    const monthEnd = endOfMonth(start);

    // Get all days in the month
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate total working days in the month (excluding weekends)
    const totalWorkingDaysInMonth = allDaysInMonth.filter(day => !isWeekend(day)).length;

    // Get all days from start date to end of month
    const daysFromStartToEnd = eachDayOfInterval({ start, end: monthEnd });

    // Calculate working days from start date to end of month (excluding weekends)
    const workingDaysUsed = daysFromStartToEnd.filter(day => !isWeekend(day)).length;

    // Calculate prorated amount
    const proratedAmount = (workingDaysUsed / totalWorkingDaysInMonth) * compensation;

    setCalculationResult({
      proratedAmount,
      workingDaysUsed,
      totalWorkingDaysInMonth,
      monthName: format(start, "MMMM yyyy")
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const resetCalculation = () => {
    setStartDate("");
    setMonthlyCompensation("");
    setCalculationResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Prorated Calculator</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl">
            Calculate prorated compensation for contractors, terminations, or mid-month hires.
            Uses business days (Monday-Friday) and assumes 30 calendar days per month.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                placeholder="Select start date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensation" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Compensation (USD)
              </Label>
              <Input
                id="compensation"
                type="number"
                value={monthlyCompensation}
                onChange={(e) => setMonthlyCompensation(e.target.value)}
                className="w-full"
                placeholder="Enter monthly amount"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={calculateProratedAmount}
              disabled={!startDate || !monthlyCompensation}
              className="flex-1 sm:flex-none"
            >
              💰 Calculate Prorated Amount
            </Button>
            <Button
              onClick={resetCalculation}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Reset
            </Button>
          </div>
        </Card>

        {/* Results Section */}
        {calculationResult && (
          <Card className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Calculation Results</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium mb-1">Prorated Amount</div>
                <div className="text-2xl sm:text-3xl font-bold text-green-700">
                  {formatCurrency(calculationResult.proratedAmount)}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium mb-1">Working Days Used</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                  {calculationResult.workingDaysUsed}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  of {calculationResult.totalWorkingDaysInMonth} total
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-600 font-medium mb-1">Month</div>
                <div className="text-lg font-semibold text-gray-900">
                  {calculationResult.monthName}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Calculation Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <strong>Formula:</strong> (Working days from start date to month end ÷ Total working days in month) × Monthly compensation
                </div>
                <div>
                  <strong>Working days from {format(parseISO(startDate), "MMM dd, yyyy")}:</strong> {calculationResult.workingDaysUsed}
                </div>
                <div>
                  <strong>Total working days in {calculationResult.monthName}:</strong> {calculationResult.totalWorkingDaysInMonth}
                </div>
                <div>
                  <strong>Monthly compensation:</strong> {formatCurrency(parseFloat(monthlyCompensation))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Disclaimer */}
        <Card className="p-3 sm:p-4 bg-amber-50 border-amber-200 mt-6">
          <div className="flex gap-2 sm:gap-3">
            <div className="text-amber-600 flex-shrink-0 mt-0.5">
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-medium mb-1">Important Notes</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>This calculator excludes weekends (Saturday and Sunday) from working days</li>
                <li>Results are estimates and should be verified with your contract terms</li>
                <li>Assumes a simplified 30-day month for calculation purposes</li>
                <li>Consult with HR/legal for official prorated compensation calculations</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
