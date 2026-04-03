import assert from 'node:assert/strict';
import { resolveApiBaseUrl, resolveLiveWsUrl } from './apiBase.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('resolveApiBaseUrl ignores localhost env on the production site', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    envApiUrl: 'http://localhost:5000/api',
    location: { hostname: 'studyrag.co' },
  });

  assert.equal(apiBaseUrl, 'https://api.studyrag.co/api');
});

runTest('resolveApiBaseUrl keeps localhost env during local development', () => {
  const apiBaseUrl = resolveApiBaseUrl({
    envApiUrl: 'http://localhost:5000/api',
    location: { hostname: 'localhost' },
  });

  assert.equal(apiBaseUrl, 'http://localhost:5000/api');
});

runTest('resolveLiveWsUrl maps the production API base to the live socket endpoint', () => {
  const wsUrl = resolveLiveWsUrl({
    envApiUrl: 'http://localhost:5000/api',
    location: { hostname: 'studyrag.co' },
  });

  assert.equal(wsUrl, 'wss://api.studyrag.co/live');
});

runTest('resolveLiveWsUrl keeps the local socket during local development', () => {
  const wsUrl = resolveLiveWsUrl({
    envApiUrl: 'http://localhost:5000/api',
    location: { hostname: 'localhost' },
  });

  assert.equal(wsUrl, 'ws://localhost:5000/live');
});
