/**
 * useKeyboard Hook
 * Manages a layered keyboard shortcut system:
 * - Global layer: always active (tab switching, help, quit)
 * - Contextual layer: registered/unregistered by active tab components
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useInput } from 'ink';

/**
 * @param {Object} options
 * @param {Function} options.onTabSwitch - Called with tab index when a number key is pressed
 * @param {Function} options.onHelp - Called when ? pressed
 * @param {Function} options.onQuit - Called when Ctrl+Q pressed
 * @param {boolean} options.enabled - Whether keyboard input is enabled (default: true)
 * @param {number} options.tabCount - Number of tabs reachable via number keys (default: 9)
 */
export function useKeyboard({ onTabSwitch, onHelp, onQuit, enabled = true, tabCount = 9 }) {
  const contextHandlersRef = useRef(new Map());
  const [inputMode, setInputMode] = useState(null); // null = normal, 'text' = text input active

  const registerContext = useCallback((id, handler) => {
    contextHandlersRef.current.set(id, handler);
  }, []);

  const unregisterContext = useCallback((id) => {
    contextHandlersRef.current.delete(id);
  }, []);

  useInput((input, key) => {
    if (!enabled) return;

    // Global: Ctrl+Q or Ctrl+C to quit (always works, even during text input)
    if ((input === 'q' || input === 'c') && key.ctrl) {
      if (onQuit) {
        onQuit();
      } else {
        process.exit(0);
      }
      return;
    }

    // When in text input mode, don't intercept normal characters
    if (inputMode === 'text') {
      if (key.escape) {
        setInputMode(null);
      }
      return;
    }

    // Global: q to quit
    if (input === 'q') {
      onQuit?.();
      return;
    }

    // Global: ? for help
    if (input === '?') {
      onHelp?.();
      return;
    }

    // Global: number keys 1-9 for tab switching (bounded by the number of tabs)
    const maxNumberKey = Math.min(tabCount, 9);
    const num = parseInt(input, 10);
    if (num >= 1 && num <= maxNumberKey && !key.ctrl && !key.meta) {
      onTabSwitch?.(num - 1);
      return;
    }

    // Pass to contextual handlers (last registered has priority)
    const handlers = Array.from(contextHandlersRef.current.values());
    for (let i = handlers.length - 1; i >= 0; i--) {
      const handled = handlers[i](input, key);
      if (handled) return;
    }
  }, { isActive: enabled });

  return {
    registerContext,
    unregisterContext,
    setInputMode,
    inputMode,
  };
}

/**
 * Get the list of global keyboard shortcuts for display
 * @param {number} tabCount - Number of tabs reachable via number keys (default: 8)
 */
export function getGlobalShortcuts(tabCount = 8) {
  const maxNumberKey = Math.min(tabCount, 9);
  return [
    { key: `1-${maxNumberKey}`, description: 'Switch tab', section: 'Global' },
    { key: 'Tab', description: 'Next tab', section: 'Global' },
    { key: 'Shift+Tab', description: 'Previous tab', section: 'Global' },
    { key: '?', description: 'Toggle help', section: 'Global' },
    { key: 'q', description: 'Quit', section: 'Global' },
    { key: 'Ctrl+C', description: 'Quit (always)', section: 'Global' },
  ];
}
