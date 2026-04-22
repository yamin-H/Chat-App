import { Router } from 'express'
import { messageController } from './message.controllers'
import { authenticate }      from '../../middleware/authenticate'
import { validate }          from '../../middleware/validate'
import { asyncHandler }      from '../../utils/asyncHandler'
import {
  sendMessageSchema,
  getMessagesSchema,
  messageIdSchema,
  reactSchema,
} from './message.schema'

const router = Router()
router.use(authenticate)


router.post( '/:chatId/messages', validate(sendMessageSchema), asyncHandler(messageController.send))
router.get(  '/:chatId/messages', validate(getMessagesSchema), asyncHandler(messageController.getMessages))
router.post( '/:chatId/messages/read', asyncHandler(messageController.markAsRead))
router.delete('/messages/:messageId',validate(messageIdSchema), asyncHandler(messageController.deleteMessage))
router.post(  '/messages/:messageId/react', validate(reactSchema), asyncHandler(messageController.reactToMessage))
router.delete('/messages/:messageId/react', validate(messageIdSchema), asyncHandler(messageController.removeReaction))
router.get(   '/messages/:messageId/receipts',validate(messageIdSchema), asyncHandler(messageController.getReceipts))

export default router