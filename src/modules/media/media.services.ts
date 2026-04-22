import cloundinary from "../../config/cloudinary";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../../config/logger";

const ALLOWED_TYPES: Record<string, 'image' | 'video' | 'raw'> = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
    'video/mp4': 'video',
    'video/webm': 'video',
    'audio/mpeg': 'raw',
    'audio/ogg': 'raw',
    'audio/webm': 'raw',
    'application/pdf': 'raw'
};

const MAX_SIZES: Record<string, number> = {
    image: 10 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    raw: 25 * 1024 * 1024
};

export interface UploadResult{
    url:          string
    publicId:     string
    resourceType: string
    format:       string
    bytes:        number
    width?:       number
    height?:      number
    duration?:    number
    thumbnailUrl?: string
};

export const mediaService = {
    async upload(
        fileBuffer: Buffer,
        mimeType: string,
        userId: string,
        chatId: string
    ): Promise<UploadResult> {

        const resourceType = ALLOWED_TYPES[mimeType];
        if (!resourceType) {
            throw new AppError(`Unsupported file type: ${mimeType}. Allowed: images, videos, audio, PDF`, 400)
        }

        const maxSize = MAX_SIZES[resourceType];
        if (fileBuffer.byteLength > maxSize) {
            throw new AppError(
                `File too large. Max size for ${resourceType}: ${maxSize / 1024 / 1024}MB`,
                400
            );
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloundinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: `chat/${chatId}`,
                    public_id: `${userId}_${Date.now()}`,
                    
                    eager: resourceType === 'image'
                        ? [{ width: 400, height: 400, crop: 'limit', quality: 'auto:good' }]
                        : resourceType === 'video'
                            ? [{ width: 320, height: 240, crop: 'limit', format: 'jpg' }]
                            : undefined,
                    
                    eager_async: resourceType === 'video'
                },
                (error, result) => {
                    if (error || !result) {
                        logger.error(error, 'Cloudinary upload failed');
                        return reject(new AppError("Upload failed", 500));
                    }

                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        resourceType: result.resource_type,
                        format: result.format,
                        bytes: result.bytes,
                        width: result.width,
                        height: result.height,
                        duration: result.duration,
                        thumbnailUrl: result.eager?.[0]?.secure_url
                    });
                }
            )

            uploadStream.end(fileBuffer);
        })
    },

    async delete(publicId: string, resourceType: 'image' | 'video' | 'raw') {
        try {
            await cloundinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            })
        } catch (err) {
            logger.error(err, `Failed to delete Cloudinary asset: ${publicId}`)
        }
    },

    getMesageType(mimeType: string): string {
        if (mimeType.startsWith('image/')) return 'IMAGE'
        if (mimeType.startsWith('video/')) return 'VIDEO'
        if (mimeType.startsWith('audio/')) return 'AUDIO'
        return 'DOCUMENT'
    }
};