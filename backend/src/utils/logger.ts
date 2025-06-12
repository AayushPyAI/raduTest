import winston from 'winston';
import { config } from '@/config/config';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.colorize({ all: true }),
            winston.format.printf(
                (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
        ),
    }),
];

// Add file transport in production
if (config.nodeEnv === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
        })
    );
}

// Create the logger instance
export const logger = winston.createLogger({
    level: config.logging.level,
    levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
});

// Stream object for morgan HTTP logging
export const morganStream = {
    write: (message: string) => {
        logger.http(message.substring(0, message.lastIndexOf('\n')));
    },
};

// Patent search specific logging helpers
export const patentLogger = {
    searchQuery: (query: string, userId?: string) => {
        logger.info('Patent search query executed', {
            query: query.substring(0, 100), // Log first 100 chars for privacy
            userId,
            timestamp: new Date().toISOString(),
        });
    },

    searchResults: (resultCount: number, executionTime: number, userId?: string) => {
        logger.info('Patent search completed', {
            resultCount,
            executionTimeMs: executionTime,
            userId,
            timestamp: new Date().toISOString(),
        });
    },

    bigqueryQuery: (query: string, executionTime: number) => {
        logger.debug('BigQuery executed', {
            query: query.substring(0, 200),
            executionTimeMs: executionTime,
            timestamp: new Date().toISOString(),
        });
    },

    vectorSearch: (dimensions: number, similarity: number, resultCount: number) => {
        logger.debug('Vector search executed', {
            dimensions,
            topSimilarity: similarity,
            resultCount,
            timestamp: new Date().toISOString(),
        });
    },

    embeddingGeneration: (textLength: number, executionTime: number) => {
        logger.debug('Embedding generated', {
            textLength,
            executionTimeMs: executionTime,
            timestamp: new Date().toISOString(),
        });
    },

    error: (error: Error, context?: string, userId?: string) => {
        logger.error('Patent search error', {
            error: error.message,
            stack: error.stack,
            context,
            userId,
            timestamp: new Date().toISOString(),
        });
    },
};

// Development helpers
if (config.nodeEnv === 'development') {
    logger.debug('Logger initialized', {
        level: config.logging.level,
        transports: transports.length,
        nodeEnv: config.nodeEnv,
    });
} 