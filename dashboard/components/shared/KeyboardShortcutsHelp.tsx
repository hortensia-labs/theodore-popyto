/**
 * Keyboard Shortcuts Help Modal
 * 
 * Displays all available keyboard shortcuts to users
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KEYBOARD_SHORTCUTS, getShortcutDisplay, type KeyboardShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Keyboard Shortcuts Help Modal
 */
export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Use these shortcuts for faster navigation and actions
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* URL Management */}
          <ShortcutSection
            title="URL Management"
            shortcuts={KEYBOARD_SHORTCUTS.filter(s =>
              ['onProcess', 'onIgnore', 'onArchive', 'onSelectAll'].includes(s.handler)
            )}
          />

          {/* Actions */}
          <ShortcutSection
            title="Actions"
            shortcuts={KEYBOARD_SHORTCUTS.filter(s =>
              ['onManualCreate', 'onReset'].includes(s.handler)
            )}
          />

          {/* Navigation */}
          <ShortcutSection
            title="Navigation"
            shortcuts={KEYBOARD_SHORTCUTS.filter(s =>
              ['onEscape', 'onShowHelp'].includes(s.handler)
            )}
          />
        </div>

        <div className="mt-6 pt-4 border-t text-xs text-gray-600">
          <p>
            <strong>Note:</strong> Shortcuts are disabled when typing in input fields (except Escape).
            Press <kbd className="px-2 py-1 bg-gray-100 border rounded font-mono">?</kbd> to show this help anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shortcut Section Component
 */
function ShortcutSection({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: KeyboardShortcut[];
}) {
  if (shortcuts.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
          >
            <span className="text-sm text-gray-700">{shortcut.description}</span>
            <kbd className="px-3 py-1 bg-white border border-gray-300 rounded font-mono text-sm font-semibold text-gray-900 shadow-sm">
              {getShortcutDisplay(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

