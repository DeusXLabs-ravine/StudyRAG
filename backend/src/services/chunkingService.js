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

/**
 * Prepare document text for LLM processing by intelligently truncating large documents.
 * Preserves document structure (headings, intro, conclusion) while staying under token limits.
 * @param {string} text - Full document text
 * @param {number} maxChars - Maximum characters to send to the LLM (default 50000 ≈ 16K tokens)
 */
function prepareTextForLLM(text, maxChars = 50000) {
  if (text.length <= maxChars) return text;

  const sections = splitBySections(text);

  // Always keep the first section (intro) and last section (conclusion) in full
  const first = sections[0];
  const last = sections.length > 1 ? sections[sections.length - 1] : null;

  // Build a table of contents from all headings
  const toc = sections
    .filter(s => s.heading)
    .map(s => `- ${s.heading}`)
    .join('\n');

  // Reserve space for structure
  const tocSection = toc ? `\n\n[Document Structure]\n${toc}\n\n` : '';
  const reservedChars = first.text.length + (last ? last.text.length : 0) + tocSection.length + 200;
  const remainingBudget = maxChars - reservedChars;

  // Distribute remaining budget evenly across middle sections
  const middleSections = sections.slice(1, last ? -1 : undefined);
  let result = '';

  if (middleSections.length > 0 && remainingBudget > 0) {
    const perSection = Math.floor(remainingBudget / middleSections.length);
    const sampledMiddle = middleSections.map(s => {
      const heading = s.heading ? `\n\n### ${s.heading}\n\n` : '\n\n';
      const content = s.text.length <= perSection
        ? s.text
        : s.text.slice(0, perSection) + '\n[...section truncated...]';
      return heading + content;
    }).join('');

    result = first.text + tocSection + sampledMiddle;
  } else {
    result = first.text + tocSection;
  }

  if (last) {
    result += '\n\n' + (last.heading ? `### ${last.heading}\n\n` : '') + last.text;
  }

  // Final safety trim
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + '\n[...document truncated for processing...]';
  }

  return result;
}

module.exports = { chunkText, prepareTextForLLM };
