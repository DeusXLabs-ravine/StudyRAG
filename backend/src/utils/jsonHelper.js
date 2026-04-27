/**
 * Robust JSON extraction and sanitization utilities for LLM responses.
 * Helps handle malformed JSON, extra text, and problematic character escaping.
 */

/**
 * Sanitize a raw LLM JSON string before parsing:
 * - Escape literal control characters (actual newlines/tabs) inside string values
 * - Fix invalid escape sequences (e.g. \q → \\q so the backslash is literal)
 */
function sanitizeJSONContent(str) {
  const VALID_ESCAPE = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
  let out = '';
  let inStr = false;
  let esc = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);

    if (esc) {
      esc = false;
      if (VALID_ESCAPE.has(ch)) {
        out += ch;
      } else {
        // Invalid escape sequence — make the backslash literal
        out += '\\' + ch;
      }
      continue;
    }

    if (ch === '\\' && inStr) { esc = true; out += ch; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }

    // Unescaped control character inside a JSON string — must escape it
    if (inStr && code < 0x20) {
      if      (code === 9)  out += '\\t';
      else if (code === 10) out += '\\n';
      else if (code === 13) out += '\\r';
      else if (code === 8)  out += '\\b';
      else if (code === 12) out += '\\f';
      else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Extracts a JSON object or array from a string that might contain extra text or markdown tags.
 * @param {string} text - The raw text from the LLM
 * @returns {Object|Array|null} - Parsed JSON or null if extraction fails
 */
function extractJSON(text) {
  if (!text) return null;

  // 1. Try to find content between ```json and ```
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  let jsonStr = jsonMatch ? jsonMatch[1] : text;

  // 2. If no json blocks, try regular code blocks ``` ... ```
  if (!jsonMatch) {
    const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) jsonStr = codeMatch[1];
  }

  // 3. Last resort: find first { and last }
  if (!jsonMatch && !text.includes('```')) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = text.slice(firstBrace, lastBrace + 1);
    }
  }

  // Sanitize and parse
  try {
    const sanitized = sanitizeJSONContent(jsonStr.trim());
    return JSON.parse(sanitized);
  } catch (e) {
    console.error('[jsonHelper] Failed to parse extracted JSON:', e.message);
    // If it's still failing, try one more aggressive cleanup: remove any non-JSON prefix/suffix
    try {
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const fallbackStr = jsonStr.slice(firstBrace, lastBrace + 1);
        return JSON.parse(sanitizeJSONContent(fallbackStr.trim()));
      }
    } catch (_) {}
    return null;
  }
}

/**
 * Specifically for extracting objects from a named array (e.g. "questions": [...])
 * even if the JSON is truncated or slightly malformed.
 */
function tryExtractArrayItems(text, arrayKey) {
  const sanitized = sanitizeJSONContent(text);
  
  // Try full parse first
  try {
    const full = JSON.parse(sanitized);
    if (full && full[arrayKey]) return full[arrayKey];
  } catch (_) {}

  // Partial extraction logic for truncated JSON
  const regex = new RegExp(`"${arrayKey}"\\s*:\\s*\\[`);
  const match = sanitized.match(regex);
  if (!match) return [];

  const arrayStart = sanitized.indexOf('[', match.index);
  if (arrayStart === -1) return [];

  const items = [];
  let i = arrayStart + 1;

  while (i < sanitized.length) {
    while (i < sanitized.length && /\s/.test(sanitized[i])) i++;
    if (i >= sanitized.length || sanitized[i] === ']') break;
    if (sanitized[i] !== '{') break;

    let depth = 0;
    let inString = false;
    let escaped = false;
    const objStart = i;

    for (; i < sanitized.length; i++) {
      const ch = sanitized[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { items.push(JSON.parse(sanitized.slice(objStart, i + 1))); } catch (_) {}
          i++;
          break;
        }
      }
    }
    if (depth !== 0) break;
    while (i < sanitized.length && /[\s,]/.test(sanitized[i])) i++;
  }

  return items;
}

module.exports = { sanitizeJSONContent, extractJSON, tryExtractArrayItems };
