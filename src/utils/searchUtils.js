/**
 * Flatzy Admin - Advanced Case-Insensitive, Multi-Token Search Utility
 * 
 * Supports:
 * - Case-insensitivity (small, CAPITAL, TitleCase, mIxEd)
 * - Leading/trailing and extra whitespace trimming
 * - Multi-word / tokenized queries (e.g., "Rahul 2BHK" matches a card having "Rahul" and "2BHK")
 * - Safe null/undefined/number handling
 * - Clean phone number digit matching (matches "+91 93345 10195" when typing "93345")
 */

/**
 * Normalizes text for search matching:
 * Converts to string, lowercases, and trims whitespace.
 */
export const normalizeSearchText = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
};

/**
 * Checks if a target object/fields match the given search query.
 * 
 * @param {string} query - The search string typed by the user
 * @param {...any} fields - List of fields (strings, numbers, arrays, or objects) to search through
 * @returns {boolean} True if query is empty or if all tokens match within the fields
 */
export const matchesSearchQuery = (query, ...fields) => {
  if (!query || typeof query !== 'string') return true;
  
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return true;

  // Split into individual words/tokens so "rahul 2bhk" matches both tokens anywhere
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  // Build a unified normalized searchable haystack
  const pieces = [];

  const extractText = (item) => {
    if (item === null || item === undefined) return;
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      const str = String(item).toLowerCase();
      pieces.push(str);
      // If it looks like a phone number or contains digits, also push clean numeric digits
      if (/\d/.test(str)) {
        const digitsOnly = str.replace(/\D/g, '');
        if (digitsOnly.length >= 3) {
          pieces.push(digitsOnly);
        }
      }
    } else if (Array.isArray(item)) {
      item.forEach(extractText);
    } else if (typeof item === 'object') {
      Object.values(item).forEach(extractText);
    }
  };

  fields.forEach(extractText);

  const haystack = pieces.join(' ');

  // Return true only if EVERY token in the user's query exists in the haystack
  return tokens.every(token => haystack.includes(token));
};
