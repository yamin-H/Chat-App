import { Router } from 'express'
import { userController } from './user.controllers'
import { authenticate }   from '../../middleware/authenticate'
import { validate }       from '../../middleware/validate'
import { asyncHandler }   from '../../utils/asyncHandler'
import { updateProfileSchema, searchSchema } from './user.schema'

const router = Router()
router.use(authenticate)

router.get('/me', asyncHandler(userController.getMe))
router.patch('/me', validate(updateProfileSchema), asyncHandler(userController.updateMe))
router.get('/search', validate(searchSchema), asyncHandler(userController.search))
router.get('/:username', asyncHandler(userController.getProfile))

export default router