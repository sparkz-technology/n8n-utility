import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import router from './routes/index.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { apiKeyMiddleware } from './middlewares/apiKeyMiddleware.js';
import { globalProtection } from './middlewares/ipBlockerMiddleware.js';
import config from './config.js';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Apply global protection to ALL routes
app.use(globalProtection({
  blockDuration: 48 * 3600, // 48 hours
  whitelist: ['127.0.0.1'],
  excludePaths: [],
  rateLimit: {
    points: 200,       // 200 requests
    duration: 60       // per minute
  }
}));

app.use(apiKeyMiddleware);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api', router);

app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use(errorMiddleware);

app.listen(config.port, () => {
    console.log(`Backend service running on port ${config.port}`);
});
