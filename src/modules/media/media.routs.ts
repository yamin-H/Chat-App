import { Router }          from 'express'
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import { asyncHandler }    from '../../utils/asyncHandler'
import { uploadMiddleware, mediaController } from './media.controllers';

const router = Router()

router.use(authenticate)

router.post(
    '/upload',
    rateLimiter(20, 60),      // 20 uploads per minute per user
    uploadMiddleware,
    asyncHandler(mediaController.upload)
);

export default router