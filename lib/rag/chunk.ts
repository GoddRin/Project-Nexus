/**
 * Chunks a given text string into sections of ~chunkSize words with an overlap of ~overlap words.
 * Relies on word boundaries (whitespace splitting) for safety and portability.
 */
export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  if (!text || !text.trim()) return [];

  const words = text.trim().split(/\s+/);
  if (words.length <= chunkSize) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(" "));
    }
    
    // Move window forward by (chunkSize - overlap)
    i += chunkSize - overlap;
    
    // Prevent infinite loop if overlap >= chunkSize
    if (chunkSize <= overlap) {
      break;
    }
  }

  return chunks;
}
