'use client';

import React, { useState } from 'react';
import { StateMonitoringDashboard } from '@/components/admin/StateMonitoringDashboard';
import { BulkRepairPanel } from '@/components/admin/BulkRepairPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Wrench } from 'lucide-react';

/**
 * State Integrity Admin Dashboard
 *
 * Provides administrators with comprehensive tools for:
 * - Real-time monitoring of state consistency health
 * - Bulk repair operations for multiple URLs
 * - Issue distribution analysis
 * - Health metrics and trends
 *
 * Features:
 * - Two-tab interface: Monitoring and Repair
 * - Real-time metrics updates
 * - Bulk operations with progress tracking
 * - CSV export for reporting
 */
export default function StateIntegrityPage() {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'repair'>('monitoring');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">State Integrity Administration</h1>
        <p className="text-lg text-gray-600 mt-2">
          Monitor URL state consistency and perform bulk repairs across your document collection
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'monitoring' | 'repair')}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <TabsList className="w-full justify-start border-b rounded-none px-6">
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monitoring Dashboard
            </TabsTrigger>
            <TabsTrigger value="repair" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Bulk Repair
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <StateMonitoringDashboard key={refreshKey} />
          </div>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>About State Integrity Monitoring</CardTitle>
              <CardDescription>
                Understanding the dashboard metrics and what they mean for your collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Health Score</h4>
                <p className="text-sm text-gray-600">
                  Represents the percentage of URLs in a consistent state. A healthy collection should maintain a score of 90% or higher.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Issue Types</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>LINKED_BUT_NOT_STORED:</strong> URL has a Zotero item but is not marked as stored
                  </li>
                  <li>
                    <strong>STORED_BUT_NO_ITEM:</strong> URL is marked as stored but has no Zotero item
                  </li>
                  <li>
                    <strong>DUAL_STATE_MISMATCH:</strong> processingStatus and zoteroProcessingStatus don't match
                  </li>
                  <li>
                    <strong>ITEM_EXISTS_WRONG_STATE:</strong> URL has an item but is in archived or ignored state
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Critical vs Warnings</h4>
                <p className="text-sm text-gray-600">
                  Critical issues affect data integrity and should be repaired immediately. Warnings are non-critical but should be addressed when convenient.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repair Tab */}
        <TabsContent value="repair" className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <BulkRepairPanel onRepairComplete={handleRefresh} />
          </div>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>About Bulk Repair Operations</CardTitle>
              <CardDescription>
                Safety and best practices for repairing state consistency issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">How Bulk Repair Works</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Select the issue type(s) and severity you want to repair</li>
                  <li>Review the affected URLs before confirming the operation</li>
                  <li>Confirm that you understand the changes that will be made</li>
                  <li>The system repairs the URLs with real-time progress tracking</li>
                  <li>Export a detailed CSV report of all repairs made</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Repair Types</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Transition Repair:</strong> Move URL to the correct state based on issue type
                  </li>
                  <li>
                    <strong>Reset Repair:</strong> Reset to not_started state for fresh processing
                  </li>
                  <li>
                    <strong>Sync Repair:</strong> Synchronize conflicting status fields
                  </li>
                  <li>
                    <strong>Clear Repair:</strong> Remove invalid item references
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Best Practices</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Always review affected URLs before confirming bulk operations</li>
                  <li>Start with smaller batches to verify repair behavior</li>
                  <li>Export and keep reports for audit and compliance purposes</li>
                  <li>Monitor the dashboard after repairs to ensure health improves</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          For more information about state integrity, see the documentation or contact your system administrator.
        </p>
      </div>
    </div>
  );
}
