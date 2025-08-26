// Helper to return app base path (no origin) and API base path safely
export function getAppBasePath() {
  // returns '' or '/shaikhcarpets' style base
  if (typeof window !== 'undefined' && window.__basename !== undefined) return (window.__basename || '').replace(/\/$/, '') || '';
  return (import.meta.env.BASE_URL || '').replace(/\/$/, '') || '';
}

export function getApiBaseUrl() {
  // prefer configured API base; if none, return empty string to allow relative calls
  const api = import.meta.env.VITE_API_BASE_URL || '';
  return (api || '').replace(/\/$/, '');
}
