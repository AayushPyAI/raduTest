import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { PatentResult } from './bigqueryService';

// Patent-specific logger
const patentLogger = {
    embeddingGeneration: (textLength: number, executionTime: number) => logger.info('Generated embedding', { textLength, executionTimeMs: executionTime }),
    vectorSearch: (sparseVectorSize: number, topSimilarity: number, resultCount: number) => logger.info('Vector search completed', { sparseVectorSize, topSimilarity, resultCount }),
    error: (error: Error, context: string, query?: string) => logger.error('Semantic search error', { error: error.message, context, query: query?.substring(0, 100) }),
};

export interface SemanticSearchResult {
    patent_id: string;
    similarity_score: number;
    metadata?: Record<string, any>;
}

export interface EmbeddingResult {
    embedding: { indices: number[]; values: number[] }; // Sparse vector format
    text: string;
    tokens: number;
}

export class SemanticSearchService {
    private pinecone: Pinecone;
    private indexName: string;

    constructor() {
        this.pinecone = new Pinecone({
            apiKey: config.pinecone.apiKey,
        });

        this.indexName = config.pinecone.indexName;

        logger.info('Semantic search service initialized', {
            model: config.pinecone.model,
            indexName: this.indexName,
            type: config.pinecone.type,
            metric: config.pinecone.metric,
            host: config.pinecone.host,
        });
    }

    /**
     * Generate embeddings for text using Pinecone Inference API
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        const startTime = Date.now();

        try {
            // Clean and truncate text
            const cleanText = this.preprocessText(text);

            logger.debug('Generating sparse embedding', {
                textLength: cleanText.length,
                model: config.pinecone.model
            });

            // Use Pinecone Inference API for sparse embeddings
            const embedding = await this.pinecone.inference.embed(
                config.pinecone.model,
                [cleanText],
                { inputType: 'passage' }
            ) as any; // Using any to handle response type issues

            const embeddingData = embedding.data?.[0] as any; // Using any to handle both sparse and dense formats
            if (!embeddingData) {
                throw new Error('No embedding data returned from Pinecone Inference API');
            }

            let sparseVector: { indices: number[]; values: number[] };

            // Handle sparse vector response format
            if (embeddingData.sparseValues && embeddingData.sparseIndices) {
                // Direct sparse format from Pinecone
                sparseVector = {
                    indices: embeddingData.sparseIndices,
                    values: embeddingData.sparseValues,
                };
                logger.debug('Using direct sparse vector format', {
                    nonZeroValues: sparseVector.values.length
                });
            } else if (embeddingData.values) {
                // Dense format - convert to sparse
                sparseVector = this.convertToSparseVector(embeddingData.values);
                logger.debug('Converted dense to sparse vector format', {
                    originalLength: embeddingData.values.length,
                    nonZeroValues: sparseVector.values.length
                });
            } else {
                throw new Error('No valid embedding values returned from Pinecone Inference API');
            }

            patentLogger.embeddingGeneration(cleanText.length, Date.now() - startTime);

            return {
                embedding: sparseVector,
                text: cleanText,
                tokens: cleanText.split(' ').length, // Approximate token count
            };
        } catch (error) {
            patentLogger.error(error as Error, 'Embedding generation failed');
            throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
        }
    }

    /**
     * Convert dense vector to sparse vector format
     */
    private convertToSparseVector(denseVector: number[]): { indices: number[]; values: number[] } {
        const indices: number[] = [];
        const values: number[] = [];

        for (let i = 0; i < denseVector.length; i++) {
            const value = denseVector[i];
            if (value !== undefined && value !== 0) {
                indices.push(i);
                values.push(value);
            }
        }

        return { indices, values };
    }

    /**
     * Search for similar patents using vector similarity
     */
    async searchSimilarPatents(
        queryEmbedding: { indices: number[]; values: number[] },
        topK: number = 50,
        filters?: Record<string, any>
    ): Promise<SemanticSearchResult[]> {
        const startTime = Date.now();

        try {
            const index = this.pinecone.Index(this.indexName);

            logger.debug('Searching similar patents', {
                topK,
                sparseVectorSize: queryEmbedding.values.length,
                filters: filters ? Object.keys(filters) : []
            });

            const queryRequest = {
                topK,
                includeMetadata: true,
                sparseVector: queryEmbedding,
                ...(filters && { filter: filters }),
            } as any; // Type assertion to bypass Pinecone SDK type restrictions for sparse-only queries

            const queryResponse = await index.query(queryRequest);

            const results: SemanticSearchResult[] = queryResponse.matches?.map(match => ({
                patent_id: match.id,
                similarity_score: match.score || 0,
                metadata: match.metadata as Record<string, any>,
            })) || [];

            const topSimilarity = results.length > 0 ? results[0]?.similarity_score || 0 : 0;

            patentLogger.vectorSearch(queryEmbedding.values.length, topSimilarity, results.length);

            logger.debug('Vector search completed', {
                resultsCount: results.length,
                topSimilarity,
                executionTimeMs: Date.now() - startTime,
            });

            return results;
        } catch (error) {
            patentLogger.error(error as Error, 'Vector similarity search failed');
            throw new Error(`Vector search failed: ${(error as Error).message}`);
        }
    }

