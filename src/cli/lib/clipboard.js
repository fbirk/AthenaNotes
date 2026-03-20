import clipboardy from 'clipboardy';

/**
 * Copy text to system clipboard
 * @param {string} text
 * @returns {Promise<boolean>} true if successful
 */
export async function copyToClipboard(text) {
  try {
    await clipboardy.write(text);
    return true;
  } catch {
    return false;
  }
}
