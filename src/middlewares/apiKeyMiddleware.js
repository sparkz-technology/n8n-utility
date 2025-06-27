// import config from '../config.js';

// export function apiKeyMiddleware(req, res, next) {
//     const apiKey = req.header('x-api-key');
//     if (!apiKey || apiKey !== config.apiKey) {
//         return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
//     }
//     next();
// }
import config from '../config.js';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import { blockIP } from './ipBlockerMiddleware.js';

// Create a separate cache to track failed attempts
const failedAttemptsCache = new NodeCache({
  stdTTL: 3600,       // reset attempts after 1 hour
  checkperiod: 600,   // cleanup every 10 minutes
  maxKeys: 10000
});

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 3600; // seconds

/**
 * Constant-time comparison
 */
function safeCompare(a, b) {
  const aBuffer = Buffer.from(a || '', 'utf8');
  const bBuffer = Buffer.from(b || '', 'utf8');
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Get client IP
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.ip ||
         req.socket?.remoteAddress;
}

/**
 * API Key Middleware with blocking support
 */
export function apiKeyMiddleware(req, res, next) {
  const receivedKey = req.header('x-api-key');
  const clientIP = getClientIP(req);

  const validKeys = Array.isArray(config.apiKey) ? config.apiKey : [config.apiKey];

  // Handle missing key
  if (!receivedKey) {
    console.warn(`[AUTH] Missing API key from IP ${clientIP} (${req.originalUrl})`);
    incrementFailedAttempts(clientIP, 'missing');
    return res.status(400).json({ error: 'Missing API Key in x-api-key header' });
  }

  // Handle invalid key
  const isValid = validKeys.some(key => safeCompare(receivedKey, key));
  if (!isValid) {
    console.warn(`[AUTH] Invalid API key from IP ${clientIP} (${req.originalUrl})`);
    incrementFailedAttempts(clientIP, 'invalid');
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }

  // Valid key – reset failure count
  failedAttemptsCache.del(clientIP);
  return next();
}

/**
 * Increments failed attempt count and blocks IP if necessary
 */
function incrementFailedAttempts(ip, type = 'invalid') {
  const current = failedAttemptsCache.get(ip) || 0;
  const updated = current + 1;
  failedAttemptsCache.set(ip, updated);

  if (updated >= MAX_FAILED_ATTEMPTS) {
    blockIP(ip, BLOCK_DURATION, `Too many ${type} API key attempts`);
    failedAttemptsCache.del(ip);
  }
}
