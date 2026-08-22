const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    // Scoped to tests/ deliberately: src/services/geminiLiveProxy.test.js is a
    // pre-existing, hand-rolled script (plain node:assert + a manual runner,
    // meant to be run directly via `node`), not a vitest suite. The default
    // **/*.test.js glob would pick it up and fail with "no test suite found".
    include: ['tests/**/*.test.js'],
  },
});
