import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import config from '../../config.js';

export function generateVideo(imageBuffer, options = {}) {
    const {
        width = config.ffmpeg.width,
        height = config.ffmpeg.height,
        duration = config.ffmpeg.duration
    } = options;

    const imageStream = Readable.from(imageBuffer);
    return ffmpeg(imageStream)
        .inputFormat('png')
        .loop(duration)
        .outputOptions([
            '-movflags frag_keyframe+empty_moov',
            '-pix_fmt yuv420p',
            `-vf scale=${width}:${height}`
        ])
        .videoCodec('libx264')
        .format('mp4');
}
