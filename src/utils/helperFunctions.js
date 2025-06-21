
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}
