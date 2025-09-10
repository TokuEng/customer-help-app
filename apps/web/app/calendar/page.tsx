import ImportantDatesCalendar from '@/components/ImportantDatesCalendar';
import { Calendar, AlertTriangle } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-8 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-[#1c46ce]" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                Contractor Payment Schedule
              </h1>
            </div>
            <p className="mt-3 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Stay on top of important payment dates and deadlines for smooth contractor operations
            </p>
          </div>
        </div>
      </div>

      {/* Important Warning */}
      <div className="mx-auto max-w-6xl px-4 md:px-8 pb-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-amber-800 mb-2">
                Critical Payment Timeline
              </h3>
              <p className="text-sm sm:text-base text-amber-800 leading-relaxed">
                <strong>Important:</strong> To ensure you&apos;re paid by the last working day of the month, 
                contractors must submit their invoice by no later than the <strong>19th of the month</strong>. 
                Admins must approve these invoices no later than the <strong>21st of the month</strong>. 
                Delays in submission can result in delayed payments by ~10 business days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Component */}
      <ImportantDatesCalendar title="Monthly Overview" />

      {/* Additional Information */}
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
        <div className="rounded-xl border bg-blue-50 p-6">
          <h2 className="text-lg font-semibold mb-3">How Payment Scheduling Works</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Invoice Due (20th):</strong> Submit and approve contractor invoices by the 20th of each month</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Pre-funding Sent:</strong> We send the pre-funding invoice to your client 2-3 business days after approval</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Pre-funding Due:</strong> Client payment is due 2-3 days before the contractor payment date</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Contractor Payment:</strong> Contractors are paid on the last working day of the month</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            All dates automatically adjust to the previous business day if they fall on a weekend.
          </p>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Contractor Payment Calendar | Toku Help Center',
  description: 'Track important contractor payment dates, invoice deadlines, and pre-funding schedules.',
};
