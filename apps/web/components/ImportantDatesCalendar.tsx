"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";
import { buildContractorEvents, eventColor, PaymentEvent } from "@/lib/contractor-dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function daysGrid(year: number, monthIndex: number) {
  // 6-row grid starting on Sunday
  const first = new Date(year, monthIndex, 1);
  const startOffset = first.getDay(); // 0..6
  const start = new Date(year, monthIndex, 1 - startOffset);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function eventsMap(events: PaymentEvent[]) {
  const map = new Map<string, PaymentEvent[]>();
  for (const e of events) {
    const k = toKey(e.date);
    const arr = map.get(k) || [];
    arr.push(e);
    map.set(k, arr);
  }
  return map;
}

function downloadICS(events: PaymentEvent[], year: number, month: number) {
  // Simple per-month ICS file
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T090000Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Toku Help Center//Important Dates//EN",
  ];
  events.forEach((e) => {
    const dt = fmt(e.date);
    const uid = `toku-${e.type}-${dt}@helpcenter`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dt}`,
      `DTSTART:${dt}`,
      `SUMMARY:${e.label}`,
      `DESCRIPTION:${e.description}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `toku-important-dates-${year}-${month + 1}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportantDatesCalendar({
  initialYear,
  initialMonth,
  title = "Important Dates",
}: {
  initialYear?: number;
  initialMonth?: number; // 0=Jan
  title?: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());

  const cells = useMemo(() => daysGrid(year, month), [year, month]);
  const events = useMemo(() => buildContractorEvents(year, month), [year, month]);
  const map = useMemo(() => eventsMap(events), [events]);

  const dec = () => { 
    const m = month - 1; 
    if (m < 0) { 
      setYear(year - 1); 
      setMonth(11); 
    } else {
      setMonth(m); 
    }
  };
  
  const inc = () => { 
    const m = month + 1; 
    if (m > 11) { 
      setYear(year + 1); 
      setMonth(0); 
    } else {
      setMonth(m); 
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 sm:py-12">
      <div className="rounded-xl border bg-white shadow-sm">
        {/* Header */}
        <div className="border-b px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#1c46ce]" />
                {title}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Track contractor payment deadlines and pre-funding schedules
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={dec} 
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[9rem] text-center font-medium">
                {MONTHS[month]} {year}
              </div>
              <button 
                onClick={inc} 
                className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadICS(events, year, month)}
                className="ml-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                title="Download calendar for this month"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Weekday headers */}
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-1 py-2 text-center text-xs font-medium text-gray-500">
                {w}
              </div>
            ))}
            
            {/* Date cells */}
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === month;
              const e = map.get(toKey(d)) || [];
              const isToday = 
                d.getDate() === now.getDate() && 
                d.getMonth() === now.getMonth() && 
                d.getFullYear() === now.getFullYear();
              
              return (
                <div
                  key={i}
                  className={`
                    min-h-[60px] sm:min-h-[80px] rounded-lg border p-1.5 sm:p-2
                    ${inMonth ? "bg-white" : "bg-gray-50/50"} 
                    ${isToday ? "border-[#1c46ce] border-2" : "border-gray-200"}
                  `}
                >
                  <div className={`text-xs sm:text-sm font-medium ${inMonth ? "text-gray-900" : "text-gray-400"}`}>
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-0.5 sm:space-y-1">
                    {e.map((ev, idx) => (
                      <div
                        key={idx}
                        className={`
                          block w-full truncate rounded-full px-1.5 sm:px-2 py-0.5 
                          text-[10px] sm:text-xs text-white font-medium
                          ${eventColor(ev.type)}
                        `}
                        title={ev.description}
                      >
                        {ev.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t px-4 sm:px-6 py-4 sm:py-5 bg-gray-50/50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Timeline Legend</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LegendItem 
              color="bg-red-500" 
              title="Invoice Due" 
              desc="Contractor invoices must be submitted and approved (20th of the month)" 
            />
            <LegendItem 
              color="bg-blue-600" 
              title="Pre-funding Sent" 
              desc="We send pre-funding invoice to client (2-3 business days after approval)" 
            />
            <LegendItem 
              color="bg-orange-500" 
              title="Pre-funding Due" 
              desc="Client payment due (2-3 days before contractor payment)" 
            />
            <LegendItem 
              color="bg-green-600" 
              title="Contractor Payment" 
              desc="Contractors are paid (last working day of month)" 
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function LegendItem({ color, title, desc }: { color: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`h-3 w-3 rounded-full ${color} mt-0.5 flex-shrink-0`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-600 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
