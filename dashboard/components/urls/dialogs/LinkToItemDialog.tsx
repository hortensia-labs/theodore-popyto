'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { getItem, type ZoteroItemResponse } from '@/lib/zotero-client';

interface LinkToItemDialogProps {
  urlId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (itemKey: string, itemPreview: ZoteroItemResponse) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Link to Existing Zotero Item Dialog
 *
 * Allows user to:
 * 1. Enter a Zotero item key
 * 2. Verify the item exists and preview it
 * 3. Confirm linking the URL to that item
 */
export function LinkToItemDialog({
  urlId,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: LinkToItemDialogProps) {
  const [itemKey, setItemKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [itemPreview, setItemPreview] = useState<ZoteroItemResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleVerifyItem = async () => {
    if (!itemKey.trim()) {
      setVerificationError('Please enter a Zotero item key');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setItemPreview(null);

    try {
      const item = await getItem(itemKey.trim());

      // getItem() now returns the item data directly on success
      // If we get here with success: true, the item was found
      if (item.success) {
        setItemPreview(item);
      } else {
        setVerificationError(item.error?.message || 'Failed to retrieve item');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setVerificationError(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirm = async () => {
    if (!itemPreview) {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(itemKey.trim(), itemPreview);
      // Reset dialog on success
      setItemKey('');
      setItemPreview(null);
      setVerificationError(null);
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (!isVerifying && !isConfirming && !isLoading) {
      setItemKey('');
      setItemPreview(null);
      setVerificationError(null);
      onOpenChange(false);
    }
  };

  const getItemPreviewText = (): string => {
    if (!itemPreview) return '';

    // Try to use citation if available
    if (itemPreview.citation) {
      return itemPreview.citation;
    }

    // Otherwise build a preview from components
    const parts: string[] = [];

    // Title
    if (itemPreview.title) {
      parts.push(itemPreview.title);
    } else if (itemPreview.fields?.['1']) {
      // Field 1 is title in Zotero schema
      parts.push(itemPreview.fields['1']);
    }

    // Authors/Creators
    if (itemPreview.creators && itemPreview.creators.length > 0) {
      const authors = itemPreview.creators
        .map((c) => {
          if (c.name) return c.name;
          return [c.firstName, c.lastName].filter(Boolean).join(' ');
        })
        .filter(Boolean);

      if (authors.length > 0) {
        parts.push(`by ${authors.join(', ')}`);
      }
    }

    // Item type
    if (itemPreview.itemType) {
      parts.push(`(${itemPreview.itemType})`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Item found (no details available)';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link to Existing Zotero Item</DialogTitle>
          <DialogDescription>
            Enter the Zotero item key to verify and link this URL to an existing item in your library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zotero Item Key</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., ABC123XY"
                value={itemKey}
                onChange={(e) => {
                  setItemKey(e.target.value);
                  setVerificationError(null);
                  setItemPreview(null);
                }}
                disabled={isVerifying || isConfirming || isLoading}
                className="font-mono"
              />
              <Button
                onClick={handleVerifyItem}
                disabled={!itemKey.trim() || isVerifying || isConfirming || isLoading}
                variant="outline"
              >
                {isVerifying ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              The item key is typically visible in the Zotero web interface or item details.
            </p>
          </div>

          {/* Verification Error */}
          {verificationError && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-600">{verificationError}</div>
            </div>
          )}

          {/* Item Preview */}
          {itemPreview && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900">Item found and verified</p>
                  <p className="text-sm text-green-700 break-words">{getItemPreviewText()}</p>
                  {itemPreview.dateAdded && (
                    <p className="text-xs text-green-600 mt-1">
                      Added: {new Date(itemPreview.dateAdded).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-xs">
                  <span className="font-medium text-gray-700">Key: </span>
                  <span className="font-mono text-gray-600">{itemPreview.key}</span>
                </div>
                {itemPreview.itemType && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Type: </span>
                    <span className="text-gray-600">{itemPreview.itemType}</span>
                  </div>
                )}
                {itemPreview.creators && itemPreview.creators.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Creators: </span>
                    <span className="text-gray-600">{itemPreview.creators.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isVerifying || isConfirming || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!itemPreview || isConfirming || isLoading || isVerifying}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConfirming || isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              'Link Item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
