import React from "react";
import Link from "next/link";
import { Book, Coins, Heart, Shield, ChevronRight } from "lucide-react";

interface CategoryItem {
  name: string;
  slug: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
}

export default function Categories({ items }: { items: CategoryItem[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 sm:py-10">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-semibold">Browse by category</h2>
        <Link href="/search" className="text-xs sm:text-sm text-[#1c46ce] hover:underline flex items-center gap-1">
          <span>View all articles</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>

      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(c => (
          <Link 
            key={c.slug} 
            href={`/search?category=${encodeURIComponent(c.name)}`} 
            className="rounded-lg sm:rounded-xl border bg-white p-3 sm:p-4 hover:shadow transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 ${c.bgColor} ${c.color} transition-transform group-hover:scale-110 flex-shrink-0`}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base">{c.name}</div>
                <div className="text-xs text-gray-500">{c.count} articles</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 group-hover:text-[#1c46ce] transition-colors flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Default category data with fallback counts
export const categoryData = [
  {
    name: 'Library',
    slug: 'library',
    icon: <Book className="h-5 w-5" />,
    count: 28,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    name: 'Token Payroll',
    slug: 'token-payroll',
    icon: <Coins className="h-5 w-5" />,
    count: 15,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    name: 'Benefits',
    slug: 'benefits',
    icon: <Heart className="h-5 w-5" />,
    count: 14,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    name: 'Policy',
    slug: 'policy',
    icon: <Shield className="h-5 w-5" />,
    count: 3,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];
