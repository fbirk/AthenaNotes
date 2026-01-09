const INVALID_TITLE_CHARACTERS = /[/\\:*?"<>|]/;

export function isValidTitle(title) {
  return typeof title === 'string' && title.trim().length > 0 && !INVALID_TITLE_CHARACTERS.test(title);
}

export function isAbsolutePath(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[a-zA-Z]:\\/.test(value) || value.startsWith('\\\\');
}
