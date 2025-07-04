import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { config } from '@/config/config';
const router = Router();
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const healthData = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
        services: {
            api: 'operational',
            bigquery: 'operational',
            pinecone: 'checking',
            openai: 'operational',
        },
        uptime: process.uptime(),
    };
    res.json({
        success: true,
        data: healthData,
    });
}));
export default router;
