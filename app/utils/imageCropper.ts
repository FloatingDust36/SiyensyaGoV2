// app/utils/imageCropper.ts - COMPLETE FIX: Use actual file dimensions

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const CROPS_DIR = `${FileSystem.documentDirectory}siyensyago_crops/`;
const PADDING_PERCENTAGE = 0.05;
const MAX_CROP_SIZE = 1200;
const JPEG_QUALITY = 0.85;

async function ensureCropDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(CROPS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CROPS_DIR, { intermediates: true });
        console.log('✓ Created crops directory');
    }
}

// 🔧 CRITICAL FIX: Get dimensions from the actual image file, not Image.getSize
async function getActualImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    try {
        // Use ImageManipulator to get the ACTUAL file dimensions
        // This reads the file directly without any rotation or processing
        const result = await ImageManipulator.manipulateAsync(imageUri, [], {
            format: ImageManipulator.SaveFormat.JPEG,
            compress: 1 // No compression, just read
        });

        console.log(`📐 ACTUAL file dimensions: ${result.width}x${result.height}`);
        return { width: result.width, height: result.height };
    } catch (error) {
        console.error('❌ Error getting image dimensions:', error);
        throw error;
    }
}

function calculateCropCoordinates(
    boundingBox: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
): { originX: number; originY: number; width: number; height: number } {

    console.log('📊 INPUT - Bounding Box (%):', boundingBox);
    console.log('📊 INPUT - Image size:', { width: imageWidth, height: imageHeight });

    // Direct percentage to pixel conversion
    const xPixel = (boundingBox.x / 100) * imageWidth;
    const yPixel = (boundingBox.y / 100) * imageHeight;
    const widthPixel = (boundingBox.width / 100) * imageWidth;
    const heightPixel = (boundingBox.height / 100) * imageHeight;

    console.log('📊 STEP 1 - Pixels (no padding):', {
        x: xPixel.toFixed(1),
        y: yPixel.toFixed(1),
        width: widthPixel.toFixed(1),
        height: heightPixel.toFixed(1)
    });

    // Add padding
    const paddingX = widthPixel * PADDING_PERCENTAGE;
    const paddingY = heightPixel * PADDING_PERCENTAGE;

    let cropX = Math.max(0, xPixel - paddingX);
    let cropY = Math.max(0, yPixel - paddingY);
    let cropWidth = widthPixel + (paddingX * 2);
    let cropHeight = heightPixel + (paddingY * 2);

    // Boundary protection
    if (cropX + cropWidth > imageWidth) {
        cropWidth = imageWidth - cropX;
    }
    if (cropY + cropHeight > imageHeight) {
        cropHeight = imageHeight - cropY;
    }

    const result = {
        originX: Math.round(cropX),
        originY: Math.round(cropY),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight)
    };

    console.log('📊 FINAL - Crop coords:', result);

    // Validate
    if (result.originX < 0 || result.originY < 0 ||
        result.width <= 0 || result.height <= 0 ||
        result.originX + result.width > imageWidth ||
        result.originY + result.height > imageHeight) {
        console.error('⚠️ INVALID CROP!');
        throw new Error('Invalid crop coordinates');
    }

    return result;
}

export async function cropImageForObject(
    imageUri: string,
    boundingBox: { x: number; y: number; width: number; height: number },
    objectName: string
): Promise<string> {
    try {
        console.log('\n✂️ ===== CROP START =====');
        console.log('📷 Object:', objectName);
        console.log('📦 BBox:', boundingBox);

        await ensureCropDirectory();

        // 🔧 CRITICAL: Get ACTUAL file dimensions
        const { width: imageWidth, height: imageHeight } = await getActualImageDimensions(imageUri);

        // Calculate crop
        const cropCoords = calculateCropCoordinates(boundingBox, imageWidth, imageHeight);

        console.log('✂️ Cropping...');

        // Build actions
        const actions: ImageManipulator.Action[] = [
            {
                crop: {
                    originX: cropCoords.originX,
                    originY: cropCoords.originY,
                    width: cropCoords.width,
                    height: cropCoords.height
                }
            }
        ];

        // Resize if needed
        const maxDimension = Math.max(cropCoords.width, cropCoords.height);
        if (maxDimension > MAX_CROP_SIZE) {
            const scale = MAX_CROP_SIZE / maxDimension;
            actions.push({
                resize: {
                    width: Math.round(cropCoords.width * scale),
                    height: Math.round(cropCoords.height * scale)
                }
            });
            console.log(`📐 Will resize by ${(scale * 100).toFixed(0)}%`);
        }

        // Execute
        const result = await ImageManipulator.manipulateAsync(
            imageUri,
            actions,
            {
                compress: JPEG_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        console.log('✅ Cropped!', { width: result.width, height: result.height });

        // Save permanently
        const sanitizedName = objectName
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .substring(0, 30);
        const filename = `${sanitizedName}_${Date.now()}.jpg`;
        const permanentUri = `${CROPS_DIR}${filename}`;

        await FileSystem.copyAsync({
            from: result.uri,
            to: permanentUri
        });

        console.log('✓ Saved:', filename);
        console.log('✂️ ===== CROP END =====\n');

        return permanentUri;

    } catch (error) {
        console.error('\n❌ CROP FAILED:', error);
        console.error('Fallback to original\n');
        return imageUri;
    }
}

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
            console.error(`❌ Failed to crop "${object.name}"`);
            croppedImages.set(object.id, imageUri);
        }
    }

    console.log(`✓ Batch complete: ${croppedImages.size}/${objects.length}`);
    return croppedImages;
}

export async function deleteCroppedImage(croppedUri: string): Promise<void> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(croppedUri);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(croppedUri);
        }
    } catch (error) {
        console.error('Error deleting cropped image:', error);
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

        if (deletedCount > 0) {
            console.log(`✓ Cleaned up ${deletedCount} old crops`);
        }

        return deletedCount;
    } catch (error) {
        console.error('Error cleanup:', error);
        return 0;
    }
}