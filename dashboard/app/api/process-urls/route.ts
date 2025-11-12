import { spawn } from 'child_process';
import path from 'path';

/**
 * API Route: POST /api/process-urls
 * 
 * Processes URLs from source files in all sections by:
 * 1. Extracting URLs from sections/[section-name]/sources folders
 * 2. Analyzing URLs via citation linker API
 * 3. Generating reports in sections/[section-name]/references/url-report.json
 * 
 * Returns a streaming response with progress updates as JSON lines.
 */
export async function POST() {
  // Create a ReadableStream for streaming responses
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get the project root (dashboard is in the project root)
        const projectRoot = path.join(process.cwd(), '..');
        const scriptPath = path.join(projectRoot, 'lib', 'process-urls-in-sources.py');
        
        // Spawn the Python script
        const pythonProcess = spawn('python3', [scriptPath], {
          cwd: projectRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        
        // Handle stdout (progress updates)
        pythonProcess.stdout.on('data', (data: Buffer) => {
          const lines = data.toString().split('\n').filter((line: string) => line.trim());
          
          for (const line of lines) {
            try {
              // Validate it's JSON before sending
              JSON.parse(line);
              
              // Send the line as a chunk
              controller.enqueue(encoder.encode(line + '\n'));
            } catch (e) {
              // If it's not valid JSON, send as error
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'error',
                    message: `Invalid JSON from script: ${line}`,
                    timestamp: Date.now(),
                  }) + '\n'
                )
              );
            }
          }
        });
        
        // Handle stderr (errors)
        pythonProcess.stderr.on('data', (data: Buffer) => {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                message: data.toString(),
                timestamp: Date.now(),
              }) + '\n'
            )
          );
        });
        
        // Handle process completion
        pythonProcess.on('close', (code: number | null) => {
          if (code === 0) {
            // Process completed successfully
            controller.close();
          } else {
            // Process exited with error
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message: `Process exited with code ${code}`,
                  timestamp: Date.now(),
                }) + '\n'
              )
            );
            controller.close();
          }
        });
        
        // Handle process errors
        pythonProcess.on('error', (error: Error) => {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                message: `Failed to start process: ${error.message}`,
                timestamp: Date.now(),
              }) + '\n'
            )
          );
          controller.close();
        });
        
      } catch (error) {
        // Send error and close stream
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: Date.now(),
            }) + '\n'
          )
        );
        controller.close();
      }
    },
  });
  
  // Return streaming response
  // Using application/x-ndjson (newline-delimited JSON) for streaming JSON lines
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}

