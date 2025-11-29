import { getUrls } from '@/lib/actions/urls';
import { URLTable } from '@/components/urls/url-table';
import Link from 'next/link';

export default async function URLsPage() {
  const result = await getUrls({}, { page: 1, pageSize: 100 });
  
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">URL Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and enrich URLs from your thesis sections
          </p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
      
      {result.success && result.data ? (
        <URLTable
          initialUrls={result.data.urls}
          initialTotalPages={result.data.pagination.totalPages}
        />
      ) : (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {result.error || 'Failed to load URLs'}
        </div>
      )}
    </div>
  );
}

