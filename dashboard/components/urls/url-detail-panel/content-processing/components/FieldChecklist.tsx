/**
 * Field Checklist
 *
 * Shows which metadata fields were successfully extracted
 */

'use client';

import { CheckCircle, XCircle } from 'lucide-react';

interface Field {
  name: string;
  present: boolean;
}

interface FieldChecklistProps {
  fields: Field[];
}

export function FieldChecklist({ fields }: FieldChecklistProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field, index) => (
        <div key={index} className="flex items-center gap-2">
          {field.present ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          )}
          <span className={field.present ? 'text-gray-900' : 'text-gray-400'}>
            {field.name}
          </span>
        </div>
      ))}
    </div>
  );
}
