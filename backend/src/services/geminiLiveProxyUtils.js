'use strict';

function buildFunctionResponse(functionCall, result) {
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: { result },
  };
}

function extractServerContentEvents(serverContent) {
  if (!serverContent) return [];

  const events = [];

  if (serverContent.inputTranscription?.text) {
    events.push({ type: 'user_transcript', text: serverContent.inputTranscription.text });
  }

  if (serverContent.outputTranscription?.text) {
    events.push({ type: 'transcript', text: serverContent.outputTranscription.text });
  }

  if (serverContent.modelTurn?.parts) {
    for (const part of serverContent.modelTurn.parts) {
      if (part.inlineData?.mimeType?.startsWith('audio/')) {
        events.push({
          type: 'audio',
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }

      if (part.text) {
        events.push({ type: 'transcript', text: part.text });
      }
    }
  }

  if (serverContent.interrupted) {
    events.push({ type: 'interrupted' });
  }

  if (serverContent.turnComplete) {
    events.push({ type: 'turn_complete' });
  }

  return events;
}

module.exports = {
  buildFunctionResponse,
  extractServerContentEvents,
};
