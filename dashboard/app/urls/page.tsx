/**
 * New URL Management Page
 */

import { Suspense } from 'react';
import { getUrlsWithCapabilities } from '@/lib/actions/url-with-capabilities';
import { URLTableNew } from '@/components/urls/url-table/URLTableNew';

export default async function NewURLsPage() {
  const result = await getUrlsWithCapabilities({}, { page: 1, pageSize: 100 });
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {result.success && result.data ? (
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          <URLTableNew
            initialUrls={result.data.urls}
            initialTotalPages={result.data.pagination.totalPages}
          />
        </Suspense>
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {result.error || 'Failed to load URLs'}
        </div>
      )}
    </div>
  );
}

