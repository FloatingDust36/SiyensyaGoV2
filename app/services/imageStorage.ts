// In app/services/imageStorage.ts
import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}siyensyago_images/`;

// Ensure the images directory exists
async function ensureImageDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }
}

// Copy image from cache to permanent storage
export async function saveImagePermanently(tempUri: string): Promise<string> {
    try {
        await ensureImageDirectory();

        // Generate unique filename
        const filename = `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const permanentUri = `${IMAGES_DIR}${filename}`;

        // Copy file
        await FileSystem.copyAsync({
            from: tempUri,
            to: permanentUri,
        });

        console.log('✓ Image saved permanently:', permanentUri);
        return permanentUri;
    } catch (error) {
        console.error('Error saving image:', error);
        throw error;
    }
}

// Delete image from permanent storage
export async function deleteImage(uri: string): Promise<void> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(uri);
            console.log('✓ Image deleted:', uri);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}

// Clean up old images (optional - for maintenance)
export async function cleanupOldImages(daysOld: number = 30): Promise<void> {
    try {
        await ensureImageDirectory();
        const files = await FileSystem.readDirectoryAsync(IMAGES_DIR);
        const now = Date.now();

        for (const file of files) {
            const fileUri = `${IMAGES_DIR}${file}`;
            const info = await FileSystem.getInfoAsync(fileUri);

            if (info.exists && info.modificationTime) {
                const ageInDays = (now - info.modificationTime * 1000) / (1000 * 60 * 60 * 24);
                if (ageInDays > daysOld) {
                    await FileSystem.deleteAsync(fileUri);
                    console.log('✓ Cleaned up old image:', file);
                }
            }
        }
    } catch (error) {
        console.error('Error cleaning up images:', error);
    }
}