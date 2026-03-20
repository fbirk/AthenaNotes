/**
 * StatusBar Component
 * Bottom bar showing current section, item count, and shortcut hints.
 */
import React from 'react';
import { Box, Text } from 'ink';

/**
 * @param {Object} props
 * @param {string} props.section - Current section name
 * @param {number} props.itemCount - Number of items in current view
 * @param {Array<{key: string, description: string}>} props.shortcuts - Context shortcuts to display
 * @param {string} props.feedback - Temporary feedback message
 * @param {string} props.feedbackType - 'success' or 'error'
 */
export function StatusBar({ section = '', itemCount = 0, shortcuts = [], feedback = '', feedbackType = '' }) {
  const contextText = shortcuts.map(s => `${s.key}:${s.description}`).join('  ');
  const shortcutText = contextText
    ? `${contextText}  ?:Help  q:Quit`
    : '?:Help  q:Quit';

  return (
    React.createElement(Box, {
      borderStyle: 'single',
      borderTop: true,
      paddingX: 1,
      justifyContent: 'space-between',
    },
      React.createElement(Box, { gap: 2 },
        React.createElement(Text, { bold: true, color: 'cyan' }, section),
        itemCount > 0 && React.createElement(Text, { dimColor: true }, `${itemCount} items`),
        feedback && React.createElement(Text, {
          color: feedbackType === 'error' ? 'red' : 'green',
          bold: true,
        }, feedback),
      ),
      React.createElement(Box, null,
        React.createElement(Text, { dimColor: true }, shortcutText),
      ),
    )
  );
}
