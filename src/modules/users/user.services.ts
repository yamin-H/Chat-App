import { userRepository } from './user.repository'
import { AppError } from '../../middleware/errorHandler'

export const userService = {

    async getMe(userId: string) {
        const user = await userRepository.findById(userId)
        if (!user) throw new AppError('User not found', 404)
        return user
    },

    async getProfile(username: string) {
        const user = await userRepository.findByUsername(username)
        if (!user) throw new AppError('User not found', 404)
        return user
    },

    async updateMe(userId: string, data: {
        displayName?: string
        bio?: string
        avatarUrl?: string
    }) {
        return userRepository.update(userId, data)
    },

    async search(query: string, excludeUserId: string) {
        if (!query || query.trim().length < 2) {
            throw new AppError('Search query must be at least 2 characters', 400)
        }
        return userRepository.search(query.trim(), excludeUserId)
    },
};