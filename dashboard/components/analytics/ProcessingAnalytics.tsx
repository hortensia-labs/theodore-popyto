/**
 * Processing Analytics Dashboard
 * 
 * Comprehensive analytics view showing:
 * - Success rates by stage
 * - Status distribution
 * - Processing time statistics
 * - Error distribution
 * - Intent distribution
 * - Export functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { exportAnalytics, exportProcessingHistory } from '@/lib/actions/export-history';
import { getProcessingStatusDistribution, getUserIntentDistribution } from '@/lib/actions/url-with-capabilities';
import { Download, TrendingUp, BarChart3, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AnalyticsData {
  totalUrls: number;
  statusDistribution: Record<string, number>;
  intentDistribution: Record<string, number>;
  attemptDistribution: {
    none: number;
    one_to_two: number;
    three_plus: number;
  };
  citationDistribution: {
    valid: number;
    incomplete: number;
    not_validated: number;
  };
  successRate: number;
  averageAttempts: number;
}

/**
 * Processing Analytics Dashboard Component
 */
export function ProcessingAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load analytics data
   */
  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await exportAnalytics();

      if (result.success && result.data) {
        setAnalytics(result.data as AnalyticsData);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export all data to JSON
   */
  const handleExportJSON = async () => {
    try {
      const result = await exportProcessingHistory({}, 'json');

      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `url-processing-history-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  /**
   * Export to CSV
   */
  const handleExportCSV = async () => {
    try {
      const result = await exportProcessingHistory({}, 'csv');

      if (result.success && result.data) {
        const blob = new Blob([result.data as string], {
          type: 'text/csv',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `url-processing-history-${Date.now()}.csv`;
        link.click();

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <BarChart3 className="h-12 w-12 animate-pulse text-blue-600 mx-auto" />
          <p className="text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-sm text-red-800">{error || 'Failed to load analytics'}</p>
          <Button onClick={loadAnalytics} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Processing Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Insights into URL processing performance and outcomes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportJSON} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={BarChart3}
          label="Total URLs"
          value={analytics.totalUrls.toString()}
          color="blue"
        />
        <MetricCard
          icon={CheckCircle}
          label="Success Rate"
          value={`${analytics.successRate.toFixed(1)}%`}
          color="green"
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Attempts"
          value={analytics.averageAttempts.toFixed(1)}
          color="purple"
        />
        <MetricCard
          icon={Clock}
          label="Stored URLs"
          value={Object.entries(analytics.statusDistribution)
            .filter(([k]) => k.startsWith('stored'))
            .reduce((sum, [, v]) => sum + v, 0)
            .toString()}
          color="indigo"
        />
      </div>

      {/* Status Distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <div className="space-y-3">
          {Object.entries(analytics.statusDistribution)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => {
              const percentage = (count / analytics.totalUrls) * 100;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 capitalize">
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-600">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Intent Distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Intent</h3>
          <div className="space-y-2">
            {Object.entries(analytics.intentDistribution).map(([intent, count]) => (
              <div key={intent} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize">{intent.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attempt Distribution */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Attempts</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">No attempts</span>
              <span className="font-medium text-gray-900">{analytics.attemptDistribution.none}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">1-2 attempts</span>
              <span className="font-medium text-gray-900">{analytics.attemptDistribution.one_to_two}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">3+ attempts</span>
              <span className="font-medium text-red-600">{analytics.attemptDistribution.three_plus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Citation Quality */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Citation Quality</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-green-600">
              {analytics.citationDistribution.valid}
            </p>
            <p className="text-sm text-green-700 mt-1">Valid</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-600">
              {analytics.citationDistribution.incomplete}
            </p>
            <p className="text-sm text-yellow-700 mt-1">Incomplete</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-2xl font-bold text-gray-600">
              {analytics.citationDistribution.not_validated}
            </p>
            <p className="text-sm text-gray-700 mt-1">Not Validated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  const colorClass = colors[color as keyof typeof colors] || colors.blue;

  return (
    <div className={`rounded-lg border p-4 ${colorClass}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8" />
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

