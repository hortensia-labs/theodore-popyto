'use client';

import { useState } from 'react';
import { DeduplicateUrlsModal } from '@/components/deduplicate-urls-modal';
import { Button } from '@/components/ui/button';

export function DeduplicateUrlsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleComplete = () => {
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="text-amber-700 border-amber-300 hover:bg-amber-50"
      >
        Deduplicate URLs
      </Button>

      {isModalOpen && (
        <DeduplicateUrlsModal
          onClose={() => setIsModalOpen(false)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
