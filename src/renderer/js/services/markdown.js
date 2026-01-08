import { marked } from 'marked';

/**
 * Markdown Service
 * Handles markdown parsing and rendering with support for internal links
 */

class MarkdownService {
  constructor() {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
    });

    // Cache for parsed markdown (LRU cache implementation will be added in Phase 11)
    this.cache = new Map();
    this.maxCacheSize = 50;
  }

  /**
   * Parse and render markdown to HTML
   * @param {string} markdown - Markdown content
   * @param {string} [noteId] - Optional note ID for caching
   * @returns {string} Rendered HTML
   */
  render(markdown, noteId = null) {
    // Check cache if noteId is provided
    if (noteId && this.cache.has(noteId)) {
      return this.cache.get(noteId);
    }

    // Process internal links before rendering
    const processedMarkdown = this.processInternalLinks(markdown);

    // Render markdown to HTML
    const html = marked.parse(processedMarkdown);

    // Sanitize HTML (basic sanitization, full DOMPurify will be added in Phase 11)
    const sanitized = this.basicSanitize(html);

    // Cache the result if noteId is provided
    if (noteId) {
      this.cacheResult(noteId, sanitized);
    }

    return sanitized;
  }

  /**
   * Process internal links in markdown [[Title]] format
   * @param {string} markdown - Markdown content
   * @returns {string} Markdown with processed internal links
   */
  processInternalLinks(markdown) {
    // Replace [[Title]] with [Title](internal://Title)
    return markdown.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      return `[${title}](internal://${encodeURIComponent(title)})`;
    });
  }

  /**
   * Basic HTML sanitization (removes script tags)
   * @param {string} html - HTML content
   * @returns {string} Sanitized HTML
   */
  basicSanitize(html) {
    // Remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
  }

  /**
   * Cache rendered HTML with LRU eviction
   * @param {string} noteId - Note ID
   * @param {string} html - Rendered HTML
   */
  cacheResult(noteId, html) {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(noteId, html);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a specific note
   * @param {string} noteId - Note ID
   */
  invalidateCache(noteId) {
    this.cache.delete(noteId);
  }

  /**
   * Extract internal links from markdown
   * @param {string} markdown - Markdown content
   * @returns {Array<string>} Array of linked note titles
   */
  extractInternalLinks(markdown) {
    const links = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = regex.exec(markdown)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Check if internal links are valid (exist in notes list)
   * @param {string} markdown - Markdown content
   * @param {Array<Object>} allNotes - Array of all notes
   * @returns {Object} { valid: Array<string>, broken: Array<string> }
   */
  validateInternalLinks(markdown, allNotes) {
    const links = this.extractInternalLinks(markdown);
    const noteTitles = allNotes.map(note => note.title);
    
    const valid = [];
    const broken = [];

    for (const link of links) {
      if (noteTitles.includes(link)) {
        valid.push(link);
      } else {
        broken.push(link);
      }
    }

    return { valid, broken };
  }
}

// Export singleton instance
export const markdownService = new MarkdownService();
