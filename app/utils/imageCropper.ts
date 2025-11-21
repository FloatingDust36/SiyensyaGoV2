// app/utils/imageCropper.ts

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

const CROPS_DIR = `${FileSystem.documentDirectory}siyensyago_crops/`;
const PADDING_PERCENTAGE = 0.10; // Increased to 10% padding for better coverage
const MAX_CROP_WIDTH = 800;
const JPEG_QUALITY = 0.8;

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
                console.log(`📐 Original image dimensions: ${width}x${height}`);
                resolve({ width, height });
            },
            (error) => {
                console.error('❌ Error getting image dimensions:', error);
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

    console.log('📊 Bounding Box Input (percentages):', {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height
    });

    // Step 1: Convert percentages to pixels
    // IMPORTANT: x and y are TOP-LEFT corner coordinates (not center)
    const xPixel = (boundingBox.x / 100) * imageWidth;
    const yPixel = (boundingBox.y / 100) * imageHeight;
    const widthPixel = (boundingBox.width / 100) * imageWidth;
    const heightPixel = (boundingBox.height / 100) * imageHeight;

    console.log('📊 Step 1 - Converted to pixels:', {
        x: xPixel,
        y: yPixel,
        width: widthPixel,
        height: heightPixel
    });

    // Step 2: Calculate padding (10% of object size)
    const paddingX = widthPixel * PADDING_PERCENTAGE;
    const paddingY = heightPixel * PADDING_PERCENTAGE;

    console.log('📊 Step 2 - Padding calculated:', {
        paddingX,
        paddingY
    });

    // Step 3: Apply padding with boundary checks
    let paddedX = Math.max(0, xPixel - paddingX);
    let paddedY = Math.max(0, yPixel - paddingY);
    let paddedWidth = Math.min(imageWidth - paddedX, widthPixel + (paddingX * 2));
    let paddedHeight = Math.min(imageHeight - paddedY, heightPixel + (paddingY * 2));

    console.log('📊 Step 3 - After padding and boundary checks:', {
        paddedX,
        paddedY,
        paddedWidth,
        paddedHeight
    });

    // Step 4: Ensure minimum size (at least 100px for visibility)
    paddedWidth = Math.max(100, paddedWidth);
    paddedHeight = Math.max(100, paddedHeight);

    // Step 5: Final boundary check (ensure we don't go out of image)
    if (paddedX + paddedWidth > imageWidth) {
        paddedWidth = imageWidth - paddedX;
    }
    if (paddedY + paddedHeight > imageHeight) {
        paddedHeight = imageHeight - paddedY;
    }

    const result = {
        originX: Math.round(paddedX),
        originY: Math.round(paddedY),
        width: Math.round(paddedWidth),
        height: Math.round(paddedHeight)
    };

    console.log('📊 Step 5 - Final crop coordinates (rounded):', result);

    // Validate result
    if (result.originX < 0 || result.originY < 0 ||
        result.width <= 0 || result.height <= 0 ||
        result.originX + result.width > imageWidth ||
        result.originY + result.height > imageHeight) {
        console.error('⚠️ Invalid crop coordinates detected!');
        console.error('Image size:', { width: imageWidth, height: imageHeight });
        console.error('Crop result:', result);
    }

    return result;
}

// Crop image for a single object
export async function cropImageForObject(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    objectName: string
): Promise<string> {
    try {
        console.log('✂️ Starting crop operation for:', objectName);
        console.log('📷 Image URI:', imageUri);

        await ensureCropDirectory();

        // Get actual image dimensions
        const { width: imageWidth, height: imageHeight } = await getImageDimensions(imageUri);

        // Calculate crop coordinates
        const cropCoords = calculateCropCoordinates(boundingBox, imageWidth, imageHeight);

        console.log('✂️ Cropping with coordinates:', cropCoords);

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

        console.log('✅ Crop successful, result URI:', croppedImage.uri);

        // Generate unique filename
        const sanitizedName = objectName
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .substring(0, 30);
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
        console.error('❌ Error cropping image:', error);
        console.error('Stack trace:', error);
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
            console.error(`❌ Failed to crop "${object.name}":`, error);
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