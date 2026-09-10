const hits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start > 60000) hits.delete(key);
  }
}, 60000);

export function rateLimit(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.start > windowMs) {
    hits.set(ip, { start: now, count: 1 });
    return true;
  }

  entry.count++;
  return entry.count <= limit;
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}
