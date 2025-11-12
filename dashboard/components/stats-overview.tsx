import { getOverviewStats } from '@/lib/actions/stats';
import { URL_STATUS_CONFIG } from '@/lib/db/computed';

export async function StatsOverview() {
  const result = await getOverviewStats();
  
  if (!result.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {result.error || 'Failed to load stats'}
      </div>
    );
  }
  
  const { totalUrls, totalSections, statusDistribution, enrichment } = result.data;
  
  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total URLs</div>
          <div className="text-3xl font-bold">{totalUrls.toLocaleString()}</div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Sections</div>
          <div className="text-3xl font-bold">{totalSections}</div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Enriched</div>
          <div className="text-3xl font-bold">{enrichment.percentageEnriched.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {enrichment.totalEnriched} / {totalUrls} URLs
          </div>
        </div>
      </div>
      
      {/* Status distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
        
        <div className="space-y-3">
          {Object.entries(statusDistribution).map(([status, count]) => {
            const config = URL_STATUS_CONFIG[status as keyof typeof URL_STATUS_CONFIG];
            const percentage = totalUrls > 0 ? (count / totalUrls) * 100 : 0;
            
            const colorClasses = {
              black: 'bg-black',
              red: 'bg-red-500',
              green: 'bg-green-500',
              blue: 'bg-blue-500',
              pink: 'bg-pink-500',
              gray: 'bg-gray-500',
            };
            
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-gray-600">
                    {count.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colorClasses[config.color]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Enrichment details */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Enrichment Progress</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {enrichment.totalEnriched}
            </div>
            <div className="text-sm text-gray-600">URLs with enrichments</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-green-600">
              {enrichment.totalWithNotes}
            </div>
            <div className="text-sm text-gray-600">URLs with notes</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {enrichment.totalWithCustomIds}
            </div>
            <div className="text-sm text-gray-600">URLs with custom IDs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

