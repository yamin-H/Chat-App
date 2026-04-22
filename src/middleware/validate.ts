import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (!result.success) {
            return res.status(400).json({
                error: 'Validation failed',
                issues: result.error.flatten().fieldErrors,
            });
        }

        Object.assign(req, result.data);
        next();
    };
};