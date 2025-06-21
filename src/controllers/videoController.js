import { generateVideo } from '../services/videoService.js';
import axios from 'axios';
import { isValidUrl } from '../utils/helperFunctions.js';

export async function handleGenerateVideo(req, res, next) {
    try {
        const { imageUrl, audioUrl, durationSeconds, width, height } = req.body;

        if (!imageUrl || typeof imageUrl !== 'string' || !isValidUrl(imageUrl)) {
            return res.status(400).json({ error: 'Valid imageUrl is required.' });
        }

        if (audioUrl && (typeof audioUrl !== 'string' || !isValidUrl(audioUrl))) {
            return res.status(400).json({ error: 'audioUrl must be a valid URL.' });
        }

        if (durationSeconds !== undefined && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
            return res.status(400).json({ error: 'durationSeconds must be a positive number.' });
        }

        if (width !== undefined && (!Number.isInteger(width) || width <= 0)) {
            return res.status(400).json({ error: 'width must be a positive integer.' });
        }

        if (height !== undefined && (!Number.isInteger(height) || height <= 0)) {
            return res.status(400).json({ error: 'height must be a positive integer.' });
        }

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        let audioBuffer = null;
        if (audioUrl) {
            const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            audioBuffer = Buffer.from(audioResponse.data);
        }

        const videoBuffer = await generateVideo(imageBuffer, {
            width,
            height,
            duration: durationSeconds,
            audioBuffer
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.send(videoBuffer);

    } catch (error) {
        console.error('Error generating video:', error);
        next(error);
    }
}

