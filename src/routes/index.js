import express from 'express';
import { handleGenerateImage } from '../controllers/imageController.js';
import { handleGenerateVideo } from '../controllers/videoController.js';

const router = express.Router();

router.post('/generate-image', handleGenerateImage);
router.post('/generate-video', handleGenerateVideo);

export default router;
