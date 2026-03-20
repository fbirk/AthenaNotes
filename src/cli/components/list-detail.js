/**
 * ListDetail Component
 * Reusable split-panel layout with a scrollable list (left) and detail panel (right).
 * Supports arrow key navigation, Enter to select, Escape to deselect.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

/**
 * @param {Object} props
 * @param {Array<{id: string, label: string, meta?: string, metaColor?: string, highlight?: boolean, dimmed?: boolean}>} props.items - List items
 * @param {number} props.selectedIndex - Currently highlighted index
 * @param {Function} props.onSelect - Called with index when Enter pressed
 * @param {Function} props.onHighlight - Called with index when highlight changes
 * @param {Function} props.onBack - Called when Escape pressed in detail view
 * @param {React.ReactNode} props.detail - Detail panel content (rendered on right)
 * @param {boolean} props.showDetail - Whether to show detail panel
 * @param {boolean} props.isActive - Whether this component accepts keyboard input
 * @param {string} props.emptyMessage - Message when list is empty
 * @param {number} props.listWidth - Width percentage for list panel (default: 30)
 */
export function ListDetail({
  items = [],
  selectedIndex = 0,
  onSelect,
  onHighlight,
  onBack,
  detail,
  showDetail = false,
  isActive = true,
  emptyMessage = 'No items',
  listWidth = 30,
}) {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 120;
  const termHeight = stdout?.rows || 24;
  const visibleHeight = Math.max(termHeight - 6, 5); // Account for tab bar + status bar + borders
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate fixed column width for stable sidebar
  const listCols = showDetail ? Math.floor(termWidth * listWidth / 100) : undefined;

  // Keep selected item in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, visibleHeight, scrollOffset]);

  useInput((input, key) => {
    if (!isActive || items.length === 0) return;

    if (key.upArrow) {
      const newIndex = Math.max(0, selectedIndex - 1);
      onHighlight?.(newIndex);
    } else if (key.downArrow) {
      const newIndex = Math.min(items.length - 1, selectedIndex + 1);
      onHighlight?.(newIndex);
    } else if (key.pageUp) {
      const newIndex = Math.max(0, selectedIndex - visibleHeight);
      onHighlight?.(newIndex);
    } else if (key.pageDown) {
      const newIndex = Math.min(items.length - 1, selectedIndex + visibleHeight);
      onHighlight?.(newIndex);
    } else if (key.return) {
      onSelect?.(selectedIndex);
    } else if (key.escape) {
      onBack?.();
    }
  }, { isActive });

  const visibleItems = items.slice(scrollOffset, scrollOffset + visibleHeight);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + visibleHeight < items.length;

  // Truncate a string to fit within available columns
  const maxLabelWidth = listCols ? Math.max(10, listCols - 4) : undefined; // 4 = paddingX(1*2) + prefix(2)
  const truncate = (str) => {
    if (!maxLabelWidth || str.length <= maxLabelWidth) return str;
    return str.slice(0, maxLabelWidth - 1) + '\u2026';
  };

  const listPanel = React.createElement(Box, {
    flexDirection: 'column',
    ...(listCols ? { width: listCols } : { width: '100%' }),
    borderStyle: 'single',
    borderRight: showDetail,
    paddingX: 1,
    overflow: 'hidden',
  },
    items.length === 0
      ? React.createElement(Text, { dimColor: true }, emptyMessage)
      : React.createElement(React.Fragment, null,
          showScrollUp && React.createElement(Text, { dimColor: true }, '  \u25B2 more'),
          ...visibleItems.map((item, i) => {
            const actualIndex = scrollOffset + i;
            const isSelected = actualIndex === selectedIndex;
            const prefix = isSelected ? '\u25B8 ' : '  ';
            const baseColor = item.highlight ? 'green' : (item.dimmed ? 'gray' : undefined);

            // When metaColor is set, render label and meta as separate Text elements
            if (item.meta && item.metaColor) {
              const labelPart = truncate(`${prefix}${item.label} `);
              const metaPart = item.meta;
              return React.createElement(Box, { key: item.id || actualIndex },
                React.createElement(Text, {
                  inverse: isSelected,
                  bold: isSelected,
                  color: baseColor,
                  wrap: 'truncate-end',
                }, labelPart),
                React.createElement(Text, {
                  inverse: isSelected,
                  bold: true,
                  color: item.metaColor,
                }, metaPart),
              );
            }

            const metaSuffix = item.meta ? ` ${item.meta}` : '';
            const fullLabel = `${prefix}${item.label}${metaSuffix}`;
            const displayLabel = truncate(fullLabel);
            return React.createElement(Box, { key: item.id || actualIndex },
              React.createElement(Text, {
                inverse: isSelected,
                bold: isSelected,
                color: baseColor,
                wrap: 'truncate-end',
              }, displayLabel)
            );
          }),
          showScrollDown && React.createElement(Text, { dimColor: true }, '  \u25BE more'),
          React.createElement(Text, { dimColor: true },
            `${selectedIndex + 1}/${items.length}`
          ),
        )
  );

  const detailPanel = showDetail && React.createElement(Box, {
    flexDirection: 'column',
    flexGrow: 1,
    paddingX: 1,
  }, detail || React.createElement(Text, { dimColor: true }, 'Select an item to view details'));

  return React.createElement(Box, { flexGrow: 1, flexDirection: 'row' },
    listPanel,
    detailPanel,
  );
}
