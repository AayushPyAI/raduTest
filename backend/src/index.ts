import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';

// Import routes
import searchRoutes from '@/routes/search';
import analyticsRoutes from '@/routes/analytics';
import healthRoutes from '@/routes/health';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv !== 'test') {
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }));
}

// Health check route (no auth required)
app.use('/api/health', healthRoutes);

// Apply authentication middleware to protected routes
app.use('/api/search', authMiddleware);
app.use('/api/analytics', authMiddleware);

// API routes
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Patent Semantic Search API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start server
if (config.nodeEnv !== 'test') {
    app.listen(PORT, () => {
        logger.info(`🚀 Patent Search API server running on port ${PORT}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`🔍 BigQuery Dataset: ${config.bigquery.dataset}`);
        logger.info(`🧠 AI Model: ${config.openai.model}`);
    });
}

export default app; 