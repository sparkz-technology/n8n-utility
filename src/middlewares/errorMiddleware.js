export function errorMiddleware(err, req, res, next) {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
}
