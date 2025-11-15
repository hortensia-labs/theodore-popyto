/**
 * Keyboard Shortcuts Hook
 * 
 * Provides keyboard shortcuts for power users:
 * - p: Process selected URLs
 * - i: Ignore selected URLs
 * - m: Manual create
 * - r: Reset processing state
 * - a: Archive selected URLs
 * - Escape: Close modals/clear selection
 * - ?: Show shortcuts help
 * - Cmd/Ctrl + A: Select all
 * 
 * Prevents conflicts with browser/system shortcuts
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutHandlers {
  onProcess?: () => void;
  onIgnore?: () => void;
  onArchive?: () => void;
  onManualCreate?: () => void;
  onReset?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  handler: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
}

/**
 * Available keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'p',
    description: 'Process selected URLs',
    handler: 'onProcess',
  },
  {
    key: 'i',
    description: 'Ignore selected URLs',
    handler: 'onIgnore',
  },
  {
    key: 'a',
    description: 'Archive selected URLs',
    handler: 'onArchive',
  },
  {
    key: 'm',
    description: 'Create manual Zotero item',
    handler: 'onManualCreate',
  },
  {
    key: 'r',
    description: 'Reset processing state',
    handler: 'onReset',
  },
  {
    key: 'Escape',
    description: 'Close modal / Clear selection',
    handler: 'onEscape',
  },
  {
    key: 'a',
    description: 'Select all',
    handler: 'onSelectAll',
    modifiers: ['meta'], // Cmd on Mac, Ctrl on Windows
  },
  {
    key: '?',
    description: 'Show keyboard shortcuts help',
    handler: 'onShowHelp',
  },
];

/**
 * Keyboard Shortcuts Hook
 * 
 * Registers global keyboard shortcuts with handler callbacks
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled: boolean = true) {
  /**
   * Handle keyboard event
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if user is typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Exception: Escape key always works
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Check for modifier keys
    const hasCtrl = event.ctrlKey || event.metaKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;

    // Process key
    switch (event.key.toLowerCase()) {
      case 'p':
        if (!hasCtrl && !hasShift && !hasAlt) {
          event.preventDefault();
          handlers.onProcess?.();
        }
        break;

      case 'i':
        if (!hasCtrl && !hasShift && !hasAlt) {
          event.preventDefault();
          handlers.onIgnore?.();
        }
        break;

      case 'a':
        if (hasCtrl && !hasShift && !hasAlt) {
          // Cmd/Ctrl + A: Select all
          event.preventDefault();
          handlers.onSelectAll?.();
        } else if (!hasCtrl && !hasShift && !hasAlt) {
          // Just 'a': Archive
          event.preventDefault();
          handlers.onArchive?.();
        }
        break;

      case 'm':
        if (!hasCtrl && !hasShift && !hasAlt) {
          event.preventDefault();
          handlers.onManualCreate?.();
        }
        break;

      case 'r':
        if (!hasCtrl && !hasShift && !hasAlt) {
          event.preventDefault();
          handlers.onReset?.();
        }
        break;

      case 'escape':
        event.preventDefault();
        handlers.onEscape?.();
        break;

      case '?':
        if (hasShift) {
          event.preventDefault();
          handlers.onShowHelp?.();
        }
        break;
    }
  }, [handlers]);

  /**
   * Register and cleanup event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: KEYBOARD_SHORTCUTS,
  };
}

/**
 * Get keyboard shortcut display string
 * e.g., "⌘A" on Mac, "Ctrl+A" on Windows
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  let display = '';
  
  if (shortcut.modifiers) {
    shortcut.modifiers.forEach(mod => {
      if (mod === 'meta') {
        display += isMac ? '⌘' : 'Ctrl+';
      } else if (mod === 'ctrl') {
        display += 'Ctrl+';
      } else if (mod === 'shift') {
        display += '⇧';
      } else if (mod === 'alt') {
        display += isMac ? '⌥' : 'Alt+';
      }
    });
  }
  
  display += shortcut.key.toUpperCase();
  
  return display;
}

