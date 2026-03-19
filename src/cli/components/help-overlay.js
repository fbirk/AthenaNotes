import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * HelpOverlay Component
 * Renders keyboard shortcuts grouped by section, dismissible with ? or Escape.
 */
export function HelpOverlay({ visible, shortcuts = [], onDismiss }) {
  useInput((input, key) => {
    if (!visible) return;
    if (input === '?' || key.escape) {
      onDismiss?.();
    }
  });

  if (!visible) return null;

  // Group shortcuts by section
  const grouped = {};
  for (const shortcut of shortcuts) {
    const section = shortcut.section || 'General';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(shortcut);
  }

  const sectionNames = Object.keys(grouped);

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: 'cyan',
    paddingX: 2,
    paddingY: 1,
  },
    React.createElement(Box, { justifyContent: 'center', marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'Keyboard Shortcuts'),
    ),
    ...sectionNames.map(section =>
      React.createElement(Box, { key: section, flexDirection: 'column', marginBottom: 1 },
        sectionNames.length > 1 && React.createElement(Text, { bold: true, underline: true, color: 'yellow' }, section),
        ...grouped[section].map(s =>
          React.createElement(Box, { key: s.key, gap: 1 },
            React.createElement(Box, { width: 16 },
              React.createElement(Text, { bold: true, color: 'green' }, s.key),
            ),
            React.createElement(Text, null, s.description),
          )
        ),
      )
    ),
    React.createElement(Box, { justifyContent: 'center', marginTop: 1 },
      React.createElement(Text, { dimColor: true }, 'Press ? or Esc to close'),
    ),
  );
}
