import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export class AppError extends Error implements ApiError {
    public statusCode: number;
    public isOperational: boolean;
    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
export const errorHandler = (
    err: ApiError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let isOperational = err.isOperational || false;
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        isOperational = true;
    }
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        isOperational = true;
    }
    if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized access';
        isOperational = true;
    }
    if (err.message.includes('BigQuery')) {
        statusCode = 503;
        message = 'Database service temporarily unavailable';
        isOperational = true;
    }
    if (err.message.includes('OpenAI') || err.message.includes('embedding')) {
        statusCode = 503;
        message = 'AI service temporarily unavailable';
        isOperational = true;
    }
    if (err.message.includes('Pinecone') || err.message.includes('vector')) {
        statusCode = 503;
        message = 'Vector search service temporarily unavailable';
        isOperational = true;
    }
    if (err.message.includes('rate limit') || err.message.includes('quota')) {
        statusCode = 429;
        message = 'Rate limit exceeded. Please try again later.';
        isOperational = true;
    }
    const errorLog = {
        message: err.message,
        statusCode,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
    };
    if (statusCode >= 500) {
        logger.error('Server Error', errorLog);
    } else {
        logger.warn('Client Error', errorLog);
    }
    const errorResponse: any = {
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString(),
        },
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
        errorResponse.error.details = err.message;
    }
    if (res.locals.requestId) {
        errorResponse.error.requestId = res.locals.requestId;
    }
    res.status(statusCode).json(errorResponse);
};
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        404
    );
    next(error);
};
export const createValidationError = (message: string): AppError => {
    return new AppError(message, 400);
};
export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
    return new AppError(message, 401);
};
export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
    return new AppError(message, 403);
};
export const createServiceUnavailableError = (message: string): AppError => {
    return new AppError(message, 503);
};
