/**
 * ANSI key escape sequences for terminal input.
 * Used as a convenience reference alongside @microsoft/tui-test's Key enum.
 */
export const KEYS = {
  ENTER: '\r',
  ESCAPE: '\x1b',
  TAB: '\t',
  SHIFT_TAB: '\x1b[Z',
  UP: '\x1b[A',
  DOWN: '\x1b[B',
  LEFT: '\x1b[D',
  RIGHT: '\x1b[C',
  SPACE: ' ',
  CTRL_C: '\x03',
  CTRL_Q: '\x11',
};