    /**
     * Perform end-to-end semantic patent search
     */
    async semanticPatentSearch(
        query: string,
        topK: number = 50,
        filters?: Record<string, any>
    ): Promise<SemanticSearchResult[]> {
        try {
            logger.info('Starting semantic patent search', {
                queryLength: query.length,
                topK,
                filters: filters ? Object.keys(filters) : []
            });

            // Generate embedding for the query
            const embeddingResult = await this.generateEmbedding(query);

            // Search for similar patents
            const results = await this.searchSimilarPatents(
                embeddingResult.embedding,
                topK,
                filters
            );

            logger.info('Semantic search completed', {
                resultsCount: results.length,
                tokensUsed: embeddingResult.tokens,
            });

            return results;
        } catch (error) {
            patentLogger.error(error as Error, 'Semantic patent search failed', query);
            throw error;
        }
    }

    /**
     * Store patent embeddings in Pinecone for indexing
     */
    async indexPatentEmbeddings(patents: PatentResult[]): Promise<void> {
        const startTime = Date.now();

        try {
            const index = this.pinecone.Index(this.indexName);
            const batchSize = 100; // Pinecone batch limit

            logger.info('Starting patent embedding indexing', {
                patentCount: patents.length,
                batchSize
            });

            for (let i = 0; i < patents.length; i += batchSize) {
                const batch = patents.slice(i, i + batchSize);
                const vectors = [];

                for (const patent of batch) {
                    try {
                        // Create text for embedding (title + abstract)
                        const patentText = `${patent.title} ${patent.abstract}`.trim();

                        if (!patentText) {
                            logger.warn('Skipping patent with no text content', {
                                patentId: patent.patent_id
                            });
                            continue;
                        }

                        // Generate embedding
                        const embeddingResult = await this.generateEmbedding(patentText);

                        // Prepare vector for Pinecone
                        const vector = {
                            id: patent.patent_id,
                            values: [], // Empty dense vector for sparse-only indexing
                            sparseValues: embeddingResult.embedding,
                            metadata: {
                                title: patent.title,
                                abstract: patent.abstract.substring(0, 1000), // Limit metadata size
                                publication_date: patent.publication_date,
                                assignee: patent.assignee,
                                country_code: patent.country_code,
                                classifications: patent.classifications.slice(0, 10), // Limit array size
                                family_id: patent.family_id,
                                url: patent.url,
                            },
                        };

                        vectors.push(vector);

                        // Small delay to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, 50));

                    } catch (error) {
                        logger.error('Failed to process patent for indexing', {
                            patentId: patent.patent_id,
                            error: (error as Error).message,
                        });
                    }
                }

                if (vectors.length > 0) {
                    await index.upsert(vectors);
                    logger.debug('Indexed patent batch', {
                        batchIndex: Math.floor(i / batchSize) + 1,
                        vectorCount: vectors.length
                    });
                }

                // Longer delay between batches
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            logger.info('Patent embedding indexing completed', {
                totalPatents: patents.length,
                executionTimeMs: Date.now() - startTime,
            });

        } catch (error) {
            patentLogger.error(error as Error, 'Patent embedding indexing failed');
            throw new Error(`Indexing failed: ${(error as Error).message}`);
        }
    }

    /**
     * Check if Pinecone index exists and is ready
     */
    async checkIndexStatus(): Promise<{
        exists: boolean;
        ready: boolean;
        vectorCount?: number;
        indexType?: string;
    }> {
        try {
            const indexList = await this.pinecone.listIndexes();
            const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName) || false;

            if (!indexExists) {
                return { exists: false, ready: false };
            }

            const indexStats = await this.pinecone.Index(this.indexName).describeIndexStats();

            return {
                exists: true,
                ready: indexStats.totalRecordCount !== undefined,
                vectorCount: indexStats.totalRecordCount,
                indexType: config.pinecone.type,
            };

        } catch (error) {
            logger.error('Failed to check index status', { error: (error as Error).message });
            return { exists: false, ready: false };
        }
    }

    /**
     * Create Pinecone index if it doesn't exist
     */
    async createIndex(): Promise<void> {
        try {
            logger.info('Creating Pinecone index', {
                indexName: this.indexName,
                type: config.pinecone.type
            });

            await this.pinecone.createIndex({
                name: this.indexName,
                dimension: 50000, // Max dimension for sparse vectors
                metric: 'dotproduct' as const,
                spec: {
                    serverless: {
                        cloud: 'aws' as const,
                        region: config.pinecone.region,
                    },
                },
            });

            logger.info('Pinecone index created successfully');

        } catch (error) {
            const errorMessage = (error as Error).message;

            if (errorMessage.includes('already exists')) {
                logger.info('Pinecone index already exists');
                return;
            }

            patentLogger.error(error as Error, 'Failed to create Pinecone index');
            throw error;
        }
    }

    /**
     * Delete Pinecone index (for testing/cleanup)
     */
    async deleteIndex(): Promise<void> {
        try {
            await this.pinecone.deleteIndex(this.indexName);
            logger.info('Pinecone index deleted', { indexName: this.indexName });
        } catch (error) {
            patentLogger.error(error as Error, 'Failed to delete Pinecone index');
            throw error;
        }
    }

    /**
     * Preprocess text for embedding generation
     */
    private preprocessText(text: string): string {
        // Remove excessive whitespace and normalize
        let cleaned = text.replace(/\s+/g, ' ').trim();

        // Remove special characters that might interfere with embeddings
        cleaned = cleaned.replace(/[^\w\s\-.,!?;:()\[\]]/g, ' ');

        // Truncate to avoid token limits (approximately 8000 tokens = 32000 characters)
        const maxLength = 30050;
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength) + '...';
        }

        return cleaned;
    }

    /**
     * Get model information
     */
    getModelInfo(): {
        embeddingModel: string;
        indexType: string;
        indexName: string;
        metric: string;
    } {
        return {
            embeddingModel: config.pinecone.model,
            indexType: config.pinecone.type,
            indexName: this.indexName,
            metric: config.pinecone.metric,
        };
    }
} 