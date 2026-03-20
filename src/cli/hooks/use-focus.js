/**
 * useFocus Hook
 * Manages focus between list panel and detail panel in the list-detail layout.
 */
import { useState, useCallback } from 'react';

export function useFocus(initialPanel = 'list') {
  const [activePanel, setActivePanel] = useState(initialPanel);

  const focusList = useCallback(() => setActivePanel('list'), []);
  const focusDetail = useCallback(() => setActivePanel('detail'), []);

  const toggleFocus = useCallback(() => {
    setActivePanel(prev => prev === 'list' ? 'detail' : 'list');
  }, []);

  return {
    activePanel,
    isListFocused: activePanel === 'list',
    isDetailFocused: activePanel === 'detail',
    focusList,
    focusDetail,
    toggleFocus,
  };
}
