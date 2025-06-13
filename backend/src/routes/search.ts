import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/middleware/errorHandler';
import { PatentSearchService } from '@/services/patentSearchService';
import { AuthenticatedRequest } from '@/middleware/auth';
import { createValidationError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { SemanticSearchService } from '@/services/semanticSearchService';

const router = Router();
const patentSearchService = new PatentSearchService();

// Validation schemas
const semanticSearchSchema = z.object({
    query: z.string().min(1, 'Query is required').max(5000, 'Query too long'),
    searchType: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
    limit: z.number().min(1).max(100).default(50),
    minSimilarity: z.number().min(0).max(1).default(0.7),
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

const relatedPatentsSchema = z.object({
    patentId: z.string().min(1, 'Patent ID is required'),
});

// POST /api/search/semantic
router.post('/semantic', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Validate request body
        const validatedData = semanticSearchSchema.parse(req.body);

        logger.info('Semantic search request', {
            userId: req.user?.uid,
            query: validatedData.query.substring(0, 100),
            searchType: validatedData.searchType,
            limit: validatedData.limit,
        });

        // Perform search
        const searchResult = await patentSearchService.searchPatents({
            query: validatedData.query,
            searchType: validatedData.searchType,
            filters: validatedData.filters,
            limit: validatedData.limit,
            minSimilarity: validatedData.minSimilarity,
        });

        res.json({
            success: true,
            data: searchResult,
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

// GET /api/search/related/:patentId
router.get('/related/:patentId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { patentId } = relatedPatentsSchema.parse({ patentId: req.params.patentId });

        logger.info('Related patents request', {
            userId: req.user?.uid,
            patentId,
        });

        const relatedPatents = await patentSearchService.getRelatedPatents(patentId);

        res.json({
            success: true,
            data: {
                patent_id: patentId,
                related_patents: relatedPatents,
                total_citing: relatedPatents.citing.length,
                total_cited: relatedPatents.cited.length,
                total_similar: relatedPatents.similar.length,
            },
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

// POST /api/search/quick
router.post('/quick', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { query } = z.object({
            query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
        }).parse(req.body);

        logger.info('Quick search request', {
            userId: req.user?.uid,
            query: query.substring(0, 100),
        });

        // Perform lightweight keyword search for quick results
        const searchResult = await patentSearchService.searchPatents({
            query,
            searchType: 'keyword',
            limit: 20,
        });

        res.json({
            success: true,
            data: {
                results: searchResult.results,
                total_results: searchResult.total_results,
                search_time_ms: searchResult.search_time_ms,
            },
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

// GET /api/search/suggestions
router.get('/suggestions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { q } = z.object({
            q: z.string().min(1, 'Query parameter q is required'),
        }).parse(req.query);

        logger.debug('Search suggestions request', {
            userId: req.user?.uid,
            query: q,
        });

        // Simple suggestions based on common patent terms
        const suggestions = generateSearchSuggestions(q);

        res.json({
            success: true,
            data: {
                query: q,
                suggestions,
            },
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

// GET /api/search/status
router.get('/status', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    logger.debug('Search service status request', {
        userId: req.user?.uid,
    });

    const systemStatus = await patentSearchService.getSystemStatus();

    res.json({
        success: true,
        data: systemStatus,
        timestamp: new Date().toISOString(),
    });
}));

// POST /api/search/batch
router.post('/batch', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { queries } = z.object({
            queries: z.array(z.string().min(1).max(1000)).min(1).max(10),
        }).parse(req.body);

        logger.info('Batch search request', {
            userId: req.user?.uid,
            queryCount: queries.length,
        });

        // Execute all searches in parallel
        const searchPromises = queries.map(async (query, index) => {
            try {
                const result = await patentSearchService.searchPatents({
                    query,
                    searchType: 'hybrid',
                    limit: 10, // Smaller limit for batch requests
                });

                return {
                    query,
                    index,
                    success: true,
                    data: result,
                };
            } catch (error) {
                return {
                    query,
                    index,
                    success: false,
                    error: (error as Error).message,
                };
            }
        });

        const results = await Promise.all(searchPromises);

        res.json({
            success: true,
            data: {
                results,
                total_queries: queries.length,
                successful_queries: results.filter(r => r.success).length,
            },
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

// Helper function to generate search suggestions
function generateSearchSuggestions(query: string): string[] {
    const commonPatentTerms = [
        'machine learning',
        'artificial intelligence',
        'neural network',
        'semiconductor',
        'wireless communication',
        'data processing',
        'user interface',
        'authentication',
        'encryption',
        'sensor',
        'battery',
        'pharmaceutical',
        'medical device',
        'automotive',
        'renewable energy',
        'cloud computing',
        'blockchain',
        'autonomous vehicle',
        'robotics',
        'quantum computing',
    ];

    const queryLower = query.toLowerCase();

    // Filter terms that match the query
    const suggestions = commonPatentTerms
        .filter(term => term.includes(queryLower) || queryLower.includes(term.split(' ')[0] || ''))
        .slice(0, 8);

    // Add technology variations if specific terms are found
    if (queryLower.includes('ai') || queryLower.includes('artificial')) {
        suggestions.push('deep learning', 'computer vision', 'natural language processing');
    }

    if (queryLower.includes('mobile') || queryLower.includes('phone')) {
        suggestions.push('mobile device', 'smartphone', 'mobile application');
    }

    if (queryLower.includes('security')) {
        suggestions.push('cybersecurity', 'data security', 'network security');
    }

    return [...new Set(suggestions)].slice(0, 8); // Remove duplicates and limit
}

export default router; 