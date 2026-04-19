/**
 * OCR controller — extracts text from a captured image and registers the result
 * as a note-source document so it shows up in the user's library.
 *
 * The OCR engine itself is stubbed right now. To wire a real provider:
 *   1. Pick one (Google Cloud Vision, AWS Textract, Tesseract.js, Azure AI Vision).
 *   2. Set the relevant API key env var (e.g. GOOGLE_VISION_API_KEY).
 *   3. Implement `runOcr(buffer, mimeType)` below to return { text, title? }.
 *
 * Request: multipart/form-data with field `image` (single file, <15MB).
 * Response: 201 { document: { id, title, source_type: 'note' }, text }
 */

const { registerNote } = require('./documentController');

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function runOcr(buffer, mimeType) {
  // TODO: Replace this stub with a real OCR call.
  //
  // Example (Google Cloud Vision via REST — don't need the SDK):
  //
  //   const key = process.env.GOOGLE_VISION_API_KEY;
  //   const res = await fetch(
  //     `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
  //     {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         requests: [{
  //           image: { content: buffer.toString('base64') },
  //           features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
  //         }],
  //       }),
  //     },
  //   );
  //   const json = await res.json();
  //   const text = json.responses?.[0]?.fullTextAnnotation?.text || '';
  //   return { text };

  const sniff = buffer.slice(0, 16).toString('hex');
  return {
    text: [
      `[OCR placeholder — no provider configured]`,
      ``,
      `Captured ${buffer.length} bytes of ${mimeType || 'image/*'} (sig ${sniff}).`,
      ``,
      `To enable real OCR, implement runOcr() in backend/src/controllers/ocrController.js`,
      `with your provider of choice (Google Vision, AWS Textract, or Tesseract).`,
    ].join('\n'),
  };
}

async function ocrScan(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'Missing image file.' } });
    }
    if (req.file.size > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: { message: 'Image too large. Max 15MB.' } });
    }

    const { text, title: titleFromProvider } = await runOcr(req.file.buffer, req.file.mimetype);

    if (!text || !text.trim()) {
      return res.status(422).json({
        error: { message: "We couldn't read any text from that image. Try a clearer photo or better lighting." },
      });
    }

    const date = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const title = titleFromProvider || `Scanned note — ${date}`;

    // Fan this into the existing note-registration pipeline so it picks up
    // chunking, embedding, module generation, and UI handling for free.
    req.body = { ...(req.body || {}), title, content: text };
    return registerNote(req, res, next);
  } catch (err) {
    return next(err);
  }
}

module.exports = { ocrScan };
