import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import router from './routes/index.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { apiKeyMiddleware } from './middlewares/apiKeyMiddleware.js';
import config from './config.js';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Apply API key middleware globally (protect entire API)
app.use(apiKeyMiddleware);

app.use('/api', router);
app.use(errorMiddleware);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(config.port, () => {
    console.log(`Backend service running on port ${config.port}`);
});
