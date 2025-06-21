import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import config from '../config.js';
import path from 'path';

export async function generateVideo(imageBuffer, options = {}) {
    const {
         width = config.ffmpeg.width,
        height = config.ffmpeg.height,
        duration = config.ffmpeg.duration
    } = options;

    // Write image buffer to temp file
    const tempInputPath = path.join(tmpdir(), `input-${Date.now()}.png`);
    const tempOutputPath = path.join(tmpdir(), `output-${Date.now()}.mp4`);
    await fs.writeFile(tempInputPath, imageBuffer);

    return new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
            .loop(duration)
            .size(`${width}x${height}`)
            .videoCodec('libx264')
            .format('mp4')
            .output(tempOutputPath)
            .on('end', async () => {
                try {
                    const videoBuffer = await fs.readFile(tempOutputPath);
                    await fs.unlink(tempInputPath);
                    await fs.unlink(tempOutputPath);
                    resolve(videoBuffer);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', async (err) => {
                await fs.unlink(tempInputPath).catch(() => {});
                await fs.unlink(tempOutputPath).catch(() => {});
                reject(err);
            })
            .run();
    });
}
