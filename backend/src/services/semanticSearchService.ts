import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '@/config/config';
import { logger, patentLogger } from '@/utils/logger';
import { PatentResult } from './bigQueryService';

export interface SemanticSearchResult {
    patent_id: string;
    similarity_score: number;
    metadata?: Record<string, any>;
}

export interface EmbeddingResult {
    embedding: number[];
    text: string;
    tokens: number;
}

export class SemanticSearchService {
    private openai: OpenAI;
    private pinecone: Pinecone;
    private indexName: string;

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey,
        });

        this.pinecone = new Pinecone({
            apiKey: config.pinecone.apiKey,
            environment: config.pinecone.environment,
        });

        this.indexName = config.pinecone.indexName;

        logger.info('Semantic search service initialized', {
            model: config.openai.embeddingModel,
            indexName: this.indexName,
            dimension: config.pinecone.dimension,
        });
    }

    /**
     * Generate embeddings for text using OpenAI
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        const startTime = Date.now();

        try {
            // Clean and truncate text to avoid token limits
            const cleanText = this.preprocessText(text);

            logger.debug('Generating embedding', {
                textLength: cleanText.length,
                model: config.openai.embeddingModel
            });

            const response = await this.openai.embeddings.create({
                model: config.openai.embeddingModel,
                input: cleanText,
            });

            const embedding = response.data[0].embedding;
            const tokens = response.usage?.total_tokens || 0;

            patentLogger.embeddingGeneration(cleanText.length, Date.now() - startTime);

            return {
                embedding,
                text: cleanText,
                tokens,
            };
        } catch (error) {
            patentLogger.error(error as Error, 'Embedding generation failed');
            throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
        }
    }

    /**
     * Search for similar patents using vector similarity
     */
    async searchSimilarPatents(
        queryEmbedding: number[],
        topK: number = 50,
        filters?: Record<string, any>
    ): Promise<SemanticSearchResult[]> {
        const startTime = Date.now();

        try {
            const index = this.pinecone.Index(this.indexName);

            logger.debug('Searching similar patents', {
                topK,
                dimension: queryEmbedding.length,
                filters: filters ? Object.keys(filters) : []
            });

            const queryRequest = {
                vector: queryEmbedding,
                topK,
                includeMetadata: true,
                filter: filters,
            };

            const queryResponse = await index.query(queryRequest);

            const results: SemanticSearchResult[] = queryResponse.matches?.map(match => ({
                patent_id: match.id,
                similarity_score: match.score || 0,
                metadata: match.metadata as Record<string, any>,
            })) || [];

            const topSimilarity = results.length > 0 ? results[0].similarity_score : 0;

            patentLogger.vectorSearch(
                queryEmbedding.length,
                topSimilarity,
                results.length
            );

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
                            values: embeddingResult.embedding,
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
        dimension?: number;
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
                ready: indexStats.totalVectorCount !== undefined,
                vectorCount: indexStats.totalVectorCount,
                dimension: indexStats.dimension,
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
                dimension: config.pinecone.dimension
            });

            await this.pinecone.createIndex({
                name: this.indexName,
                dimension: config.pinecone.dimension,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1',
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
        const maxLength = 30000;
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength) + '...';
        }

        return cleaned;
    }

    /**
     * Get embedding dimension for validation
     */
    getDimension(): number {
        return config.pinecone.dimension;
    }

    /**
     * Get model information
     */
    getModelInfo(): {
        embeddingModel: string;
        dimension: number;
        indexName: string;
    } {
        return {
            embeddingModel: config.openai.embeddingModel,
            dimension: config.pinecone.dimension,
            indexName: this.indexName,
        };
    }
} 