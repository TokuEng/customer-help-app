import { notFound } from 'next/navigation';
import { Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { TOC } from '@/components/TOC';
import { Feedback } from '@/components/Feedback';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ArticlePageProps) {
  try {
    const article = await api.getArticle(params.slug);
    return {
      title: `${article.title} - Toku Help Center`,
      description: article.summary || `Learn about ${article.title}`,
    };
  } catch {
    return {
      title: 'Article Not Found - Toku Help Center',
    };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  let article;
  let relatedArticles;

  try {
    [article, relatedArticles] = await Promise.all([
      api.getArticle(params.slug),
      api.getRelatedArticles(params.slug, 5),
    ]);
  } catch (error) {
    notFound();
  }

  const typeColors: Record<string, string> = {
    'how-to': 'bg-blue-100 text-blue-800',
    'guide': 'bg-green-100 text-green-800',
    'policy': 'bg-purple-100 text-purple-800',
    'faq': 'bg-yellow-100 text-yellow-800',
    'process': 'bg-orange-100 text-orange-800',
    'info': 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <article className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-8">
                {/* Header */}
                <header className="mb-8">
                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline" className={typeColors[article.type] || typeColors.info}>
                      {article.type}
                    </Badge>
                    <Badge variant="outline">
                      {article.category}
                    </Badge>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.reading_time_min} min read
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last updated {format(new Date(article.updated_at), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  
                  {article.summary && (
                    <p className="mt-4 text-lg text-gray-600">{article.summary}</p>
                  )}
                </header>

                {/* Content */}
                <div 
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content_html }}
                />

                {/* Feedback */}
                <div className="mt-12">
                  <Feedback articleId={article.id} />
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-6">
              {/* Table of Contents */}
              {article.toc.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <TOC items={article.toc} />
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold mb-4">Related Articles</h3>
                  <div className="space-y-3">
                    {relatedArticles.map((related) => (
                      <Link key={related.slug} href={`/a/${related.slug}`}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardHeader className="p-4">
                            <CardTitle className="text-base line-clamp-2">
                              {related.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {related.type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {related.reading_time_min} min
                              </span>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
