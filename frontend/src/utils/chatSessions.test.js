import assert from 'node:assert/strict';

import {
  appendMessageToChatSession,
  createChatSession,
  hydrateChatSessions,
  replaceMessageInChatSession,
  resolveActiveChatSessionId,
} from './chatSessions.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('hydrateChatSessions imports legacy history into a selectable session', () => {
  const sessions = hydrateChatSessions({
    legacyHistory: [
      {
        id: 'turn-1',
        query: 'Explain mitosis',
        answer: 'Mitosis is the process of cell division.',
        documentId: 'doc-1',
        timestamp: '2026-04-01T10:00:00.000Z',
      },
      {
        id: 'turn-2',
        query: 'Give me a quick quiz',
        answer: 'Sure, here is a short quiz.',
        documentId: 'doc-1',
        timestamp: '2026-04-01T10:05:00.000Z',
      },
    ],
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].title, 'Explain mitosis');
  assert.equal(sessions[0].documentId, 'doc-1');
  assert.deepEqual(
    sessions[0].messages.map(message => message.role),
    ['student', 'tutor', 'student', 'tutor'],
  );
});

runTest('appendMessageToChatSession updates session title and activity time', () => {
  const session = createChatSession({
    id: 'session-1',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    messages: [],
  });

  const nextSession = appendMessageToChatSession(session, {
    role: 'student',
    text: 'Summarize cellular respiration',
    timestamp: '2026-04-01T10:02:00.000Z',
  });

  assert.equal(nextSession.title, 'Summarize cellular respiration');
  assert.equal(nextSession.updatedAt, '2026-04-01T10:02:00.000Z');
  assert.equal(nextSession.messages.length, 1);
});

runTest('replaceMessageInChatSession patches a streaming tutor reply in place', () => {
  const session = createChatSession({
    id: 'session-1',
    messages: [
      { role: 'student', text: 'Hi Sage', timestamp: '2026-04-01T10:00:00.000Z' },
      { role: 'tutor', text: '', _streamId: 'stream-1', _streaming: true, timestamp: '2026-04-01T10:00:01.000Z' },
    ],
  });

  const nextSession = replaceMessageInChatSession(
    session,
    message => message._streamId === 'stream-1',
    message => ({ ...message, text: 'Hello there', _streaming: false, _streamId: undefined }),
  );

  assert.equal(nextSession.messages.length, 2);
  assert.equal(nextSession.messages[1].text, 'Hello there');
  assert.equal(nextSession.messages[1]._streaming, false);
});

runTest('resolveActiveChatSessionId falls back to the newest stored session', () => {
  const sessions = [
    createChatSession({
      id: 'older-session',
      createdAt: '2026-03-31T09:00:00.000Z',
      updatedAt: '2026-03-31T09:30:00.000Z',
      messages: [{ role: 'student', text: 'Older session', timestamp: '2026-03-31T09:00:00.000Z' }],
    }),
    createChatSession({
      id: 'newer-session',
      createdAt: '2026-04-01T09:00:00.000Z',
      updatedAt: '2026-04-01T09:45:00.000Z',
      messages: [{ role: 'student', text: 'Newer session', timestamp: '2026-04-01T09:00:00.000Z' }],
    }),
  ];

  const activeSessionId = resolveActiveChatSessionId(sessions, 'missing-session');

  assert.equal(activeSessionId, 'newer-session');
});
