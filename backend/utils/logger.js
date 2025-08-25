// Minimal logger utility for backend
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
const CURRENT_LEVEL = LEVELS[envLevel] != null ? LEVELS[envLevel] : LEVELS.debug;

function _log(level, ...args) {
  if (LEVELS[level] <= CURRENT_LEVEL) {
    const ts = new Date().toISOString();
    if (level === 'error') console.error(`[${ts}] [${level.toUpperCase()}]`, ...args);
    else if (level === 'warn') console.warn(`[${ts}] [${level.toUpperCase()}]`, ...args);
    else console.log(`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

module.exports = {
  info: (...args) => _log('info', ...args),
  warn: (...args) => _log('warn', ...args),
  error: (...args) => _log('error', ...args),
  debug: (...args) => _log('debug', ...args),
};
