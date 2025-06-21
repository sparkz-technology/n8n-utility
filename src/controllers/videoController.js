import { generateVideo } from '../services/videoService.js';
import axios from 'axios';

export async function handleGenerateVideo(req, res, next) {
    try {
        const { imageUrl, durationSeconds, width, height } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'imageUrl is required.' });
        }

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        const videoStream = generateVideo(imageBuffer, {
            width,
            height,
            duration: durationSeconds
        });

        res.setHeader('Content-Type', 'video/mp4');
        videoStream.on('error', (err) => next(err));
        videoStream.pipe(res, { end: true });

    } catch (error) {
        next(error);
    }
}
