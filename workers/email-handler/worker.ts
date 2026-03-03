/**
 * Cloudflare Worker — Email Handler for StudyRAG
 *
 * ALL emails hit this Worker (catch-all). It does two things:
 * 1. Forwards personal emails to the right Gmail inbox
 * 2. POSTs the full parsed email to the Railway backend (so everything is logged)
 *
 * Flow: email → Cloudflare → This Worker → forward to Gmail + POST to api.studyrag.co
 */

import PostalMime from 'postal-mime';

export interface Env {
  WEBHOOK_URL: string;       // https://api.studyrag.co/webhooks/email
  WEBHOOK_SECRET: string;    // Shared secret for verifying requests
}

/**
 * Map of addresses to personal Gmail forwarding destinations.
 * Emails to these addresses get forwarded AND logged.
 * All others just get logged (no forwarding).
 */
const FORWARD_MAP: Record<string, string> = {
  'daniel@studyrag.co':       'danbis664@gmail.com',
  'dearie@studyrag.co':       'eburujacintha@gmail.com',
  'titilola@studyrag.co':     'awofesotitilola@gmail.com',
  'support@studyrag.co':      'contact.deusx@gmail.com',
  'admin@studyrag.co':        'contact.deusx@gmail.com',
  'billing@studyrag.co':      'contact.deusx@gmail.com',
  'security@studyrag.co':     'contact.deusx@gmail.com',
  'feedback@studyrag.co':     'contact.deusx@gmail.com',
  'partnerships@studyrag.co': 'contact.deusx@gmail.com',
};

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const { from, to, headers } = message;
    const toAddr = to.toLowerCase();

    console.log(`[EmailWorker] ${from} → ${toAddr}`);

    // 1. Forward to Gmail (runs in parallel with webhook POST)
    const forwardDest = FORWARD_MAP[toAddr];
    const forwardPromise = forwardDest
      ? message.forward(forwardDest).catch(err =>
          console.error(`[EmailWorker] Forward to ${forwardDest} failed:`, err)
        )
      : Promise.resolve();

    // 2. Parse and POST to backend (so everything is logged in DB)
    const webhookPromise = (async () => {
      try {
        const rawEmail = await streamToArrayBuffer(message.raw);
        const parser = new PostalMime();
        const parsed = await parser.parse(rawEmail);

        const payload = {
          type: 'email.received',
          data: {
            from: parsed.from?.address || from,
            from_name: parsed.from?.name || '',
            to: toAddr,
            subject: parsed.subject || '(no subject)',
            message_id: parsed.messageId || headers.get('message-id') || '',
            date: parsed.date || new Date().toISOString(),
            text: parsed.text || '',
            html: parsed.html || '',
            attachments: (parsed.attachments || []).map(att => ({
              filename: att.filename,
              mimeType: att.mimeType,
              size: typeof att.content === 'string' ? att.content.length : (att.content as ArrayBuffer)?.byteLength || 0,
            })),
            reply_to: parsed.replyTo?.[0]?.address || '',
            in_reply_to: parsed.inReplyTo || '',
            references: parsed.references || '',
            forwarded_to: forwardDest || null,
          },
        };

        const response = await fetch(env.WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': env.WEBHOOK_SECRET,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`[EmailWorker] Backend ${response.status}: ${await response.text()}`);
        }
      } catch (err) {
        console.error(`[EmailWorker] Webhook POST failed:`, err);
      }
    })();

    // Wait for both to complete
    await Promise.all([forwardPromise, webhookPromise]);
  },
};

async function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
