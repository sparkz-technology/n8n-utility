import nodeHtmlToImage from 'node-html-to-image';

export async function generateImage(htmlContent, selector) {
    return await nodeHtmlToImage({
        html: htmlContent,
        selector,
        type: 'png',
        encoding: 'buffer',
        quality: 100,
    });
}
