/**
 * Calculates the Levenshtein distance between two strings.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp.push([i]);
  }
  for (j = 1; j <= b.length; j++) {
    tmp[0].push(j);
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Checks if query matches text with space insensitivity and typo tolerance.
 */
export function isFuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const cleanText = text.toLowerCase().trim();
  const cleanQuery = query.toLowerCase().trim();

  // 1. Direct substring check
  if (cleanText.includes(cleanQuery)) return true;

  // 2. Space-insensitive check (ignores spaces/gaps)
  // e.g. "kozhi kode" matches "kozhikode"
  const normText = cleanText.replace(/\s+/g, '');
  const normQuery = cleanQuery.replace(/\s+/g, '');
  if (normText.includes(normQuery)) return true;

  // 3. Typo tolerance check
  const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
  const textWords = cleanText.split(/\s+/).filter(Boolean);

  // For very short queries (less than 3 chars), we require prefix match
  if (cleanQuery.length < 3) {
    return textWords.some(word => word.startsWith(cleanQuery));
  }

  // All query words must match at least one text word with some tolerance
  return queryWords.every(qWord => {
    return textWords.some(tWord => {
      // Direct prefix check
      if (tWord.startsWith(qWord) || qWord.startsWith(tWord)) return true;

      // Allow 1 typo for short words (length 3-5), 2 typos for longer words
      const maxDistance = qWord.length <= 5 ? 1 : 2;
      
      // Calculate distance between the query word and prefix of the text word of similar length
      const tPrefix = tWord.slice(0, qWord.length);
      const dist = getLevenshteinDistance(qWord, tPrefix);
      if (dist <= maxDistance) return true;

      // Also check full word distance
      const fullDist = getLevenshteinDistance(qWord, tWord);
      if (fullDist <= maxDistance) return true;

      return false;
    });
  });
}
