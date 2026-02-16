const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const sections = splitBySections(text);

  const chunks = [];
  for (const section of sections) {
    if (section.text.length <= chunkSize) {
      chunks.push({
        text: section.text.trim(),
        heading: section.heading,
      });
    } else {
      const subChunks = splitByParagraphs(section.text, chunkSize, overlap);
      subChunks.forEach((chunk, i) => {
        chunks.push({
          text: chunk.trim(),
          heading: section.heading ? `${section.heading} (Part ${i + 1})` : null,
        });
      });
    }
  }

  return chunks.filter(c => c.text.length > 50);
}

function splitBySections(text) {
  const headingRegex = /^(#{1,6}\s+.+|[A-Z][A-Z\s]{2,}[A-Z]$)/gm;
  const sections = [];
  let lastIndex = 0;
  let lastHeading = null;
  let match;

  while ((match = headingRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      sections.push({
        heading: lastHeading,
        text: text.slice(lastIndex, match.index),
      });
    }
    lastHeading = match[1].replace(/^#+\s*/, '').trim();
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    sections.push({
      heading: lastHeading,
      text: text.slice(lastIndex),
    });
  }

  if (sections.length === 0) {
    sections.push({ heading: null, text });
  }

  return sections;
}

function splitByParagraphs(text, maxSize, overlap) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxSize && current.length > 0) {
      chunks.push(current);
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(' ') + '\n\n' + para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim()) {
    chunks.push(current);
  }

  return chunks;
}

module.exports = { chunkText };
