import { Transform } from 'class-transformer';

/**
 * Strips HTML tags and entities from a string, then trims whitespace.
 * Apply to any free-text field that must never contain markup.
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/<[^>]*>/g, '')          // strip HTML tags
      .replace(/&[a-zA-Z#0-9]+;/g, '')  // strip HTML entities (&lt; &amp; &#x27; etc.)
      .trim();
  });
}
