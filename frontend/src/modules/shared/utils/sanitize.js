// Utility for sanitizing text inputs according to allowed character policy.
// Allowed: alphanumeric (A-Z a-z 0-9), space, hyphen, and selected European diacritics.
// Diacritics covered: Polish, German, French, Spanish, Nordic essentials.
// This can be extended later; keep list explicit for predictability.

// Allowed characters regex (inverse match is easier for stripping)
// Base pattern includes: letters (A-Z a-z), digits, space, hyphen, and selected diacritics.
export const EURO_ALNUM_PATTERN = /[^A-Za-z0-9 \-ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄßéèêëÉÈÊËáàâãÁÀÂÃåÅçÇíìîïÍÌÎÏúùûÚÙÛñÑýÝÿŸøØœŒÆæ]/g;

// Username pattern extends allowed set with @.+_ characters (keeps diacritics for consistency)
export const USERNAME_PATTERN = /[^A-Za-z0-9@.+_\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄßéèêëÉÈÊËáàâãÁÀÂÃåÅçÇíìîïÍÌÎÏúùûÚÙÛñÑýÝÿŸøØœŒÆæ]/g;

// Email pattern: conservative – allow common email chars; strip spaces and other symbols
export const EMAIL_PATTERN = /[^A-Za-z0-9@._+\-]/g;

// Description pattern: allow broader punctuation and newlines; remove disallowed characters
export const DESCRIPTION_PATTERN = /[^A-Za-z0-9 \n\-.,!?:;'"()\/ąćęłńóśźżĄĆĘŁŃÓŚŹŻüöäÜÖÄßéèêëÉÈÊËáàâãÁÀÂÃåÅçÇíìîïÍÌÎÏúùûÚÙÛñÑýÝÿŸøØœŒÆæ]/g;

// Control characters (except TAB, LF, CR) for chat messages
export const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function sanitizeProjectName(raw) {
  return sanitizeWithPolicy(raw, { maxLength: 50, pattern: EURO_ALNUM_PATTERN });
}

// Generic sanitizer usable by different inputs with distinct limits/patterns.
export function sanitizeWithPolicy(raw, { maxLength = 100, pattern = EURO_ALNUM_PATTERN, collapseSpaces = true } = {}) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.normalize('NFC').replace(pattern, '');
  if (collapseSpaces) cleaned = cleaned.replace(/\s+/g, ' ');
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

// Specialized helpers for clarity and reuse
export function sanitizeUsername(raw) {
  return sanitizeWithPolicy(raw, { maxLength: 150, pattern: USERNAME_PATTERN });
}

export function sanitizeEmail(raw) {
  // emails: no collapsing internal spaces (they should be removed entirely)
  if (typeof raw !== 'string') return '';
  let cleaned = raw.normalize('NFC').replace(/\s+/g, '').replace(EMAIL_PATTERN, '');
  return cleaned.slice(0, 254); // typical email length cap
}

export function sanitizeDescription(raw, maxLength = 1000) {
  return sanitizeWithPolicy(raw, { maxLength, pattern: DESCRIPTION_PATTERN, collapseSpaces: false });
}

export function sanitizeChatMessage(raw, maxLength = 1000) {
  // Only strip control chars; keep punctuation, emojis, diacritics
  if (typeof raw !== 'string') return '';
  let cleaned = raw.normalize('NFC').replace(CONTROL_CHARS_PATTERN, '');
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

export function sanitizePassword(raw, maxLength = 128) {
  // Do not alter character set; optional trim for leading/trailing spaces
  if (typeof raw !== 'string') return '';
  let cleaned = raw.normalize('NFC').trim();
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
  return cleaned;
}

// Slug sanitizer (frontend aligned with backend custom_slugify). Converts diacritics, strips invalid chars, collapses hyphens.
const SLUG_MAP = {
  "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z",
  "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z",
  "ü": "u", "ö": "o", "ä": "a", "ß": "ss", "ẞ": "ss", "é": "e", "è": "e", "ê": "e", "ë": "e",
  "á": "a", "à": "a", "â": "a", "ã": "a", "å": "a", "ç": "c", "í": "i", "ì": "i", "î": "i", "ï": "i",
  "ú": "u", "ù": "u", "û": "u", "ñ": "n", "ý": "y", "ÿ": "y"
};

export function sanitizeSlug(raw, { fallback = 'organization', maxLength = 100 } = {}) {
  if (typeof raw !== 'string') return fallback;
  // Map characters explicitly then decompose remaining diacritics.
  let mapped = raw.split('').map(c => SLUG_MAP[c] || c).join('');
  mapped = mapped.normalize('NFKD').replace(/[\u0300-\u036F]/g, '');
  mapped = mapped.toLowerCase();
  // Replace invalid characters with hyphen boundaries.
  mapped = mapped.replace(/[^a-z0-9\s-]/g, '');
  // Collapse whitespace to single hyphen.
  mapped = mapped.replace(/\s+/g, '-');
  // Collapse multiple hyphens.
  mapped = mapped.replace(/-+/g, '-');
  // Trim leading/trailing hyphens.
  mapped = mapped.replace(/^-+|-+$/g, '');
  if (!mapped) mapped = fallback;
  if (mapped.length > maxLength) mapped = mapped.slice(0, maxLength);
  return mapped;
}

