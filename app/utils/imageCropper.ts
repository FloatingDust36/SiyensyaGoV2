// app/utils/imageCropper.ts

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

const CROPS_DIR = `${FileSystem.documentDirectory}siyensyago_crops/`;
const PADDING_PERCENTAGE = 0.05; // 5% padding around object
const MAX_CROP_WIDTH = 800;      // Max width in pixels
const JPEG_QUALITY = 0.8;        // 80% quality

// Ensure crop directory exists
async function ensureCropDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(CROPS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CROPS_DIR, { intermediates: true });
        console.log('✓ Created crops directory');
    }
}

// Get actual image dimensions
function getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        Image.getSize(
            imageUri,
            (width, height) => {
                console.log(`📐 Image dimensions: ${width}x${height}`);
                resolve({ width, height });
            },
            (error) => {
                console.error('Error getting image dimensions:', error);
                reject(error);
            }
        );
    });
}

// Convert percentage-based bounding box to pixel coordinates
function calculateCropCoordinates(
    boundingBox: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
): { originX: number; originY: number; width: number; height: number } {

    // Step 1: Convert percentages to pixels
    const x = (boundingBox.x / 100) * imageWidth;
    const y = (boundingBox.y / 100) * imageHeight;
    const width = (boundingBox.width / 100) * imageWidth;
    const height = (boundingBox.height / 100) * imageHeight;

    // Step 2: Calculate padding
    const paddingX = width * PADDING_PERCENTAGE;
    const paddingY = height * PADDING_PERCENTAGE;

    // Step 3: Apply padding (with boundary checks)
    let paddedX = Math.max(0, x - paddingX);
    let paddedY = Math.max(0, y - paddingY);
    let paddedWidth = Math.min(imageWidth - paddedX, width + (paddingX * 2));
    let paddedHeight = Math.min(imageHeight - paddedY, height + (paddingY * 2));

    // Step 4: Ensure minimum size (at least 100px for visibility)
    paddedWidth = Math.max(100, paddedWidth);
    paddedHeight = Math.max(100, paddedHeight);

    // Step 5: Round to integers (required by manipulateAsync)
    return {
        originX: Math.round(paddedX),
        originY: Math.round(paddedY),
        width: Math.round(paddedWidth),
        height: Math.round(paddedHeight)
    };
}

// Crop image for a single object
export async function cropImageForObject(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    objectName: string
): Promise<string> {
    try {
        await ensureCropDirectory();

        // Get actual image dimensions
        const { width: imageWidth, height: imageHeight } = await getImageDimensions(imageUri);

        // Calculate crop coordinates
        const cropCoords = calculateCropCoordinates(boundingBox, imageWidth, imageHeight);

        console.log(`✂️ Cropping "${objectName}":`, {
            boundingBox,
            imageSize: { width: imageWidth, height: imageHeight },
            cropCoords
        });

        // Perform crop operation
        const croppedImage = await manipulateAsync(
            imageUri,
            [
                // Step 1: Crop to object
                {
                    crop: {
                        originX: cropCoords.originX,
                        originY: cropCoords.originY,
                        width: cropCoords.width,
                        height: cropCoords.height
                    }
                },
                // Step 2: Resize if too large (for storage efficiency)
                { resize: { width: Math.min(MAX_CROP_WIDTH, cropCoords.width) } }
            ],
            {
                compress: JPEG_QUALITY,
                format: SaveFormat.JPEG
            }
        );

        // Generate unique filename
        const sanitizedName = objectName
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .substring(0, 30); // Limit length
        const timestamp = Date.now();
        const filename = `${sanitizedName}_${timestamp}.jpg`;
        const permanentUri = `${CROPS_DIR}${filename}`;

        // Move to permanent storage
        await FileSystem.copyAsync({
            from: croppedImage.uri,
            to: permanentUri
        });

        console.log(`✓ Cropped image saved: ${filename}`);
        return permanentUri;

    } catch (error) {
        console.error('Error cropping image:', error);
        // Fallback: return original image if cropping fails
        console.warn('⚠️ Falling back to original image');
        return imageUri;
    }
}

// Crop multiple objects from same image (batch operation)

export async function cropMultipleObjects(
    imageUri: string,
    objects: Array<{
        id: string;
        name: string;
        boundingBox: { x: number; y: number; width: number; height: number };
    }>
): Promise<Map<string, string>> {
    const croppedImages = new Map<string, string>();

    console.log(`✂️ Batch cropping ${objects.length} objects...`);

    for (const object of objects) {
        try {
            const croppedUri = await cropImageForObject(
                imageUri,
                object.boundingBox,
                object.name
            );
            croppedImages.set(object.id, croppedUri);
        } catch (error) {
            console.error(`Failed to crop "${object.name}":`, error);
            // Use original image as fallback
            croppedImages.set(object.id, imageUri);
        }
    }

    console.log(`✓ Batch crop complete: ${croppedImages.size}/${objects.length} successful`);
    return croppedImages;
}

// Delete cropped image
export async function deleteCroppedImage(croppedUri: string): Promise<void> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(croppedUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(croppedUri);
            console.log('✓ Deleted cropped image');
        }
    } catch (error) {
        console.error('Error deleting cropped image:', error);
    }
}

// Clean up old cropped images (maintenance function)
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

        if (deletedCount > 0) {
            console.log(`✓ Cleaned up ${deletedCount} old cropped images`);
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleaning up cropped images:', error);
        return 0;
    }
}