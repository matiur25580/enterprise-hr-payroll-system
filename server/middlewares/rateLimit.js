function createRateLimit({ windowMs, max, message }) {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = requests.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      requests.set(key, entry);
    }

    if (entry.count >= max) {
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
