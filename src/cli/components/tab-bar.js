/**
 * TabBar Component
 * Renders a horizontal tab bar with 8 tabs.
 * Active tab is highlighted. Supports number key and Tab/Shift+Tab switching.
 */
import React from 'react';
import { Box, Text } from 'ink';

const TABS = [
  { label: 'Notes', key: '1' },
  { label: 'Todos', key: '2' },
  { label: 'Daily Todos', key: '3' },
  { label: 'Projects', key: '4' },
  { label: 'Snippets', key: '5' },
  { label: 'Roadmaps', key: '6' },
  { label: 'Tools', key: '7' },
  { label: 'Shortcuts', key: '8' },
];

export { TABS };

export function TabBar({ activeIndex }) {
  return (
    React.createElement(Box, { borderStyle: 'single', borderBottom: true, paddingX: 1 },
      TABS.map((tab, i) =>
        React.createElement(Box, { key: tab.key, marginRight: 1 },
          React.createElement(Text, {
            bold: i === activeIndex,
            inverse: i === activeIndex,
            color: i === activeIndex ? 'cyan' : 'white',
            dimColor: i !== activeIndex,
          }, ` ${tab.key}:${tab.label} `)
        )
      )
    )
  );
}
