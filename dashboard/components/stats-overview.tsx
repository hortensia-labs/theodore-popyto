import { getOverviewStats } from '@/lib/actions/stats';
import { URL_STATUS_CONFIG } from '@/lib/db/computed';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  TrendingUp,
  Hash,
} from 'lucide-react';

export async function StatsOverview() {
  const result = await getOverviewStats();
  
  if (!result.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        {result.error || 'Failed to load stats'}
      </div>
    );
  }
  
  const { 
    totalUrls, 
    totalSections, 
    processing,
    processingStatusDistribution,
    userIntentDistribution,
    citation,
    attempts,
    enrichment 
  } = result.data;
  
  // Processing status display config
  const PROCESSING_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    stored: { label: 'Stored', color: 'bg-green-500', icon: CheckCircle },
    stored_incomplete: { label: 'Stored (Incomplete)', color: 'bg-yellow-500', icon: AlertTriangle },
    stored_custom: { label: 'Stored (Custom)', color: 'bg-purple-500', icon: CheckCircle },
    not_started: { label: 'Not Started', color: 'bg-gray-400', icon: Clock },
    processing_zotero: { label: 'Processing (Zotero)', color: 'bg-blue-500', icon: Loader2 },
    processing_content: { label: 'Processing (Content)', color: 'bg-blue-500', icon: Loader2 },
    processing_llm: { label: 'Processing (LLM)', color: 'bg-blue-500', icon: Loader2 },
    awaiting_selection: { label: 'Awaiting Selection', color: 'bg-cyan-500', icon: Clock },
    awaiting_metadata: { label: 'Awaiting Metadata', color: 'bg-cyan-500', icon: Clock },
    exhausted: { label: 'Exhausted', color: 'bg-red-500', icon: XCircle },
    ignored: { label: 'Ignored', color: 'bg-gray-300', icon: XCircle },
    archived: { label: 'Archived', color: 'bg-gray-500', icon: XCircle },
  };
  
  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1">Total URLs</div>
          <div className="text-3xl font-bold">{totalUrls.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            Across {totalSections} sections
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Success Rate
          </div>
          <div className="text-3xl font-bold text-green-600">
            {processing.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {processing.stored.toLocaleString()} successfully stored
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Hash className="h-4 w-4" />
            Avg. Attempts
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {processing.averageAttempts.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per URL processed
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Needs Attention
          </div>
          <div className="text-3xl font-bold text-yellow-600">
            {(processing.awaitingUser + processing.exhausted).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Awaiting user action
          </div>
        </div>
      </div>
      
      {/* Workflow State Overview */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Workflow State Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{processing.stored}</div>
            <div className="text-xs text-gray-600 mt-1">Stored</div>
          </div>
          
          <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
            <Clock className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-cyan-700">{processing.awaitingUser}</div>
            <div className="text-xs text-gray-600 mt-1">Awaiting User</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-700">{processing.exhausted}</div>
            <div className="text-xs text-gray-600 mt-1">Exhausted</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{processing.processing}</div>
            <div className="text-xs text-gray-600 mt-1">Processing</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <XCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-700">{processing.ignored}</div>
            <div className="text-xs text-gray-600 mt-1">Ignored</div>
          </div>
          
          <div className="text-center p-3 bg-gray-100 rounded-lg border border-gray-300">
            <XCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-700">{processing.archived}</div>
            <div className="text-xs text-gray-600 mt-1">Archived</div>
          </div>
        </div>
      </div>
      
      {/* Processing Status Distribution (Detailed) */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Processing Status Distribution</h3>
        
        <div className="space-y-3">
          {Object.entries(processingStatusDistribution)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([status, count]) => {
              const config = PROCESSING_STATUS_CONFIG[status] || { 
                label: status, 
                color: 'bg-gray-500',
                icon: Clock 
              };
              const percentage = totalUrls > 0 ? (count / totalUrls) * 100 : 0;
              const Icon = config.icon;
              
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <span className="text-gray-600">
                      {count.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${config.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      
      {/* Citation Quality */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Citation Quality</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Valid Citations</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-700">{citation.valid}</div>
            <div className="text-xs text-green-600 mt-1">
              {totalUrls > 0 ? ((citation.valid / totalUrls) * 100).toFixed(1) : 0}% of total
            </div>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-900">Incomplete</span>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-700">{citation.incomplete}</div>
            <div className="text-xs text-yellow-600 mt-1">
              Missing critical fields
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Not Validated</span>
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-700">{citation.notValidated}</div>
            <div className="text-xs text-gray-500 mt-1">
              Not yet processed
            </div>
          </div>
        </div>
      </div>
      
      {/* Processing Attempts Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Processing Attempts</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">No attempts</span>
              <span className="text-lg font-bold">{attempts.none}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gray-400"
                style={{ width: `${totalUrls > 0 ? (attempts.none / totalUrls) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">1-2 attempts</span>
              <span className="text-lg font-bold text-blue-600">{attempts.oneToTwo}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${totalUrls > 0 ? (attempts.oneToTwo / totalUrls) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">3+ attempts</span>
              <span className="text-lg font-bold text-red-600">{attempts.threePlus}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${totalUrls > 0 ? (attempts.threePlus / totalUrls) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* User Intent Distribution */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">User Intent</h3>
          
          <div className="space-y-3">
            {Object.entries(userIntentDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([intent, count]) => {
                const percentage = totalUrls > 0 ? (count / totalUrls) * 100 : 0;
                const intentLabels: Record<string, string> = {
                  auto: 'Auto',
                  ignore: 'Ignore',
                  priority: 'Priority',
                  manual_only: 'Manual Only',
                  archive: 'Archive',
                };
                
                return (
                  <div key={intent}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{intentLabels[intent] || intent}</span>
                      <span className="text-gray-600">
                        {count.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          intent === 'auto' ? 'bg-green-500' :
                          intent === 'priority' ? 'bg-blue-500' :
                          intent === 'ignore' ? 'bg-gray-400' :
                          intent === 'archive' ? 'bg-gray-500' :
                          'bg-purple-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      
      {/* Enrichment Progress */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Enrichment Progress</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {enrichment.percentageEnriched.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Enrichment Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {enrichment.totalEnriched} / {totalUrls} URLs
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-green-600">
              {enrichment.totalWithNotes}
            </div>
            <div className="text-sm text-gray-600">With Notes</div>
            <div className="text-xs text-gray-500 mt-1">
              User annotations
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {enrichment.totalWithCustomIds}
            </div>
            <div className="text-sm text-gray-600">Custom IDs</div>
            <div className="text-xs text-gray-500 mt-1">
              User-added identifiers
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-indigo-600">
              {enrichment.totalEnriched}
            </div>
            <div className="text-sm text-gray-600">Total Enriched</div>
            <div className="text-xs text-gray-500 mt-1">
              With any enrichment
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Required Summary */}
      {(processing.awaitingUser > 0 || processing.exhausted > 0 || processing.processing > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Action Required
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            {processing.processing > 0 && (
              <div className="flex items-center justify-between">
                <span>⏳ {processing.processing} URL(s) currently processing</span>
                <span className="text-xs text-blue-600">Monitor for completion</span>
              </div>
            )}
            {processing.awaitingUser > 0 && (
              <div className="flex items-center justify-between">
                <span>👤 {processing.awaitingUser} URL(s) need user action</span>
                <span className="text-xs text-blue-600">Select identifier or approve metadata</span>
              </div>
            )}
            {processing.exhausted > 0 && (
              <div className="flex items-center justify-between">
                <span>⚠️ {processing.exhausted} URL(s) exhausted</span>
                <span className="text-xs text-blue-600">Manual creation needed</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

