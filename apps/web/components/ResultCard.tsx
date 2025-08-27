import Link from 'next/link';
import { Clock, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cleanMarkdown, formatArticleType } from '@/lib/text-utils';

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
  const typeColors: Record<string, string> = {
    'how-to': 'bg-blue-100 text-blue-800',
    'guide': 'bg-green-100 text-green-800',
    'policy': 'bg-purple-100 text-purple-800',
    'faq': 'bg-yellow-100 text-yellow-800',
    'process': 'bg-orange-100 text-orange-800',
    'info': 'bg-gray-100 text-gray-800',
  };

  const categoryColors: Record<string, string> = {
    'Library': 'bg-indigo-100 text-indigo-800',
    'Token Payroll': 'bg-teal-100 text-teal-800',
    'Benefits': 'bg-pink-100 text-pink-800',
    'Policy': 'bg-purple-100 text-purple-800',
  };

  return (
    <Link href={`/a/${slug}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <CardTitle className="text-xl line-clamp-2">{cleanMarkdown(title)}</CardTitle>
            <div className="flex gap-2 ml-4">
              <Badge variant="outline" className={typeColors[type] || typeColors.info}>
                {formatArticleType(type)}
              </Badge>
              <Badge variant="outline" className={categoryColors[category] || 'bg-gray-100 text-gray-800'}>
                {category}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} min read
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {snippet ? (
            <p className="text-sm text-muted-foreground line-clamp-3" 
               dangerouslySetInnerHTML={{ 
                 __html: snippet.replace(/\*\*/g, '<strong>').replace(/\*/g, '<em>') 
               }} />
          ) : summary ? (
            <CardDescription className="line-clamp-3">{cleanMarkdown(summary)}</CardDescription>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
