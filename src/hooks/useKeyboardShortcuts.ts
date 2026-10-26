import { useEffect, useRef } from 'react';

interface UseKeyboardShortcutsOptions {
  /** Callback when "/" is pressed — typically focus the search input */
  onSearch?: () => void;
  /** Callback when Escape is pressed — typically clear search or close sidebar */
  onEscape?: () => void;
  /** Callback when "1" is pressed — typically switch to PvE mode */
  onPve?: () => void;
  /** Callback when "2" is pressed — typically switch to PvP mode */
  onPvp?: () => void;
  /** Callback when "c" is pressed — typically open comparison view */
  onCompare?: () => void;
  /** Callback when "?" is pressed — show keyboard shortcut legend */
  onShortcutLegend?: () => void;
}

/** True when keys typed at this element belong to it (text fields, selects' type-ahead, contenteditable). */
export function isTypingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return !!target.isContentEditable;
}

/**
 * Registers global keyboard shortcuts.
 *
 * Shortcuts are only active when the user is NOT inside a text input,
 * textarea, select, or contenteditable element — so typing in search boxes still works.
 */
export function useKeyboardShortcuts({
  onSearch,
  onEscape,
  onPve,
  onPvp,
  onCompare,
  onShortcutLegend,
}: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onSearch, onEscape, onPve, onPvp, onCompare, onShortcutLegend });

  useEffect(() => {
    handlersRef.current = { onSearch, onEscape, onPve, onPvp, onCompare, onShortcutLegend };
  }, [onSearch, onEscape, onPve, onPvp, onCompare, onShortcutLegend]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target as HTMLElement | null)) return;

      // Never intercept when any OS/browser modifier is held.
      // This preserves Ctrl+C (copy), Ctrl+V (paste), Ctrl+Z (undo),
      // Cmd+* (macOS), Alt+* (AltGr / menu shortcuts), etc.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const h = handlersRef.current;

      switch (e.key) {
        case '/':
          e.preventDefault();
          h.onSearch?.();
          break;
        case 'Escape':
          e.preventDefault();
          h.onEscape?.();
          break;
        case '1':
          e.preventDefault();
          h.onPve?.();
          break;
        case '2':
          e.preventDefault();
          h.onPvp?.();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          h.onCompare?.();
          break;
        case '?':
          e.preventDefault();
          h.onShortcutLegend?.();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
