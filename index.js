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

// Use multer memory storage (no disk storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/generate-reel', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), async (req, res) => {
    try {
        const image = req.files['image'] ? req.files['image'][0] : null;
        const audio = req.files['audio'] ? req.files['audio'][0] : null;

        if (!image) {
            return res.status(400).send('Image file is required.');
        }

        // Generate temporary file paths
        const tmpImagePath = path.join(__dirname, `${uuidv4()}.jpg`);
        const tmpAudioPath = audio 
            ? path.join(__dirname, `${uuidv4()}.mp3`) 
            : path.join(__dirname, 'public', 'quiet-stars-ai.mp3');
        const tmpOutputPath = path.join(__dirname, `${uuidv4()}.mp4`);

        // Write memory buffers to temporary files
        fs.writeFileSync(tmpImagePath, image.buffer);
        if (audio) {
            fs.writeFileSync(tmpAudioPath, audio.buffer);
        }

        // Start ffmpeg processing
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
                    // Cleanup all temporary files
                    fs.unlinkSync(tmpImagePath);
                    if (audio) fs.unlinkSync(tmpAudioPath);
                    fs.unlinkSync(tmpOutputPath);
                });
            })
            .on('error', (err) => {
                console.error(err);
                // Cleanup even on error
                if (fs.existsSync(tmpImagePath)) fs.unlinkSync(tmpImagePath);
                if (audio && fs.existsSync(tmpAudioPath)) fs.unlinkSync(tmpAudioPath);
                res.status(500).send('Video processing failed.');
            });

    } catch (err) {
        console.error(err);
        res.status(500).send('Unexpected server error.');
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`VIV API (stateless, Insta Reels) running on http://localhost:${PORT}`);
});
