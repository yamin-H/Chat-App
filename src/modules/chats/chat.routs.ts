import { Router } from 'express'
import { chatController } from './chat.controllers'
import { authenticate }   from '../../middleware/authenticate'
import { validate }       from '../../middleware/validate'
import { asyncHandler }   from '../../utils/asyncHandler'
import { createDirectChatSchema, markReadSchema } from './chat.schema'

const router = Router()
router.use(authenticate)

router.get('/', asyncHandler(chatController.getMyChats))
router.post('/direct',validate(createDirectChatSchema), asyncHandler(chatController.createDirectChat))
router.get('/:chatId', asyncHandler(chatController.getChatById))
router.post('/:chatId/read', validate(markReadSchema), asyncHandler(chatController.markAsRead))

export default router