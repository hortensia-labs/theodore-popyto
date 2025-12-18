/**
 * Content Info Grid
 *
 * Displays content information in a 2-column grid layout
 */

'use client';

interface ContentInfoItem {
  label: string;
  value: string;
}

interface ContentInfoGridProps {
  items: ContentInfoItem[];
}

export function ContentInfoGrid({ items }: ContentInfoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <div key={index}>
          <span className="text-gray-600">{item.label}:</span>
          <div className="mt-1 font-medium break-all">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
