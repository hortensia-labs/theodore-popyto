'use client';

import { CheckCircle2, XCircle, AlertCircle, Cpu, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProviderStatusProps {
  availability: {
    available: boolean;
    providers: Array<{
      name: string;
      available: boolean;
      error?: string;
    }>;
  };
  providerUsed?: string;
}

export function ProviderStatus({ availability, providerUsed }: ProviderStatusProps) {
  const getProviderIcon = (name: string) => {
    if (name.includes('ollama')) {
      return <Cpu className="h-4 w-4" />;
    }
    if (name.includes('anthropic')) {
      return <Cloud className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };
  
  const getProviderLabel = (name: string) => {
    if (name.includes('ollama')) {
      const model = name.split(':')[1] || 'llama3.2';
      return `Ollama (${model})`;
    }
    if (name.includes('anthropic')) {
      const model = name.split(':')[1] || 'claude';
      return `Anthropic Claude`;
    }
    return name;
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-medium mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        LLM Provider Status
      </h3>
      
      <div className="space-y-2">
        {availability.providers.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
          >
            <div className="flex items-center gap-3">
              {getProviderIcon(provider.name)}
              <div>
                <div className="text-sm font-medium">
                  {getProviderLabel(provider.name)}
                </div>
                {provider.error && (
                  <div className="text-xs text-red-600 mt-1">
                    {provider.error}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {providerUsed === provider.name && (
                <Badge variant="default" className="text-xs">
                  Used
                </Badge>
              )}
              {provider.available ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        ))}
        
        {availability.providers.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No LLM providers configured</p>
            <p className="text-xs mt-1">
              Set up Ollama or Anthropic Claude in your environment variables
            </p>
          </div>
        )}
      </div>
      
      {!availability.available && availability.providers.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium">No providers available</p>
              <p className="mt-1">
                {availability.providers.some(p => p.name.includes('ollama')) && (
                  <>Ollama: Start the Ollama server with <code className="bg-yellow-100 px-1 rounded">ollama serve</code><br /></>
                )}
                {availability.providers.some(p => p.name.includes('anthropic')) && (
                  <>Claude: Ensure your API key is correctly configured in environment variables</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

