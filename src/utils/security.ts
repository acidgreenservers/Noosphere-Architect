/**
 * Sanitizes a string for use as a filename.
 * Removes characters that could be used for path traversal or are invalid in filenames.
 * Enforces a maximum length to prevent DoS via long filenames and ensures basic sanity.
 */
export const sanitizeFilename = (name: string, fallback: string = 'file'): string => {
  if (!name || typeof name !== 'string') return fallback;

  return name
    .trim()
    .replace(/[^a-z0-9\s._-]/gi, '') // Whitelist alphanumeric, spaces, dots, underscores, and hyphens
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/\.+/g, '.')            // Consolidate multiple dots
    .replace(/^-+|-+$/g, '')         // Trim hyphens from start/end
    .substring(0, 100)               // Enforce length limit
    .toLowerCase() || fallback;
};
