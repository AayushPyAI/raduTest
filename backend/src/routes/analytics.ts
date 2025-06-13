import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { PatentSearchService } from '@/services/patentSearchService';
import { AuthenticatedRequest } from '@/middleware/auth';
import { createValidationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
const router = Router();
const patentSearchService = new PatentSearchService();
const landscapeSchema = z.object({
    query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
    filters: z.object({
        dateRange: z.object({
            start: z.string().optional(),
            end: z.string().optional(),
        }).optional(),
        countries: z.array(z.string()).optional(),
        assignees: z.array(z.string()).optional(),
        classifications: z.array(z.string()).optional(),
    }).optional(),
});
router.post('/landscape', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const validatedData = landscapeSchema.parse(req.body);
        logger.info('Patent landscape request', {
            userId: req.user?.uid,
            query: validatedData.query.substring(0, 100),
        });
        const landscapeData = await patentSearchService.generatePatentLandscape(
            validatedData.query,
            validatedData.filters
        );
        res.json({
            success: true,
            data: landscapeData,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw createValidationError(
                `Validation error: ${error.errors.map(e => e.message).join(', ')}`
            );
        }
        throw error;
    }
}));
export default router;
