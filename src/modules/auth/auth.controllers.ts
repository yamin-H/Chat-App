import { Request, Response } from 'express'
import { authService } from './auth.services'

export const authController = {

    async register(req: Request, res: Response) {
        const result = await authService.register(req.body)
        res.status(201).json(result)
    },

    async login(req: Request, res: Response) {
        const result = await authService.login(req.body, req.ip)
        res.json(result)
    },

    async refresh(req: Request, res: Response) {
        const result = await authService.refresh(req.body.refreshToken)
        res.json(result)
    },

    async logout(req: Request, res: Response) {
        await authService.logout(req.body.refreshToken)
        res.json({ message: 'Logged out successfully' })
    },

    async wsToken(req: Request, res: Response) {
        const result = await authService.getWsToken(req.userId)
        res.json(result)
    },
};