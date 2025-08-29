import React from "react";
import Balancer from "react-wrap-balancer";
import Link from "next/link";
import { EnhancedSearchBar } from "./EnhancedSearchBar";
import { FileText, CreditCard, UserPlus, Gift, Palmtree, FileSpreadsheet } from "lucide-react";

export default function Hero() {
  const topTasks = [
    { label: "Payslips", href: "/search?q=payslip", icon: FileText },
    { label: "Expenses", href: "/search?q=expense", icon: CreditCard },
    { label: "Add employee", href: "/search?q=onboarding", icon: UserPlus },
    { label: "Benefits", href: "/search?q=benefits", icon: Gift },
    { label: "Leave", href: "/search?q=leave", icon: Palmtree },
    { label: "Tax forms", href: "/search?q=tax", icon: FileSpreadsheet },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* subtle gradient + grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,70,206,0.08),transparent_55%)]" />
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)] bg-[linear-gradient(to_right,transparent_0%,rgba(28,70,206,.06)_50%,transparent_100%)]" />
      
      <div className="relative mx-auto max-w-6xl px-4 md:px-8 py-8 sm:py-12 md:py-16">
        <h1 className="mx-auto max-w-2xl text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          <Balancer>How can we help you?</Balancer>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-base sm:text-lg text-gray-600">
          Search our knowledge base for answers to common questions
        </p>

        {/* Enhanced Search with autocomplete */}
        <div className="mx-auto mt-6 max-w-2xl px-4 sm:px-0">
          <EnhancedSearchBar autoFocus />
        </div>

        {/* Top tasks */}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6 px-4 sm:px-0">
          {topTasks.map((task) => {
            const Icon = task.icon;
            return (
              <Link 
                key={task.label} 
                href={task.href} 
                className="group rounded-lg sm:rounded-xl border bg-white px-2 sm:px-3 py-2 hover:shadow transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 group-hover:bg-[#1c46ce]/10 flex items-center justify-center transition-colors">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-[#1c46ce]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium group-hover:text-[#1c46ce] truncate">{task.label}</div>
                    <div className="text-xs text-gray-500 hidden sm:block">Quick link</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
