// app/utils/imageCropper.ts - FINAL FIX: No Rotation + New API

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';

const CROPS_DIR = `${FileSystem.documentDirectory}siyensyago_crops/`;
const PADDING_PERCENTAGE = 0.05; // 5% padding
const MAX_CROP_SIZE = 1200;
const JPEG_QUALITY = 0.85;

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
                console.log(`📐 Image dimensions from Image.getSize: ${width}x${height}`);
                resolve({ width, height });
            },
            (error) => {
                console.error('❌ Error getting image dimensions:', error);
                reject(error);
            }
        );
    });
}

// 🔧 SIMPLIFIED: Direct percentage to pixel conversion
// No rotation, no complex calculations - just straight mapping
function calculateCropCoordinates(
    boundingBox: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
): { originX: number; originY: number; width: number; height: number } {

    console.log('📊 INPUT - Bounding Box (percentages):', boundingBox);
    console.log('📊 INPUT - Image dimensions:', { width: imageWidth, height: imageHeight });

    // Step 1: Direct percentage to pixel conversion
    // Gemini returns percentages relative to the image as it was analyzed
    const xPixel = (boundingBox.x / 100) * imageWidth;
    const yPixel = (boundingBox.y / 100) * imageHeight;
    const widthPixel = (boundingBox.width / 100) * imageWidth;
    const heightPixel = (boundingBox.height / 100) * imageHeight;

    console.log('📊 STEP 1 - Pixels (no padding):', {
        x: xPixel,
        y: yPixel,
        width: widthPixel,
        height: heightPixel
    });

    // Step 2: Add padding (5% on each side)
    const paddingX = widthPixel * PADDING_PERCENTAGE;
    const paddingY = heightPixel * PADDING_PERCENTAGE;

    console.log('📊 STEP 2 - Padding amounts:', { paddingX, paddingY });

    // Step 3: Apply padding with boundary protection
    let cropX = Math.max(0, xPixel - paddingX);
    let cropY = Math.max(0, yPixel - paddingY);
    let cropWidth = widthPixel + (paddingX * 2);
    let cropHeight = heightPixel + (paddingY * 2);

    // Ensure we don't exceed image bounds
    if (cropX + cropWidth > imageWidth) {
        cropWidth = imageWidth - cropX;
    }
    if (cropY + cropHeight > imageHeight) {
        cropHeight = imageHeight - cropY;
    }

    console.log('📊 STEP 3 - With padding (before rounding):', {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
    });

    // Step 4: Round to integers
    const result = {
        originX: Math.round(cropX),
        originY: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };

    console.log('📊 FINAL - Crop coordinates (integers):', result);

    // Validate
    if (result.originX < 0 || result.originY < 0 ||
        result.width <= 0 || result.height <= 0 ||
        result.originX + result.width > imageWidth ||
        result.originY + result.height > imageHeight) {
        console.error('⚠️ INVALID CROP COORDINATES!');
        console.error('Image bounds:', { width: imageWidth, height: imageHeight });
        console.error('Crop attempt:', result);
        throw new Error('Invalid crop coordinates - would exceed image bounds');
    }

    return result;
}

// 🔧 MAIN FUNCTION: Using new non-deprecated API
export async function cropImageForObject(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    objectName: string
): Promise<string> {
    try {
        console.log('\n✂️ ===== CROP OPERATION START =====');
        console.log('📷 Object:', objectName);
        console.log('📷 Image URI:', imageUri);
        console.log('📦 Bounding Box:', boundingBox);

        await ensureCropDirectory();

        // Get original image dimensions
        const { width: imageWidth, height: imageHeight } = await getImageDimensions(imageUri);

        // Calculate crop coordinates
        const cropCoords = calculateCropCoordinates(boundingBox, imageWidth, imageHeight);

        console.log('✂️ Executing crop with coordinates:', cropCoords);

        // 🔧 NEW: Use the new non-deprecated API
        const manipulator = await ImageManipulator.manipulate(imageUri);

        // Apply crop
        const croppedManipulator = manipulator.crop({
            originX: cropCoords.originX,
            originY: cropCoords.originY,
            width: cropCoords.width,
            height: cropCoords.height
        });

        // Apply resize if needed (to keep file size reasonable)
        const maxDimension = Math.max(cropCoords.width, cropCoords.height);
        let finalManipulator = croppedManipulator;

        if (maxDimension > MAX_CROP_SIZE) {
            const scale = MAX_CROP_SIZE / maxDimension;
            const newWidth = Math.round(cropCoords.width * scale);
            const newHeight = Math.round(cropCoords.height * scale);

            console.log(`📐 Resizing to: ${newWidth}x${newHeight} (scale: ${scale.toFixed(2)})`);

            finalManipulator = croppedManipulator.resize({
                width: newWidth,
                height: newHeight
            });
        }

        // Save with compression
        const result = await finalManipulator.renderAsync({
            compress: JPEG_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG
        });

        console.log('✅ Crop successful!');
        console.log('📸 Result URI:', result.uri);
        console.log('📐 Result dimensions:', { width: result.width, height: result.height });

        // Save to permanent storage
        const sanitizedName = objectName
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .substring(0, 30);
        const timestamp = Date.now();
        const filename = `${sanitizedName}_${timestamp}.jpg`;
        const permanentUri = `${CROPS_DIR}${filename}`;

        await FileSystem.copyAsync({
            from: result.uri,
            to: permanentUri
        });

        console.log(`✓ Saved to permanent storage: ${filename}`);
        console.log('✂️ ===== CROP OPERATION END =====\n');

        return permanentUri;

    } catch (error) {
        console.error('\n❌ ===== CROP OPERATION FAILED =====');
        console.error('Error:', error);
        console.error('Object:', objectName);
        console.error('Bounding box:', boundingBox);
        console.error('⚠️ Falling back to original image');
        console.error('===== ERROR END =====\n');

        // Fallback to original image
        return imageUri;
    }
}

// Batch crop multiple objects
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

// Clean up old crops
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