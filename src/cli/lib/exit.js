/**
 * Clean exit utility.
 * Provides a centralized way to cleanly exit the CLI application.
 * The Ink instance is registered at startup so it can be unmounted before exit.
 */
let inkInstance = null;

/**
 * Register the Ink render instance for cleanup on exit.
 * @param {Object} instance - The object returned by Ink's render()
 */
export function setInkInstance(instance) {
  inkInstance = instance;
}

/**
 * Unmount the Ink UI and terminate the process.
 * @param {number} code - Exit code (default: 0)
 */
export function cleanExit(code = 0) {
  if (inkInstance) {
    inkInstance.unmount();
  }
  process.exit(code);
}
