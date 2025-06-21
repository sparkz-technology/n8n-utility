import config from '../../config.js';

export function apiKeyMiddleware(req, res, next) {
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== config.apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
}
