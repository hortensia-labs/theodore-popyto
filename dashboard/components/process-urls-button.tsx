'use client';

import { useState } from 'react';
import { ProcessUrlsModal } from '@/components/process-urls-modal';
import { Button } from '@/components/ui/button';

export function ProcessUrlsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleComplete = () => {
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        Process URLs from Sources
      </Button>
      
      {isModalOpen && (
        <ProcessUrlsModal
          onClose={() => setIsModalOpen(false)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

