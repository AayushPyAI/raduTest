import winston from 'winston';
import { config } from '@/config/config';
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston.addColors(colors);
const transports: winston.transport[] = [
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
export const logger = winston.createLogger({
    level: config.logging.level,
    levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports,
    exitOnError: false,
});
export const morganStream = {
    write: (message: string) => {
        logger.http(message.substring(0, message.lastIndexOf('\n')));
    },
};
export const patentLogger = {
    searchQuery: (query: string, userId?: string) => {
        logger.info('Patent search query executed', {
            query: query.substring(0, 100), 
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
if (config.nodeEnv === 'development') {
    logger.debug('Logger initialized', {
        level: config.logging.level,
        transports: transports.length,
        nodeEnv: config.nodeEnv,
    });
}
