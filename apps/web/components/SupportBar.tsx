'use client';

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import { WorkSubmissionForm } from "./WorkSubmissionForm";

export default function SupportBar() {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
    <div className="border-t bg-white/70 backdrop-blur sticky bottom-0 z-40">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-3">
        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="text-xs text-gray-600 text-center mb-2">Can&apos;t find what you&apos;re looking for?</div>
          <div className="flex justify-center">
            <button 
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center gap-1.5" 
              onClick={() => setShowForm(true)}
            >
              <HelpCircle className="h-3 w-3" />
              <span>Submit a request</span>
            </button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="text-sm text-gray-600">Can&apos;t find what you&apos;re looking for?</div>
          <button 
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5" 
            onClick={() => setShowForm(true)}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Submit a request
          </button>
        </div>
      </div>
    </div>
    {showForm && <WorkSubmissionForm isOpen={showForm} onClose={() => setShowForm(false)} />}
    </>
  );
}
