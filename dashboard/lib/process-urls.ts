/**
 * Client-side utility for processing URLs with progress streaming.
 * 
 * This function calls the /api/process-urls endpoint and streams progress updates.
 * 
 * @param onProgress - Callback function called for each progress update
 * @param onError - Callback function called on errors
 * @param onComplete - Callback function called when processing completes
 * @returns Promise that resolves when the stream ends
 */
export async function processUrlsWithProgress(
  onProgress: (data: ProgressUpdate) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<void> {
  try {
    const response = await fetch('/api/process-urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete?.();
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as ProgressUpdate;
            onProgress(data);

            // Check if this is an error type
            if (data.type === 'error') {
              onError?.(new Error(data.message || 'Unknown error'));
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('Failed to parse progress line:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

/**
 * Progress update types emitted by the Python script
 */
export interface ProgressUpdate {
  type:
    | 'start'
    | 'section_start'
    | 'extraction_start'
    | 'extraction_progress'
    | 'extraction_complete'
    | 'extraction_warning'
    | 'analysis_start'
    | 'analysis_progress'
    | 'analysis_complete'
    | 'section_complete'
    | 'section_skip'
    | 'section_error'
    | 'complete'
    | 'error';
  timestamp: number;
  section?: string;
  message?: string;
  error?: string;
  [key: string]: unknown; // Allow additional fields
}

