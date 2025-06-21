export default {
    port: process.env.PORT || 3000,
    apiKey: process.env.API_KEY || 'your-very-secure-default-key',
    ffmpeg: {
        width: 1280,
        height: 720,
        duration: 5
    }
};
