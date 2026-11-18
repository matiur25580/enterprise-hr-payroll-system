function createRateLimit({ windowMs, max, message }) {
  const requests = new Map();
  const normalizedWindowMs = Number.isFinite(windowMs) ? Number(windowMs) : 60_000;
  const normalizedMax = Number.isFinite(max) ? Number(max) : 1;

  if (!Number.isFinite(normalizedWindowMs) || normalizedWindowMs <= 0 || !Number.isFinite(normalizedMax) || normalizedMax <= 0) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const now = Date.now();
    // Express req.ip is derived from the configured proxy trust boundary. Never trust
    // the raw X-Forwarded-For header here: clients can forge it to evade throttling.
    const rawIp = req?.ip || req?.socket?.remoteAddress || 'unknown';
    const key = String(rawIp || 'unknown');
    let entry = requests.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + normalizedWindowMs };
      requests.set(key, entry);
    }

    if (entry.count >= normalizedMax) {
      return res.status(429).json({ message });
    }

    entry.count += 1;
    if (requests.size > 10000) {
      for (const [address, limit] of requests) {
        if (limit.resetAt <= now) requests.delete(address);
      }
      if (requests.size > 10000) {
        return res.status(503).json({ message: 'Authentication service is temporarily busy. Please try again shortly.' });
      }
    }

    next();
  };
}

module.exports = createRateLimit;
