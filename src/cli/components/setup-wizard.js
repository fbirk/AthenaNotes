import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { access } from 'node:fs/promises';

/**
 * SetupWizard Component
 * First-run storage path selection with validation.
 */
export function SetupWizard({ onComplete }) {
  const [inputPath, setInputPath] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const handleSubmit = async (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a storage folder path.');
      return;
    }

    setError('');
    setValidating(true);

    try {
      await access(trimmed);
      onComplete?.(trimmed);
    } catch {
      setError(`Path does not exist or is not accessible: ${trimmed}`);
      setValidating(false);
    }
  };

  return React.createElement(Box, { flexDirection: 'column', paddingX: 2, paddingY: 1 },
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'Welcome to KnowledgeBase CLI'),
    ),
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, null,
        'Please enter the path to your storage folder. This is where your notes, todos, snippets, and other data will be stored.',
      ),
    ),
    React.createElement(Box, null,
      React.createElement(Text, { bold: true }, 'Storage folder: '),
      React.createElement(TextInput, {
        value: inputPath,
        onChange: setInputPath,
        onSubmit: handleSubmit,
        placeholder: 'Enter folder path...',
      }),
    ),
    validating && React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: 'yellow' }, 'Validating path...'),
    ),
    error && React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: 'red' }, error),
    ),
  );
}
