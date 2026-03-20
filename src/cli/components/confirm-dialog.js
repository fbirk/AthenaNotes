import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * ConfirmDialog Component
 * Destructive action confirmation overlay with y/n input.
 */
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onConfirm?.();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel?.();
    }
  });

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: 'yellow',
    paddingX: 2,
    paddingY: 1,
    alignItems: 'center',
  },
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'yellow' }, 'Confirm'),
    ),
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, null, message),
    ),
    React.createElement(Box, { gap: 1 },
      React.createElement(Text, { bold: true, color: 'green' }, 'y'),
      React.createElement(Text, { dimColor: true }, ' / '),
      React.createElement(Text, { bold: true, color: 'red' }, 'n'),
    ),
  );
}
