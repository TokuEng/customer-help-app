"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarIcon, DollarSign, Calculator } from "lucide-react";
import { format, getDay, eachDayOfInterval, endOfMonth } from "date-fns";

export default function ProratedCalculatorPage() {
  const [startDate, setStartDate] = useState("");
  const [monthlyCompensation, setMonthlyCompensation] = useState(5000);
  const [inputValue, setInputValue] = useState("5000");
  const [proratedAmount, setProratedAmount] = useState<number | null>(null);

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      const numValue = parseFloat(inputValue) || 0;
      if (numValue !== monthlyCompensation) {
        setMonthlyCompensation(numValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, monthlyCompensation]);

  const calculateProratedAmount = useCallback(() => {
    if (!startDate || monthlyCompensation <= 0) {
      setProratedAmount(null);
      return;
    }

    const start = new Date(startDate);
    const monthEnd = endOfMonth(start);
    
    // Get all days from start date to end of month
    const allDaysInPeriod = eachDayOfInterval({
      start: start,
      end: monthEnd
    });
    
    // Count working days (exclude weekends)
    const workingDaysInPeriod = allDaysInPeriod.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
    });

    // Get all days in the month
    const firstDayOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const allDaysInMonth = eachDayOfInterval({
      start: firstDayOfMonth,
      end: monthEnd
    });

    // Count total working days in the month
    const totalWorkingDaysInMonth = allDaysInMonth.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });

    const workingDaysCount = workingDaysInPeriod.length;
    const totalWorkingDays = totalWorkingDaysInMonth.length;
    
    const prorated = (workingDaysCount / totalWorkingDays) * monthlyCompensation;
    setProratedAmount(prorated);
  }, [startDate, monthlyCompensation]);

  // Calculate prorated amount whenever inputs change
  useEffect(() => {
    if (startDate && monthlyCompensation > 0) {
      calculateProratedAmount();
    } else {
      setProratedAmount(null);
    }
  }, [startDate, monthlyCompensation, calculateProratedAmount]);

  const handleCalculate = () => {
    calculateProratedAmount();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "dd.MM.yyyy");
    } catch {
      return dateString;
    }
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
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {startDate && (
                <p className="text-xs text-gray-500">
                  Formatted: {formatDate(startDate)}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="compensation" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                Monthly Compensation (USD)
              </label>
              <Input
                id="compensation"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="5000"
              />
            </div>
            
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={handleCalculate}
                disabled={!startDate || monthlyCompensation <= 0}
                className="w-full sm:w-auto h-11 sm:h-10"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Prorated Amount
              </Button>
            </div>
          </div>
        </Card>

        {/* Results Section */}
        {proratedAmount !== null && (
          <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">Calculation Results</h3>
            <div className="space-y-4">
              {(() => {
                const start = new Date(startDate);
                const monthEnd = endOfMonth(start);
                
                // Calculate working days
                const allDaysInPeriod = eachDayOfInterval({
                  start: start,
                  end: monthEnd
                });
                
                const workingDaysInPeriod = allDaysInPeriod.filter(day => {
                  const dayOfWeek = getDay(day);
                  return dayOfWeek !== 0 && dayOfWeek !== 6;
                });

                const firstDayOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
                const allDaysInMonth = eachDayOfInterval({
                  start: firstDayOfMonth,
                  end: monthEnd
                });

                const totalWorkingDaysInMonth = allDaysInMonth.filter(day => {
                  const dayOfWeek = getDay(day);
                  return dayOfWeek !== 0 && dayOfWeek !== 6;
                });

                const workingDaysCount = workingDaysInPeriod.length;
                const totalWorkingDays = totalWorkingDaysInMonth.length;
                const percentage = (workingDaysCount / totalWorkingDays) * 100;

                return (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Period</span>
                        <span className="text-sm font-medium">
                          {formatDate(startDate)} - {format(monthEnd, "dd.MM.yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Working Days</span>
                        <span className="text-sm font-medium">
                          {workingDaysCount} / {totalWorkingDays} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                        <div>
                          <span className="text-base sm:text-lg font-semibold text-gray-900">
                            Prorated Amount
                          </span>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            Based on working days (excluding weekends)
                          </p>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          {formatCurrency(proratedAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-800 mb-1">Calculation Details:</p>
                      <p>
                        Prorated Amount = ({workingDaysCount} working days ÷ {totalWorkingDays} total working days) × {formatCurrency(monthlyCompensation)}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
        )}

        {/* Information Card */}
        <Card className="p-3 sm:p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-2 sm:gap-3">
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-medium mb-1">How it works</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Calculation is based on working days only (Monday-Friday)</li>
                <li>Weekends (Saturday and Sunday) are excluded from both numerator and denominator</li>
                <li>Uses the actual calendar days from your start date to month end</li>
                <li>Assumes standard 5-day work week schedule</li>
              </ul>
              <p className="mt-2">
                For specific company policies or different work schedules, please consult with HR or payroll.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
