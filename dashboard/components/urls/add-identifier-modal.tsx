'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { validateIdentifier } from '@/lib/actions/validate-identifier';
import { addIdentifier } from '@/lib/actions/enrichments';
import { PreviewModal } from './preview-modal';

interface AddIdentifierModalProps {
  urlId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddIdentifierModal({
  urlId,
  open,
  onOpenChange,
  onSuccess,
}: AddIdentifierModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedIdentifier, setValidatedIdentifier] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleValidate = async () => {
    if (!identifier.trim()) {
      setError('Please enter an identifier');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidatedIdentifier(null);

    try {
      const result = await validateIdentifier(identifier.trim());

      if (result.success && result.data) {
        setValidatedIdentifier(result.data);
        setError(null);
      } else {
        setError(result.error || 'Invalid identifier');
        setValidatedIdentifier(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate identifier');
      setValidatedIdentifier(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!validatedIdentifier) {
      setError('Please validate the identifier first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await addIdentifier(urlId, validatedIdentifier);

      if (result.success) {
        setIdentifier('');
        setValidatedIdentifier(null);
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error || 'Failed to save identifier');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save identifier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setValidatedIdentifier(null);
    setError(null);
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Identifier</DialogTitle>
          <DialogDescription>
            Enter an identifier to validate and add it to this URL. The identifier must have translators available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identifier
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError(null);
                  setValidatedIdentifier(null);
                }}
                placeholder="Enter identifier..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                disabled={isValidating || isSaving}
              />
              {validatedIdentifier && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Preview identifier"
                  disabled={isSaving}
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {validatedIdentifier && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
              Valid identifier: <strong>{validatedIdentifier}</strong>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isValidating || isSaving}
          >
            Cancel
          </Button>
          {!validatedIdentifier ? (
            <Button
              onClick={handleValidate}
              disabled={isValidating || !identifier.trim()}
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Add Identifier'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Preview Modal */}
      {validatedIdentifier && (
        <PreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          identifier={validatedIdentifier}
        />
      )}
    </Dialog>
  );
}

