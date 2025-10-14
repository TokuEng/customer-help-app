'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ArticleSummaryErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ArticleSummary Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when there's an error
      return (
        this.props.fallback || (
          <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm sm:text-base text-gray-600">
              Unable to display article summary at this time.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

