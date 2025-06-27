import NodeCache from 'node-cache';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Initialize caches
const ipCache = new NodeCache({
  stdTTL: 86400,     // 24-hour default blocking
  checkperiod: 600,  // Cleanup every 10 minutes
  maxKeys: 10000
});

const rateLimiter = new RateLimiterMemory({
  points: 100,        // 100 requests
  duration: 60,       // per 60 seconds
  blockDuration: 300  // block for 5 minutes if exceeded
});

/**
 * Get real client IP (handles proxies)
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.ip || 
         req.socket?.remoteAddress;
};

/**
 * Global protection middleware (IP blocking + rate limiting)
 */
export const globalProtection = (options = {}) => {
  const {
    blockDuration = 86400, // 24h in seconds
    whitelist = [],
    excludePaths = [],
    rateLimit = {
      points: 100,
      duration: 60
    }
  } = options;

  // Update rate limiter config
  rateLimiter.points = rateLimit.points;
  rateLimiter.duration = rateLimit.duration;

  return async (req, res, next) => {
    const path = req.path;
    const clientIP = getClientIP(req);

    // Skip whitelisted IPs
    if (whitelist.includes(clientIP)) {
      return next();
    }

    // Skip excluded paths
    if (excludePaths.some(pattern => {
      if (typeof pattern === 'string') return path.startsWith(pattern);
      if (pattern instanceof RegExp) return pattern.test(path);
      return false;
    })) {
      return next();
    }

    // Check IP block first
    if (ipCache.has(clientIP)) {
      const remainingTime = ipCache.getTtl(clientIP) - Date.now();
      return res.status(403).json({
        error: 'IP_BLOCKED',
        message: `IP blocked until ${new Date(ipCache.getTtl(clientIP)).toISOString()}`,
        remainingSeconds: Math.round(remainingTime / 1000)
      });
    }

    // Apply rate limiting
    try {
      const rateLimitRes = await rateLimiter.consume(clientIP);
      
      res.set({
        'X-RateLimit-Limit': rateLimit.points,
        'X-RateLimit-Remaining': rateLimitRes.remainingPoints,
        'X-RateLimit-Reset': Math.ceil(rateLimitRes.msBeforeNext / 1000)
      });
      
      return next();
    } catch (rateLimitErr) {
      // Auto-block if rate limit exceeded too frequently
      if (rateLimitErr.consumedPoints > rateLimit.points * 3) {
        blockIP(clientIP, 3600, 'Excessive rate limit violations');
      }
      
      res.set('Retry-After', Math.ceil(rateLimitErr.msBeforeNext / 1000));
      return res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfter: Math.ceil(rateLimitErr.msBeforeNext / 1000)
      });
    }
  };
};

/**
 * Manual IP blocking
 */
export const blockIP = (ip, durationSeconds = 86400, reason = '') => {
  ipCache.set(ip, { 
    timestamp: new Date().toISOString(),
    reason: reason || 'Manual block'
  }, durationSeconds);
  console.log(`[IP BLOCK] ${ip} for ${durationSeconds}s | ${reason}`);
};

/**
 * Get security stats
 */
export const getSecurityStats = () => ({
  blockedIPs: ipCache.keys().map(ip => ({
    ip,
    ...ipCache.get(ip),
    expiresAt: new Date(ipCache.getTtl(ip)).toISOString()
  })),
  rateLimiter: {
    points: rateLimiter.points,
    duration: rateLimiter.duration
  }
});
