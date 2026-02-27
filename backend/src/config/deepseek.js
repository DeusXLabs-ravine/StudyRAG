const OpenAI = require('openai');
const config = require('./env');

let client = null;

if (config.deepseekApiKey) {
  client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: config.deepseekApiKey,
  });
  console.log('[DeepSeek] R1 available');
} else {
  console.log('[DeepSeek] No API key, STEM queries will use Gemini');
}

function isDeepSeekAvailable() {
  return !!client;
}

async function callWithRetry(fn, retries = 2, backoff = 2000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.statusCode;
      if ((status === 429 || status === 503) && attempt < retries) {
        await new Promise(r => setTimeout(r, backoff * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function callDeepSeekR1(systemPrompt, userPrompt) {
  if (!client) throw new Error('DeepSeek client not initialized');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt || systemPrompt });

  const completion = await callWithRetry(() =>
    client.chat.completions.create({
      model: 'deepseek-reasoner',
      messages,
    })
  );

  const choice = completion.choices[0];
  return {
    reasoning: choice.message.reasoning_content || '',
    content: choice.message.content || '',
  };
}

async function callDeepSeekChat(systemPrompt, userPrompt) {
  if (!client) throw new Error('DeepSeek client not initialized');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt || systemPrompt });

  const completion = await callWithRetry(() =>
    client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
    })
  );

  return completion.choices[0].message.content || '';
}

module.exports = { isDeepSeekAvailable, callDeepSeekR1, callDeepSeekChat };
