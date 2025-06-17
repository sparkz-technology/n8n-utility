const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Serve public folder statically (for fallback audio)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Configure FFmpeg static binary
ffmpeg.setFfmpegPath(ffmpegPath);

// Use multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST API
app.post('/generate-reel', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), async (req, res, next) => {
    try {
        const image = req.files?.['image']?.[0];
        const audio = req.files?.['audio']?.[0];

        if (!image) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        const tmpImagePath = path.join(__dirname, `${uuidv4()}.jpg`);
        const tmpAudioPath = audio 
            ? path.join(__dirname, `${uuidv4()}.mp3`) 
            : path.join(__dirname, 'public', 'quiet-stars-ai.mp3');
        const tmpOutputPath = path.join(__dirname, `${uuidv4()}.mp4`);

        // Write uploaded buffers to temp files
        fs.writeFileSync(tmpImagePath, image.buffer);
        if (audio) {
            fs.writeFileSync(tmpAudioPath, audio.buffer);
        }

        ffmpeg()
            .input(tmpImagePath)
            .loop(16)
            .input(tmpAudioPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate('192k')
            .outputOptions([
                '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
                '-pix_fmt', 'yuv420p',
                '-shortest'
            ])
            .save(tmpOutputPath)
            .on('end', () => {
                res.download(tmpOutputPath, () => {
                    // Cleanup
                    fs.unlinkSync(tmpImagePath);
                    if (audio) fs.unlinkSync(tmpAudioPath);
                    fs.unlinkSync(tmpOutputPath);
                });
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                cleanupTempFiles([tmpImagePath, tmpAudioPath, tmpOutputPath]);
                next(new Error('Video processing failed.'));
            });

    } catch (err) {
        next(err);
    }
});

// Health Check API
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'VIV API', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Utility function to cleanup files
function cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
        if (fs.existsSync(filePath) && filePath.includes(__dirname)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.error(`Failed to delete ${filePath}`, e); }
        }
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`VIV API running on http://localhost:${PORT}`);
});
