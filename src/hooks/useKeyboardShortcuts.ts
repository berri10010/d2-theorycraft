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
}

/**
 * Registers global keyboard shortcuts.
 *
 * Shortcuts are only active when the user is NOT inside a text input,
 * textarea, or contenteditable element — so typing in search boxes still works.
 */
export function useKeyboardShortcuts({
  onSearch,
  onEscape,
  onPve,
  onPvp,
  onCompare,
}: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onSearch, onEscape, onPve, onPvp, onCompare });

  useEffect(() => {
    handlersRef.current = { onSearch, onEscape, onPve, onPvp, onCompare };
  }, [onSearch, onEscape, onPve, onPvp, onCompare]);

  useEffect(() => {
    function isTyping(e: KeyboardEvent): boolean {
      const target = e.target as HTMLElement | null;
      if (!target) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping(e)) return;

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
          e.preventDefault();
          h.onCompare?.();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
