function parseAllowedOrigins(value, nodeEnv = process.env.NODE_ENV) {
  const configured = typeof value === 'string'
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  if (configured.includes('*')) {
    throw new Error('CLIENT_URL must contain explicit origins; wildcard origins are not allowed.');
  }

  if (configured.length > 0) {
    const normalized = configured.map((origin) => {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error('CLIENT_URL must contain valid absolute HTTP(S) origins.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.origin !== origin.replace(/\/$/, '')
        || parsed.username || parsed.password || parsed.pathname !== '/'
        || parsed.search || parsed.hash) {
        throw new Error('CLIENT_URL entries must be plain HTTP(S) origins without paths or credentials.');
      }
      return parsed.origin;
    });
    return [...new Set(normalized)];
  }

  if (nodeEnv === 'production') {
    throw new Error('CLIENT_URL must be configured with at least one trusted frontend origin in production.');
  }

  return ['http://localhost:5173', 'http://localhost:3000'];
}

function isAllowedOrigin(origin, allowedOrigins) {
  return origin === undefined || allowedOrigins.includes(origin);
}

module.exports = { parseAllowedOrigins, isAllowedOrigin };
