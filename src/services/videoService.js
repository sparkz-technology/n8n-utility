import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import sharp from 'sharp';

export async function generateVideo(imageBuffer, options = {}) {
    const {
        width = 1280,
        height = 720,
        duration = 5,
        audioBuffer = null
    } = options;

    // Resize image with sharp to ensure proper dimensions before feeding into ffmpeg
    const resizedImageBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .png()
        .toBuffer();

    const tempInputPath = path.join(tmpdir(), `input-${Date.now()}.png`);
    const tempOutputPath = path.join(tmpdir(), `output-${Date.now()}.mp4`);
    const tempAudioPath = audioBuffer ? path.join(tmpdir(), `audio-${Date.now()}.mp3`) : null;

    await fs.writeFile(tempInputPath, resizedImageBuffer);
    if (audioBuffer) {
        await fs.writeFile(tempAudioPath, audioBuffer);
    }

    return new Promise((resolve, reject) => {
        const ffmpegCommand = ffmpeg(tempInputPath)
            .loop(duration)
            .videoCodec('libx264')
            .size(`${width}x${height}`)
            .addOption('-preset', 'ultrafast');

        if (audioBuffer) {
            ffmpegCommand.input(tempAudioPath)
                .audioCodec('aac')
                .addOption('-shortest');
        }

        ffmpegCommand.format('mp4')
            .output(tempOutputPath)
            .on('end', async () => {
                try {
                    const videoBuffer = await fs.readFile(tempOutputPath);
                    await fs.unlink(tempInputPath);
                    if (audioBuffer) await fs.unlink(tempAudioPath);
                    await fs.unlink(tempOutputPath);
                    resolve(videoBuffer);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', async (err) => {
                await fs.unlink(tempInputPath).catch(() => {});
                if (audioBuffer) await fs.unlink(tempAudioPath).catch(() => {});
                await fs.unlink(tempOutputPath).catch(() => {});
                reject(err);
            })
            .run();
    });
}
