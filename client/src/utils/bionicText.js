export function bionicify(text) {
  if (!text) return '';
  return text.split(' ').map(word => {
    // Preserve punctuation-only tokens
    if (/^[^a-zA-Z0-9]+$/.test(word)) return word;
    if (word.length <= 1) return `<b>${word}</b>`;
    if (word.length <= 3) return `<b>${word.slice(0, 1)}</b>${word.slice(1)}`;
    const boldLen = Math.ceil(word.length / 2);
    return `<b>${word.slice(0, boldLen)}</b>${word.slice(boldLen)}`;
  }).join(' ');
}
