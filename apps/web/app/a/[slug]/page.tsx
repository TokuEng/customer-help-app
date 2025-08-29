import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Badge } from '@/components/Badge';
import { TOC } from '@/components/TOC';
import { Feedback } from '@/components/Feedback';
import Link from 'next/link';
import { VisitTracker } from '@/components/VisitTracker';
import { ArticleContent } from '@/components/ArticleContent';
import { RecentArticleTracker } from '@/components/RecentArticleTracker';
import { cleanMarkdown, formatArticleType } from '@/lib/text-utils';
import { Icon } from '@/components/ui/icon';
import '../../article.css';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  try {
    const article = await api.getArticle(slug);
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
  const { slug } = await params;
  let article;
  let relatedArticles;

  try {
    [article, relatedArticles] = await Promise.all([
      api.getArticle(slug),
      api.getRelatedArticles(slug, 5),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VisitTracker articleId={article.id} />
      <RecentArticleTracker title={article.title} slug={article.slug} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Main Content */}
            <article className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-12">
                {/* Header */}
                <header className="mb-8">
                  <div className="flex gap-2 mb-4">
                    <Badge type={formatArticleType(article.type)} />
                    <Badge category={article.category} />
                  </div>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight text-gray-900 tracking-tight">{cleanMarkdown(article.title)}</h1>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon name="clock" className="w-4 h-4" />
                      {article.reading_time_min} min read
                    </span>
                    <span className="hidden sm:block">·</span>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon name="calendar" className="w-4 h-4" />
                      Last updated {format(new Date(article.updated_at), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  
                  {article.summary && (
                    <p className="mt-4 sm:mt-6 text-lg sm:text-xl leading-relaxed text-gray-600 border-l-4 border-primary pl-4 sm:pl-6 py-3 sm:py-4 brand-surface rounded-r-lg">{cleanMarkdown(article.summary)}</p>
                  )}
                </header>

                {/* Content */}
                <div className="prose prose-base sm:prose-lg prose-brand max-w-none">
                  <ArticleContent content={article.content_html} />
                </div>

                {/* Feedback */}
                <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
                  <Feedback articleId={article.id} />
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-4 sm:space-y-6">
                              {/* Table of Contents */}
              {article.toc.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                  <h3 className="font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Contents
                  </h3>
                  <TOC items={article.toc} />
                </div>
              )}

                            {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
                  <h3 className="font-bold mb-4 text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Related Articles
                  </h3>
                  <div className="space-y-3">
                    {relatedArticles.map((related) => (
                      <Link key={related.slug} href={`/a/${related.slug}`} className="block group">
                        <div className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:brand-surface transition-all duration-200">
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors mb-2 leading-snug line-clamp-2">
                            {cleanMarkdown(related.title)}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge type={formatArticleType(related.type)} className="scale-90" />
                            <span className="flex items-center gap-1">
                              <Icon name="clock" className="w-4 h-4" />
                              {related.reading_time_min} min
                            </span>
                          </div>
                        </div>
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
