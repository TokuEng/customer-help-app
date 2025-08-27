'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/icon';

interface FeedbackProps {
  articleId: string;
}

export function Feedback({ articleId }: FeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (helpful: boolean) => {
    if (submitted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.submitFeedback(articleId, helpful);
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          {submitted ? (
            <div className="space-y-2">
              <p className="font-medium">Thanks for your feedback!</p>
              <p className="text-sm text-muted-foreground">
                Your input helps us improve our help center.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-medium">Was this article helpful?</p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleFeedback(true)}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Icon name="thumbs-up" className="h-4 w-4" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleFeedback(false)}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Icon name="thumbs-down" className="h-4 w-4" />
                  No
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
