'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthMetrics {
  totalUrls: number;
  healthyUrls: number;
  issueUrls: number;
  healthPercentage: number;
  errorCount: number;
  warningCount: number;
  issueDistribution: Record<string, number>;
  recentlyRepaired: number;
}

/**
 * State Monitoring Dashboard Component
 *
 * Real-time visibility into state integrity metrics and health.
 *
 * Features:
 * - Overall health percentage with color coding
 * - Issue distribution breakdown
 * - Error vs. warning counts
 * - Recently repaired count
 * - Auto-refresh capability
 * - Clean, professional layout
 */
export function StateMonitoringDashboard() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/state-integrity/health');
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <Button onClick={fetchMetrics} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getHealthColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-600';
    if (percentage >= 85) return 'bg-blue-600';
    if (percentage >= 70) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getHealthBgColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-50 border-green-200';
    if (percentage >= 85) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getHealthTextColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-900';
    if (percentage >= 85) return 'text-blue-900';
    if (percentage >= 70) return 'text-yellow-900';
    return 'text-red-900';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            State Integrity Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time visibility into URL state consistency and health metrics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMetrics}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-xs text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      {/* Overall Health Card */}
      <div
        className={cn(
          'rounded-lg border-2 p-6',
          getHealthBgColor(metrics.healthPercentage)
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className={cn('text-sm font-medium', getHealthTextColor(metrics.healthPercentage))}>
              Overall Health Score
            </p>
            <p className={cn('text-5xl font-bold mt-2', getHealthTextColor(metrics.healthPercentage))}>
              {metrics.healthPercentage}%
            </p>
          </div>

          {metrics.healthPercentage >= 95 ? (
            <CheckCircle2 className={cn('h-12 w-12', 'text-green-600')} />
          ) : (
            <AlertCircle className={cn('h-12 w-12', getHealthTextColor(metrics.healthPercentage))} />
          )}
        </div>

        {/* Health Bar */}
        <div className="mt-4">
          <div className={cn('h-2 rounded-full overflow-hidden bg-white/30')}>
            <div
              className={cn('h-full transition-all', getHealthColor(metrics.healthPercentage))}
              style={{ width: `${metrics.healthPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total URLs */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Total URLs</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalUrls}</p>
          <p className="text-xs text-gray-500 mt-2">
            {metrics.healthyUrls} healthy, {metrics.issueUrls} with issues
          </p>
        </div>

        {/* Healthy URLs */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900 mb-1">Healthy URLs</p>
          <p className="text-3xl font-bold text-green-600">{metrics.healthyUrls}</p>
          <p className="text-xs text-green-700 mt-2">
            {metrics.totalUrls > 0
              ? `${Math.round((metrics.healthyUrls / metrics.totalUrls) * 100)}% of total`
              : 'N/A'}
          </p>
        </div>

        {/* Issues Found */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900 mb-1">Issues Found</p>
          <p className="text-3xl font-bold text-red-600">{metrics.issueUrls}</p>
          <p className="text-xs text-red-700 mt-2">
            {metrics.errorCount} critical, {metrics.warningCount} warnings
          </p>
        </div>

        {/* Recently Repaired */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900 mb-1">Recently Repaired</p>
          <p className="text-3xl font-bold text-blue-600">{metrics.recentlyRepaired}</p>
          <p className="text-xs text-blue-700 mt-2">Last 7 days</p>
        </div>
      </div>

      {/* Issue Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Issue Distribution
          </h3>
        </div>

        {Object.keys(metrics.issueDistribution).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium">No issues detected</p>
            <p className="text-sm">All URLs are in a consistent state!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(metrics.issueDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([issue, count]) => {
                const percentage = (count / metrics.issueUrls) * 100;
                return (
                  <div key={issue}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{issue}</p>
                      <p className="text-sm text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical Issues */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Critical Issues</h4>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {metrics.errorCount}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Require immediate attention. These are linked/stored state issues.
              </p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Warnings</h4>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {metrics.warningCount}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Non-critical issues. Can be repaired at your convenience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button className="w-full" variant="outline">
            View All Issues
          </Button>
          <Button className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Start Bulk Repair
          </Button>
        </div>
      </div>

      {/* Health Indicator Legend */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Health Indicator</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600" />
            <p className="text-xs text-gray-600">95%+ Excellent</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            <p className="text-xs text-gray-600">85-95% Good</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-600" />
            <p className="text-xs text-gray-600">70-85% Fair</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-600" />
            <p className="text-xs text-gray-600">&lt;70% Poor</p>
          </div>
        </div>
      </div>
    </div>
  );
}
