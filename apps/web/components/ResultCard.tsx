import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/Badge';
import { formatDistanceToNow } from 'date-fns';
import { cleanMarkdown, cleanSnippet, formatArticleType } from '@/lib/text-utils';
import { Icon } from '@/components/ui/icon';

interface ResultCardProps {
  title: string;
  slug: string;
  summary?: string | null;
  type: string;
  category: string;
  readingTime: number;
  updatedAt: string;
  snippet?: string;
}

export function ResultCard({
  title,
  slug,
  summary,
  type,
  category,
  readingTime,
  updatedAt,
  snippet,
}: ResultCardProps) {

  return (
    <div className="mb-6">
      <Link href={`/a/${slug}`}>
        <Card className="hover:shadow-lg hover:outline hover:outline-1 hover:outline-primary transition-all rounded-lg bg-white border border-gray-100 shadow-sm">
        <CardHeader className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
            <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 flex-1 text-gray-900">
              {cleanMarkdown(title)}
            </CardTitle>
            <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
              <Badge type={formatArticleType(type)} />
              <Badge category={category} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Icon name="clock" className="w-3.5 h-3.5" />
              {readingTime} min read
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Icon name="calendar" className="w-3.5 h-3.5" />
              Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>
        </CardHeader>
        {(summary || snippet) && (
          <CardContent className="pt-0 px-3 pb-3 sm:px-4 sm:pb-4">
            {summary ? (
              <p className="text-sm text-gray-600 line-clamp-2 leading-normal">
                {cleanMarkdown(summary)}
              </p>
            ) : snippet ? (
              <p className="text-sm text-gray-600 line-clamp-2 leading-normal">
                {cleanSnippet(snippet)}
              </p>
            ) : null}
          </CardContent>
        )}
      </Card>
      </Link>
    </div>
  );
}
