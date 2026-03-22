/**
 * Normalize an image path into a valid URI for use with Image components.
 * Adds `file://` prefix for local paths that lack a protocol.
 */
export function normalizeImageUri(imagePath: string | null): string | null {
  if (!imagePath) return null;

  if (
    imagePath.startsWith('file://') ||
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath;
  }

  return `file://${imagePath}`;
}
