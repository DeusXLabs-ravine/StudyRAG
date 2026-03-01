/**
 * Translate internal/technical error messages into user-friendly messages.
 * Technical details are logged server-side but never exposed to the user.
 */
function getUserFriendlyMessage(err) {
  const msg = (err.message || '').toLowerCase();

  // Rate limiting / quota exceeded
  if (msg.includes('429') || msg.includes('rate') || msg.includes('resource_exhausted') ||
      msg.includes('quota') || msg.includes('too many requests')) {
    return "We're experiencing high demand right now. Please try again in a minute.";
  }

  // Overloaded / service unavailable
  if (msg.includes('503') || msg.includes('overloaded') || msg.includes('service unavailable') ||
      msg.includes('high demand') || msg.includes('unavailable')) {
    return "Our AI servers are busy at the moment. Please try again shortly.";
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnaborted') ||
      msg.includes('deadline exceeded')) {
    return "This is taking longer than expected. Please try again — it usually works on the second attempt.";
  }

  // Network / fetch failures
  if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('enotfound') ||
      msg.includes('network') || msg.includes('socket hang up')) {
    return "We're having trouble connecting to our servers. Please check your connection and try again.";
  }

  // JSON parse failures (malformed AI response)
  if (msg.includes('json') && (msg.includes('parse') || msg.includes('unexpected token'))) {
    return "Something went wrong generating your content. Please try again.";
  }

  // File too large
  if (msg.includes('too large') || msg.includes('file size') || msg.includes('payload too large')) {
    return "That file is too large. Please try a smaller file (under 200MB).";
  }

  // Generic 4xx client errors — return as-is (they're usually already user-friendly)
  const status = parseInt(err.statusCode, 10) || 0;
  if (status >= 400 && status < 500) {
    return err.message;
  }

  // Everything else — generic friendly message
  return "Something went wrong. Please try again.";
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  if (err.cause) console.error('Cause:', err.cause.message || err.cause);
  console.error(err.stack);

  const statusCode = parseInt(err.statusCode, 10) || 500;
  const friendlyMessage = getUserFriendlyMessage(err);

  res.status(statusCode).json({
    error: {
      message: friendlyMessage,
      ...(process.env.NODE_ENV === 'development' && { technical: err.message, stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
