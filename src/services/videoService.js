import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import sharp from 'sharp';

export async function generateVideo(imageBuffer, options = {}) {
  const {
    width = 1280,
    height = 720,
    duration = 5
  } = options;

  // Resize image safely before ffmpeg
  const resizedImageBuffer = await sharp(imageBuffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toBuffer();

  // Temporary file paths
  const tempInputPath = path.join(tmpdir(), `input-${Date.now()}.png`);
  const tempOutputPath = path.join(tmpdir(), `output-${Date.now()}.mp4`);

  await fs.writeFile(tempInputPath, resizedImageBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tempInputPath)
      .loop(duration)
      .videoCodec('libx264')
      .size(`${width}x${height}`)
      .addOption('-preset', 'ultrafast')
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
