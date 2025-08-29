"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";

interface LoadingProgressProps {
  className?: string;
  message?: string;
  showMessage?: boolean;
}

export function LoadingProgress({ 
  className = "w-full", 
  message = "Loading...",
  showMessage = true 
}: LoadingProgressProps) {
  const [progress, setProgress] = React.useState(13);

  React.useEffect(() => {
    const timer1 = setTimeout(() => setProgress(33), 200);
    const timer2 = setTimeout(() => setProgress(66), 500);
    const timer3 = setTimeout(() => setProgress(85), 800);
    const timer4 = setTimeout(() => setProgress(100), 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div className="w-full space-y-2">
      {showMessage && (
        <p className="text-sm text-gray-600 text-center">{message}</p>
      )}
      <Progress
        value={progress}
        className={`h-2 ${className} [&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:via-sky-500 [&>div]:to-indigo-500 [&>div]:rounded-l-full`}
      />
    </div>
  );
}

export function SearchProgress() {
  return (
    <LoadingProgress 
      className="w-full max-w-md mx-auto" 
      message="Searching knowledge base..."
    />
  );
}

export function ArticleProgress() {
  return (
    <LoadingProgress 
      className="w-full max-w-lg mx-auto" 
      message="Loading popular articles..."
    />
  );
}

export function PageProgress() {
  return (
    <LoadingProgress 
      className="w-full max-w-sm mx-auto" 
      message="Loading page..."
      showMessage={false}
    />
  );
}


