import multer from "multer";
import { Request, Response } from "express";
import { mediaService } from "./media.services";
import { AppError } from "../../middleware/errorHandler";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/ogg', 'audio/webm',
            'application/pdf'
        ];

        if (allowed.includes(file.mimetype)) {
            callback(null, true);
        }
        else {
            callback(new AppError(`File type not allowed: ${file.mimetype}`, 400) as any, false)
        }
    }
});

export const uploadMiddleware = upload.single('file');

export const mediaController = {
    async upload(req: Request, res: Response) {
        if (!req.file) {
            throw new AppError('No file provided', 400)
        }

        const chatId = req.body.chatId
        if (!chatId) {
            throw new AppError('chatId is required', 400)
        }

        const result = await mediaService.upload(
            req.file.buffer,
            req.file.mimetype,
            req.userId,
            chatId
        )

        res.json({
            ...result,
            messageType: mediaService.getMesageType(req.file.mimetype),
        })
    }
};