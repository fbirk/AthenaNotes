import React from 'react';
import { Box, Text } from 'ink';
import { renderMarkdown } from '../lib/terminal-markdown.js';

/**
 * MarkdownPreview Component
 * Renders markdown content as terminal-formatted ANSI text.
 */
export function MarkdownPreview({ markdown }) {
  if (!markdown || !markdown.trim()) {
    return React.createElement(Box, { paddingX: 1, paddingY: 1 },
      React.createElement(Text, { dimColor: true }, 'No content'),
    );
  }

  const rendered = renderMarkdown(markdown);

  return React.createElement(Box, { paddingX: 1, paddingY: 1, flexDirection: 'column' },
    React.createElement(Text, null, rendered),
  );
}
