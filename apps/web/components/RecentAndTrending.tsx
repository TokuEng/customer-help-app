"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, TrendingUp, Tag } from "lucide-react";
import { api } from "@/lib/api";

interface RecentArticle {
  title: string;
  slug: string;
}

export default function RecentAndTrending() {
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<RecentArticle[]>([]);
  const [trendingTags] = useState<string[]>([
    "payroll", "benefits", "expenses", "onboarding", "leave", "tax", "policies"
  ]);

  // Load recent articles from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentArticles");
    if (stored) {
      try {
        setRecentArticles(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        // Failed to parse recent articles from localStorage
      }
    }
  }, []);

  // Load popular articles this week
  useEffect(() => {
    async function fetchPopular() {
      try {
        const articles = await api.getPopularArticles(5);
        setPopularArticles(articles);
      } catch (error) {
        // Failed to fetch popular articles
      }
    }
    fetchPopular();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8 py-8 sm:py-10 border-t">
      <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Popular this week */}
        <div className="order-1">
          <h3 className="text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#1c46ce]" />
            Popular this week
          </h3>
          <div className="space-y-1.5 sm:space-y-2">
            {popularArticles.length > 0 ? (
              popularArticles.slice(0, 5).map((article) => (
                <Link
                  key={article.slug}
                  href={`/a/${article.slug}`}
                  className="block text-sm text-gray-600 hover:text-[#1c46ce] transition-colors py-0.5 sm:py-1 truncate"
                >
                  {article.title}
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500">No popular articles yet</p>
            )}
          </div>
        </div>

        {/* Recently viewed - hidden on mobile */}
        <div className="order-3 sm:order-2">
          <h3 className="text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#1c46ce]" />
            Recently viewed
          </h3>
          <div className="space-y-1.5 sm:space-y-2">
            {recentArticles.length > 0 ? (
              recentArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/a/${article.slug}`}
                  className="block text-sm text-gray-600 hover:text-[#1c46ce] transition-colors py-0.5 sm:py-1 truncate"
                >
                  {article.title}
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recently viewed articles</p>
            )}
          </div>
        </div>

        {/* Trending tags */}
        <div className="order-2 sm:order-3 col-span-1 sm:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#1c46ce]" />
            Trending topics
          </h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
