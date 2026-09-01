/**
 * Converts a File object (from an <input type="file">) into a compressed Base64 Data URI.
 * @param {File} file - The image file to process.
 * @param {number} maxWidth - Maximum width for scaling (default: 800px).
 * @param {number} quality - JPEG compression quality from 0.1 to 1.0 (default: 0.75).
 * @returns {Promise<string>} - Resolves with the Base64 Data URI string.
 */
export function convertImageToBase64(file, maxWidth = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error("Please select a valid image file."));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                // Calculate scaled dimensions to keep DB payload small (< 100KB)
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to compressed JPEG Data URI
                const base64String = canvas.toDataURL('image/jpeg', quality);
                resolve(base64String);
            };

            img.onerror = (err) => reject(new Error("Failed to load image into canvas: " + err));
        };

        reader.onerror = (err) => reject(new Error("Failed to read image file: " + err));
    });
}