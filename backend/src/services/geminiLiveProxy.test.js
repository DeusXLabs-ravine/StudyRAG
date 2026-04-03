const assert = require('node:assert/strict');

const {
  buildFunctionResponse,
  extractServerContentEvents,
} = require('./geminiLiveProxyUtils');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('buildFunctionResponse wraps values inside response.result', () => {
  const response = buildFunctionResponse(
    { id: 'call-1', name: 'search_external_knowledge' },
    { summary: 'Photosynthesis converts light into chemical energy.' },
  );

  assert.deepEqual(response, {
    id: 'call-1',
    name: 'search_external_knowledge',
    response: {
      result: {
        summary: 'Photosynthesis converts light into chemical energy.',
      },
    },
  });
});

runTest('extractServerContentEvents emits Gemini spoken transcript from outputTranscription', () => {
  const events = extractServerContentEvents({
    outputTranscription: { text: 'Let us walk through it step by step.' },
    modelTurn: {
      parts: [
        {
          inlineData: {
            data: 'base64-audio',
            mimeType: 'audio/pcm;rate=24000',
          },
        },
      ],
    },
    turnComplete: true,
  });

  assert.deepEqual(events, [
    { type: 'transcript', text: 'Let us walk through it step by step.' },
    { type: 'audio', data: 'base64-audio', mimeType: 'audio/pcm;rate=24000' },
    { type: 'turn_complete' },
  ]);
});
