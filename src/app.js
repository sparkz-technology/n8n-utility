import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import router from './routes/index.js';
import axios from "axios";
import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { apiKeyMiddleware } from './middlewares/apiKeyMiddleware.js';
import { globalProtection } from './middlewares/ipBlockerMiddleware.js';
import config from './config.js';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(morgan('combined'));

const TARGET_API = 'https://api.llm7.io/v1/chat/completions';

app.get('/proxy', async (req, res) => {
  const authHeader = req.headers['Authorization']; // full "Bearer xyz"

  try {
    const axiosHeaders = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      axiosHeaders['Authorization'] = authHeader;
    }
    const response = await axios.post(TARGET_API, req.body, {
      headers: axiosHeaders,
    });
  console.warn(response,"response")
    res.status(200).json(response.data);
  } catch (error) {
    console.warn(error,"error")
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message,
      error: error.response?.data || null,
    });
  }
});

app.use(globalProtection({
  blockDuration: 48 * 3600, // 48 hours
  whitelist: ['127.0.0.1','223.178.86.102'],
  excludePaths: [],
  rateLimit: {
    points: 60,       // 200 requests
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
