import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { highlight } from 'cli-highlight';

marked.setOptions({
  renderer: new TerminalRenderer({
    code(code, language) {
      try {
        return highlight(code, { language: language || 'auto', ignoreIllegals: true });
      } catch {
        return code;
      }
    },
    codespan(text) {
      return `\x1b[36m\`${text}\`\x1b[0m`;
    },
    heading(text, level) {
      const prefix = '#'.repeat(level);
      return `\x1b[1m\x1b[34m${prefix} ${text}\x1b[0m\n`;
    },
    list(body) {
      return body;
    },
    listitem(text) {
      return `  \u2022 ${text}\n`;
    },
    strong(text) {
      return `\x1b[1m${text}\x1b[0m`;
    },
    em(text) {
      return `\x1b[3m${text}\x1b[0m`;
    },
    link(href, title, text) {
      const label = text || title || href;
      return `\x1b[4m${label}\x1b[0m (${href})`;
    },
    image(href, title, alt) {
      return `[Image: ${alt || title || 'image'}]`;
    },
    html(html) {
      return '[HTML content]';
    },
  }),
});

/**
 * Renders a markdown string to ANSI-formatted terminal text.
 * @param {string} markdownString - The markdown content to render.
 * @returns {string} ANSI-formatted terminal text.
 */
export function renderMarkdown(markdownString) {
  if (!markdownString) {
    return '';
  }
  return marked.parse(markdownString);
}
