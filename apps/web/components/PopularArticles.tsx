'use client';

import { api, type PopularArticle } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { cleanMarkdown } from '@/lib/text-utils';
import { useEffect, useState } from 'react';

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
        console.error('Failed to fetch popular articles:', error);
        setError('Unable to load popular articles. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPopularArticles();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
          <div className="text-center py-8 text-gray-500">
            Loading popular articles...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
          <div className="text-center py-8 text-gray-500">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (popularArticles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
          <div className="text-center py-8 text-gray-500">
            No popular articles yet. Be the first to explore our help center!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
        <div className="space-y-4">
          {popularArticles.map((article) => (
            <Link key={article.slug} href={`/a/${article.slug}`} className="block group">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {cleanMarkdown(article.title)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{article.reading_time_min} min read</span>
                      {article.view_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{article.view_count} {article.view_count === 1 ? 'view' : 'views'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {article.summary && (
                    <CardDescription>
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
