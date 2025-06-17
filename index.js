const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/public', express.static(path.join(__dirname, 'public')));
ffmpeg.setFfmpegPath(ffmpegPath);

// Use disk storage instead of memory storage
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, 'uploads'));
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${uuidv4()}${ext}`);
        }
    })
});

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

app.post('/generate-reel', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), async (req, res, next) => {
    try {
        const imageFile = req.files?.['image']?.[0];
        const audioFile = req.files?.['audio']?.[0];

        if (!imageFile) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        const tmpImagePath = imageFile.path;
        const tmpAudioPath = audioFile ? audioFile.path : path.join(__dirname, 'public', 'quiet-stars-ai.mp3');
        const tmpOutputPath = path.join(__dirname, 'uploads', `${uuidv4()}.mp4`);

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
                    cleanupFiles([tmpImagePath, tmpOutputPath, audioFile?.path]);
                });
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                cleanupFiles([tmpImagePath, tmpOutputPath, audioFile?.path]);
                next(new Error('Video processing failed.'));
            });

    } catch (err) {
        next(err);
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'VIV API', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

function cleanupFiles(files) {
    files.forEach(file => {
        if (file && fs.existsSync(file)) {
            try { fs.unlinkSync(file); } catch (e) { console.error(`Error deleting ${file}:`, e); }
        }
    });
}

app.listen(PORT, () => {
    console.log(`VIV API running on http://localhost:${PORT}`);
});
