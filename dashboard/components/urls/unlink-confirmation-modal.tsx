'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnlinkConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onUnlinkOnly: () => void;
  onUnlinkAndDelete: () => void;
  isProcessing?: boolean;
}

export function UnlinkConfirmationModal({
  open,
  onOpenChange,
  itemCount,
  onUnlinkOnly,
  onUnlinkAndDelete,
  isProcessing = false,
}: UnlinkConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Unlink from Zotero
          </DialogTitle>
          <DialogDescription>
            You are about to unlink {itemCount} {itemCount === 1 ? 'URL' : 'URLs'} from {itemCount === 1 ? 'its' : 'their'} Zotero {itemCount === 1 ? 'item' : 'items'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Important:</strong> You have two options:
            </p>
            <ul className="mt-2 space-y-2 text-sm text-amber-800">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                <span><strong>Unlink Only:</strong> Removes the link but keeps the Zotero {itemCount === 1 ? 'item' : 'items'} in your library.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                <span><strong>Unlink and Delete:</strong> Removes the link AND permanently deletes the Zotero {itemCount === 1 ? 'item' : 'items'} from your library. This action cannot be undone.</span>
              </li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-600">
            Choose carefully based on whether you want to keep these {itemCount === 1 ? 'item' : 'items'} in your Zotero library.
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => {
              onUnlinkOnly();
              onOpenChange(false);
            }}
            variant="outline"
            disabled={isProcessing}
            className="w-full text-red-600 border-red-600 cursor-pointer"
          >
            Unlink Only (Keep in Zotero)
          </Button>
          
          <Button
            onClick={() => {
              onUnlinkAndDelete();
              onOpenChange(false);
            }}
            variant="destructive"
            disabled={isProcessing}
            className="w-full text-white cursor-pointer"
          >
            Unlink and Delete from Zotero
          </Button>
          
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            disabled={isProcessing}
            className="w-full cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

