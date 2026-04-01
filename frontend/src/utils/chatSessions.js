export const CHAT_SESSIONS_STORAGE_KEY = 'studyrag_chat_sessions_v1';
export const ACTIVE_CHAT_SESSION_STORAGE_KEY = 'studyrag_active_chat_session_v1';
export const DEFAULT_CHAT_SESSION_TITLE = 'New chat';

const SESSION_TITLE_MAX_LENGTH = 48;

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toTimeValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

function toIsoTimestamp(value) {
  const timeValue = toTimeValue(value);
  if (!timeValue) return new Date().toISOString();
  return new Date(timeValue).toISOString();
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(Boolean)
    .map(message => ({
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    }));
}

function resolveSessionTitle(messages, existingTitle) {
  if (!existingTitle || existingTitle === DEFAULT_CHAT_SESSION_TITLE) {
    return deriveChatSessionTitle(messages);
  }

  return existingTitle;
}

export function deriveChatSessionTitle(messages = []) {
  const firstStudentMessage = messages.find(
    message => message.role === 'student' && typeof message.text === 'string' && message.text.trim(),
  );

  if (!firstStudentMessage) {
    return DEFAULT_CHAT_SESSION_TITLE;
  }

  const title = firstStudentMessage.text.trim().replace(/\s+/g, ' ');
  if (title.length <= SESSION_TITLE_MAX_LENGTH) {
    return title;
  }

  return `${title.slice(0, SESSION_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

export function createChatSession(session = {}) {
  const messages = normalizeMessages(session.messages);
  const createdAt = session.createdAt
    ? toIsoTimestamp(session.createdAt)
    : messages[0]?.timestamp
      ? toIsoTimestamp(messages[0].timestamp)
      : new Date().toISOString();
  const updatedAt = session.updatedAt
    ? toIsoTimestamp(session.updatedAt)
    : messages[messages.length - 1]?.timestamp
      ? toIsoTimestamp(messages[messages.length - 1].timestamp)
      : createdAt;

  return {
    id: session.id || createSessionId(),
    title: resolveSessionTitle(messages, session.title),
    documentId: session.documentId ?? null,
    createdAt,
    updatedAt,
    messages,
  };
}

export function sortChatSessions(sessions = []) {
  return [...sessions].sort((left, right) => toTimeValue(right.updatedAt) - toTimeValue(left.updatedAt));
}

export function convertLegacyHistoryToMessages(history = []) {
  const messages = [];

  for (const row of history) {
    if (!row) continue;

    if (row.query) {
      messages.push({
        role: 'student',
        text: row.query,
        timestamp: row.timestamp,
        _id: row.id,
      });
    }

    if (row.answer) {
      messages.push({
        role: 'tutor',
        text: row.answer,
        timestamp: row.timestamp,
        _id: row.id,
        _sources: row.sources || [],
        webSources: row.webSources || [],
      });
    }
  }

  return messages;
}

export function importLegacyChatSession(history = []) {
  const messages = convertLegacyHistoryToMessages(history);
  if (!messages.length) return [];

  const firstRow = history.find(Boolean) || null;
  const lastRow = [...history].reverse().find(Boolean) || firstRow;

  return [
    createChatSession({
      id: 'legacy-import',
      documentId: lastRow?.documentId ?? firstRow?.documentId ?? null,
      createdAt: firstRow?.timestamp,
      updatedAt: lastRow?.timestamp,
      messages,
    }),
  ];
}

export function normalizeChatSessions(sessions = []) {
  if (!Array.isArray(sessions)) return [];

  return sortChatSessions(
    sessions
      .filter(Boolean)
      .map(session => createChatSession(session)),
  );
}

export function hydrateChatSessions({ storedSessions = [], legacyHistory = [] } = {}) {
  const normalizedStoredSessions = normalizeChatSessions(storedSessions);
  if (normalizedStoredSessions.length > 0) {
    return normalizedStoredSessions;
  }

  const importedSessions = importLegacyChatSession(legacyHistory);
  if (importedSessions.length > 0) {
    return importedSessions;
  }

  return [createChatSession()];
}

export function resolveActiveChatSessionId(sessions = [], preferredSessionId = null) {
  if (!sessions.length) return null;

  if (preferredSessionId && sessions.some(session => session.id === preferredSessionId)) {
    return preferredSessionId;
  }

  return sortChatSessions(sessions)[0]?.id ?? null;
}

export function appendMessageToChatSession(session, message) {
  const messages = [...normalizeMessages(session.messages), { ...message, timestamp: message.timestamp ?? Date.now() }];
  return createChatSession({
    ...session,
    title: resolveSessionTitle(messages, session.title),
    updatedAt: message.timestamp,
    messages,
  });
}

export function replaceMessageInChatSession(session, predicate, updater) {
  let changed = false;
  const messages = normalizeMessages(session.messages).map(message => {
    if (!predicate(message)) {
      return message;
    }

    changed = true;
    const updatedMessage = updater(message);
    return {
      ...updatedMessage,
      timestamp: updatedMessage.timestamp ?? message.timestamp ?? Date.now(),
    };
  });

  if (!changed) {
    return createChatSession(session);
  }

  return createChatSession({
    ...session,
    title: resolveSessionTitle(messages, session.title),
    updatedAt: messages[messages.length - 1]?.timestamp ?? session.updatedAt,
    messages,
  });
}

export function upsertChatSession(sessions, nextSession) {
  const normalizedSession = createChatSession(nextSession);
  return sortChatSessions([
    ...normalizeChatSessions(sessions).filter(session => session.id !== normalizedSession.id),
    normalizedSession,
  ]);
}

export function deleteChatSession(sessions, sessionId) {
  const remainingSessions = normalizeChatSessions(sessions).filter(session => session.id !== sessionId);
  return remainingSessions.length > 0 ? remainingSessions : [createChatSession()];
}

export function loadStoredChatSessions(storage) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) return [];

  try {
    const rawValue = resolvedStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!rawValue) return [];
    return normalizeChatSessions(JSON.parse(rawValue));
  } catch {
    return [];
  }
}

export function saveStoredChatSessions(sessions, storage) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) return;

  try {
    resolvedStorage.setItem(
      CHAT_SESSIONS_STORAGE_KEY,
      JSON.stringify(normalizeChatSessions(sessions)),
    );
  } catch {
    // Ignore storage write failures so chat still works in memory.
  }
}

export function loadActiveChatSessionId(storage) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) return null;

  try {
    return resolvedStorage.getItem(ACTIVE_CHAT_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveChatSessionId(sessionId, storage) {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) return;

  try {
    if (sessionId) {
      resolvedStorage.setItem(ACTIVE_CHAT_SESSION_STORAGE_KEY, sessionId);
      return;
    }

    resolvedStorage.removeItem(ACTIVE_CHAT_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage write failures so chat still works in memory.
  }
}
