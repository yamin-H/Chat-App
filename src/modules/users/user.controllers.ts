import { Request, Response } from 'express'
import { userService } from './user.services'

export const userController = {

  async getMe(req: Request, res: Response) {
    const user = await userService.getMe(req.userId)
    res.json(user)
  },

  async updateMe(req: Request, res: Response) {
    const user = await userService.updateMe(req.userId, req.body)
    res.json(user)
  },

    async getProfile(req: Request, res: Response) {
        const username = req.params.username as string;
        const user = await userService.getProfile(username);
        res.json(user);
  },

  async search(req: Request, res: Response) {
    const users = await userService.search(
      req.query.q as string,
      req.userId
    )
    res.json(users)
  },
}