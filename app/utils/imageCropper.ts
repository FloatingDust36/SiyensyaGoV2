// In app/utils/imageCropper.ts
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const CROPS_DIR = `${FileSystem.documentDirectory}siyensyago_crops/`;
const PADDING_PERCENTAGE = 0; // Strict crop
const JPEG_QUALITY = 0.85;

async function ensureCropDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(CROPS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CROPS_DIR, { intermediates: true });
    }
}

// Normalize image to bake EXIF rotation into pixels
async function normalizeImage(imageUri: string): Promise<{ uri: string; width: number; height: number }> {
    const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [], // No actions = just save to apply rotation
        { format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, width: result.width, height: result.height };
}

export async function cropImageForObject(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    objectName: string
): Promise<string> {
    try {
        await ensureCropDirectory();

        // 1. Normalize first to ensure 0,0 is top-left
        const { uri: normalizedUri, width: imgWidth, height: imgHeight } = await normalizeImage(imageUri);

        // 2. Calculate Coordinates (Percentage -> Pixels)
        const x = (boundingBox.x / 100) * imgWidth;
        const y = (boundingBox.y / 100) * imgHeight;
        const w = (boundingBox.width / 100) * imgWidth;
        const h = (boundingBox.height / 100) * imgHeight;

        // 3. Padding
        const padX = w * PADDING_PERCENTAGE;
        const padY = h * PADDING_PERCENTAGE;

        // 4. Boundary Checks
        const cropX = Math.max(0, x - padX);
        const cropY = Math.max(0, y - padY);
        const cropW = Math.min(imgWidth - cropX, w + (padX * 2));
        const cropH = Math.min(imgHeight - cropY, h + (padY * 2));

        // 5. Perform Crop
        const cropResult = await ImageManipulator.manipulateAsync(
            normalizedUri,
            [{
                crop: {
                    originX: Math.round(cropX),
                    originY: Math.round(cropY),
                    width: Math.round(cropW),
                    height: Math.round(cropH),
                }
            }],
            { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 6. Save
        const sanitizedName = objectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const filename = `crop_${sanitizedName}_${Date.now()}.jpg`;
        const permanentUri = `${CROPS_DIR}${filename}`;

        await FileSystem.moveAsync({
            from: cropResult.uri,
            to: permanentUri
        });

        return permanentUri;

    } catch (error) {
        console.error('Crop failed:', error);
        return imageUri; // Fallback
    }
}

export async function cleanupOldCrops(daysOld: number = 30): Promise<number> {
    try {
        await ensureCropDirectory();
        const files = await FileSystem.readDirectoryAsync(CROPS_DIR);
        const now = Date.now();
        let deletedCount = 0;

        for (const file of files) {
            const fileUri = `${CROPS_DIR}${file}`;
            const info = await FileSystem.getInfoAsync(fileUri);

            if (info.exists && info.modificationTime) {
                const ageInDays = (now - info.modificationTime * 1000) / (1000 * 60 * 60 * 24);
                if (ageInDays > daysOld) {
                    await FileSystem.deleteAsync(fileUri);
                    deletedCount++;
                }
            }
        }
        return deletedCount;
    } catch (error) {
        return 0;
    }
}