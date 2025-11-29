/**
 * Analytics Page
 * 
 * Dashboard showing processing analytics and statistics
 * 
 * Access at: http://localhost:3000/analytics
 */

import { ProcessingAnalytics } from '@/components/analytics/ProcessingAnalytics';
import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processing Analytics</h1>
          <p className="text-gray-600 mt-1">
            Insights and statistics for URL processing performance
          </p>
        </div>
        <Link href="/urls/new" className="text-blue-600 hover:underline">
          ← Back to URLs
        </Link>
      </div>

      <ProcessingAnalytics />
    </div>
  );
}

