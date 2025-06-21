import { generateImage } from '../services/imageService.js';

export async function handleGenerateImage(req, res, next) {
    try {
        const { htmlContent, selector } = req.body;

        if (!htmlContent || !selector) {
            return res.status(400).json({ error: 'htmlContent and selector are required.' });
        }

        const imageBuffer = await generateImage(htmlContent, selector);

        res.setHeader('Content-Type', 'image/png');
        res.send(imageBuffer);

    } catch (error) {
        next(error);
    }
}
