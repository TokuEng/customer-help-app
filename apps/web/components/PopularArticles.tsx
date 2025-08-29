'use client';

import { api, type PopularArticle } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { cleanMarkdown } from '@/lib/text-utils';
import { useEffect, useState } from 'react';
import { ArticleProgress } from '@/components/LoadingProgress';
import { Icon } from '@/components/ui/icon';

export function PopularArticles() {
  const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPopularArticles() {
      try {
        const articles = await api.getPopularArticles(5);
        setPopularArticles(articles);
      } catch (error) {
        // Failed to fetch popular articles
        setError('Unable to load popular articles. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPopularArticles();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Popular Articles</h2>
          <div className="py-8">
            <ArticleProgress />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Popular Articles</h2>
          <div className="text-center py-8 text-gray-500">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (popularArticles.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Popular Articles</h2>
          <div className="text-center py-8 text-gray-500">
            No popular articles yet. Be the first to explore our help center!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 sm:mb-6 md:mb-8">Popular Articles</h2>
        <div className="space-y-3 sm:space-y-4">
          {popularArticles.map((article) => (
            <Link key={article.slug} href={`/a/${article.slug}`} className="block group">
              <Card className="hover:shadow-lg transition-shadow rounded-lg border border-gray-100 shadow-sm">
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <CardTitle className="text-sm sm:text-base lg:text-lg font-bold group-hover:text-primary transition-colors line-clamp-2 flex-1">
                      {cleanMarkdown(article.title)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      <span className="flex items-center gap-1 font-medium">
                        <Icon name="clock" className="w-3 h-3" />
                        {article.reading_time_min} min
                      </span>
                      {article.view_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{article.view_count} {article.view_count === 1 ? 'view' : 'views'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {article.summary && (
                    <CardDescription className="mt-2 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {cleanMarkdown(article.summary)}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
