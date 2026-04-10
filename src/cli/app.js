/**
 * App Component - Root of the CLI application
 * Manages tab state, keyboard context, and renders the three-zone layout:
 * TabBar (top) | Content (center) | StatusBar (bottom)
 */
import React, { useState, useCallback } from 'react';
import { Box, Text, useStdout, useInput } from 'ink';
import { TabBar, TABS } from './components/tab-bar.js';
import { StatusBar } from './components/status-bar.js';
import { HelpOverlay } from './components/help-overlay.js';
import { useKeyboard, getGlobalShortcuts } from './hooks/use-keyboard.js';
import { cleanExit } from './lib/exit.js';

// Tab component imports — placeholder until implemented
import { NotesTab } from './components/notes-tab.js';
import { TodosTab } from './components/todos-tab.js';
import { DailyTodosTab } from './components/daily-todos-tab.js';
import { ProjectsTab } from './components/projects-tab.js';
import { SnippetsTab } from './components/snippets-tab.js';
import { RoadmapsTab } from './components/roadmaps-tab.js';
import { ToolsTab } from './components/tools-tab.js';
import { ShortcutsTab } from './components/shortcuts-tab.js';

const TAB_COMPONENTS = [
  NotesTab,
  TodosTab,
  DailyTodosTab,
  ProjectsTab,
  SnippetsTab,
  RoadmapsTab,
  ToolsTab,
  ShortcutsTab,
];

export function App() {
  const { stdout } = useStdout();
  const [activeTab, setActiveTab] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [tabShortcuts, setTabShortcuts] = useState([]);
  const [tabItemCount, setTabItemCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');

  const showFeedbackMsg = useCallback((message, type = 'success') => {
    setFeedback(message);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedback('');
      setFeedbackType('');
    }, 3000);
  }, []);

  const handleTabSwitch = useCallback((index) => {
    if (index >= 0 && index < TABS.length) {
      setActiveTab(index);
      setTabShortcuts([]);
      setTabItemCount(0);
    }
  }, []);

  const handleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const handleQuit = useCallback(() => {
    cleanExit(0);
  }, []);

  const keyboard = useKeyboard({
    onTabSwitch: handleTabSwitch,
    onHelp: handleHelp,
    onQuit: handleQuit,
    enabled: !showHelp,
  });

  // Tab/Shift+Tab cycling (handled separately from useKeyboard since it uses key object)
  useInput((input, key) => {
    if (showHelp) return;
    if (key.tab && !key.shift) {
      handleTabSwitch((activeTab + 1) % TABS.length);
    } else if (key.tab && key.shift) {
      handleTabSwitch((activeTab - 1 + TABS.length) % TABS.length);
    }
  }, { isActive: !showHelp });

  const termWidth = stdout?.columns || 120;
  const minWidth = 80;

  if (termWidth < minWidth) {
    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'red', bold: true },
        `Terminal too narrow (${termWidth} cols). Minimum: ${minWidth} columns.`
      ),
      React.createElement(Text, { dimColor: true }, 'Please resize your terminal window.'),
    );
  }

  const renderActiveTab = () => {
    const TabComponent = TAB_COMPONENTS[activeTab];
    if (!TabComponent) {
      return React.createElement(Box, { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
        React.createElement(Text, { dimColor: true }, 'Unknown tab'),
      );
    }
    return React.createElement(TabComponent, {
      isActive: !showHelp,
      keyboard,
      onShortcutsChange: setTabShortcuts,
      onItemCountChange: setTabItemCount,
      showFeedback: showFeedbackMsg,
    });
  };

  const helpShortcuts = [
    ...getGlobalShortcuts(),
    ...tabShortcuts.map(s => ({ ...s, section: TABS[activeTab]?.label })),
  ];

  return React.createElement(Box, { flexDirection: 'column', height: stdout?.rows || 24 },
    // Tab bar
    React.createElement(TabBar, { activeIndex: activeTab }),

    // Content area
    React.createElement(Box, { flexGrow: 1, flexDirection: 'column' },
      renderActiveTab(),
    ),

    // Status bar
    React.createElement(StatusBar, {
      section: TABS[activeTab]?.label || '',
      itemCount: tabItemCount,
      shortcuts: tabShortcuts.slice(0, 6),
      feedback,
      feedbackType,
    }),

    // Help overlay (rendered on top when visible)
    showHelp && React.createElement(HelpOverlay, {
      visible: true,
      shortcuts: helpShortcuts,
      onDismiss: handleHelp,
    }),
  );
}
