import { Router }          from 'express'
import { groupController } from './group.controllers'
import { authenticate }    from '../../middleware/authenticate'
import { validate }        from '../../middleware/validate'
import { asyncHandler }    from '../../utils/asyncHandler'
import {
  createGroupSchema,
  updateGroupSchema,
  groupIdSchema,
  addMembersSchema,
  removeMemberSchema,
  updateRoleSchema,
  inviteCodeSchema,
} from './group.schema'

const router = Router()
router.use(authenticate)

router.post('/', validate(createGroupSchema), asyncHandler(groupController.createGroup))
router.get('/:groupId', validate(groupIdSchema), asyncHandler(groupController.getGroup))
router.patch('/:groupId', validate(updateGroupSchema), asyncHandler(groupController.updateGroup))
router.post('/:groupId/members',validate(addMembersSchema), asyncHandler(groupController.addMembers))
router.delete('/:groupId/members/:userId', validate(removeMemberSchema), asyncHandler(groupController.removeMember))
router.delete('/:groupId/leave', validate(groupIdSchema), asyncHandler(groupController.leaveGroup))
router.patch('/:groupId/members/:userId/role', validate(updateRoleSchema), asyncHandler(groupController.updateMemberRole))
router.get('/join/:inviteCode', validate(inviteCodeSchema), asyncHandler(groupController.joinByInviteCode))
router.post('/:groupId/invite/reset', validate(groupIdSchema), asyncHandler(groupController.resetInviteCode))

export default router