import express from 'express';
import bodyParser from 'body-parser';
import nodeHtmlToImage from 'node-html-to-image';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const port = process.env.PORT || 3000;  // Use PORT env var for Render compatibility
const API_KEY = process.env.API_KEY || 'my-secret-api-key';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware to enable CORS
app.use(cors());

// Body parser middleware
app.use(bodyParser.json({ limit: '1mb' }));

// Log requests only in production
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
}

// API Key middleware
app.use((req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Image generation endpoint
app.post('/generate', async (req, res) => {
  const { htmlContent } = req.body;

  if (!htmlContent) {
    return res.status(400).json({ error: 'Missing htmlContent in request body' });
  }

  try {
    const imageBuffer = await nodeHtmlToImage({
      html: htmlContent,
      type: 'png',
      encoding: 'buffer',
      quality: 100,
      selector: '.quote-card',
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
