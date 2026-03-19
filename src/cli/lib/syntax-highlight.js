import { highlight } from 'cli-highlight';

/**
 * Highlight code with syntax coloring for terminal output
 * @param {string} code - The code to highlight
 * @param {string} language - Programming language (e.g., 'javascript', 'python')
 * @returns {string} ANSI-colored code string
 */
export function highlightCode(code, language = '') {
  try {
    return highlight(code, { language: language || undefined, ignoreIllegals: true });
  } catch {
    return code; // Return plain code if highlighting fails
  }
}
