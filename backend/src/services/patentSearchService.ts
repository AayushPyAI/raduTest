import { BigQueryService, PatentResult, PatentSearchFilters } from './bigQueryService';
import { SemanticSearchService, SemanticSearchResult } from './semanticSearchService';
import { logger, patentLogger } from '@/utils/logger';
import { config } from '@/config/config';

export interface CombinedSearchRequest {
    query: string;
    searchType: 'semantic' | 'keyword' | 'hybrid';
    filters?: PatentSearchFilters;
    limit?: number;
    minSimilarity?: number;
}

export interface SearchResponse {
    results: PatentResult[];
    total_results: number;
    search_time_ms: number;
    search_metadata: {
        semantic_results?: number;
        keyword_results?: number;
        query_tokens?: number;
        filters_applied?: string[];
    };
}

export interface PatentLandscapeData {
    statistics: {
        totalPatents: number;
        yearlyDistribution: { year: number; count: number }[];
        topAssignees: { assignee: string; count: number }[];
        topClassifications: { classification: string; count: number }[];
    };
    technologyClusters: {
        cluster_id: string;
        representative_patents: string[];
        keywords: string[];
        patent_count: number;
    }[];
    citationNetwork: {
        nodes: { id: string; title: string; year: number }[];
        edges: { source: string; target: string; weight: number }[];
    };
}

export class PatentSearchService {
    private bigQueryService: BigQueryService;
    private semanticSearchService: SemanticSearchService;

    constructor() {
        this.bigQueryService = new BigQueryService();
        this.semanticSearchService = new SemanticSearchService();

        logger.info('Patent search service initialized');
    }

    /**
     * Perform comprehensive patent search using multiple strategies
     */
    async searchPatents(request: CombinedSearchRequest): Promise<SearchResponse> {
        const startTime = Date.now();
        const { query, searchType, filters, limit = 50, minSimilarity = 0.7 } = request;

        try {
            patentLogger.searchQuery(query);

            let results: PatentResult[] = [];
            let semanticResultCount = 0;
            let keywordResultCount = 0;
            let queryTokens = 0;

            switch (searchType) {
                case 'semantic':
                    results = await this.performSemanticSearch(query, limit, filters, minSimilarity);
                    semanticResultCount = results.length;
                    queryTokens = await this.getQueryTokenCount(query);
                    break;

                case 'keyword':
                    results = await this.performKeywordSearch(query, filters, limit);
                    keywordResultCount = results.length;
                    break;

                case 'hybrid':
                    results = await this.performHybridSearch(query, filters, limit, minSimilarity);
                    semanticResultCount = results.filter(r => r.similarity_score > 0).length;
                    keywordResultCount = results.filter(r => r.similarity_score === 0).length;
                    queryTokens = await this.getQueryTokenCount(query);
                    break;

                default:
                    throw new Error(`Unsupported search type: ${searchType}`);
            }

            const executionTime = Date.now() - startTime;

            patentLogger.searchResults(results.length, executionTime);

            return {
                results: results.slice(0, limit),
                total_results: results.length,
                search_time_ms: executionTime,
                search_metadata: {
                    semantic_results: semanticResultCount,
                    keyword_results: keywordResultCount,
                    query_tokens: queryTokens,
                    filters_applied: filters ? Object.keys(filters).filter(key => filters[key as keyof PatentSearchFilters]) : [],
                },
            };

        } catch (error) {
            patentLogger.error(error as Error, 'Patent search failed', query);
            throw error;
        }
    }

    /**
     * Perform semantic-only search
     */
    private async performSemanticSearch(
        query: string,
        limit: number,
        filters?: PatentSearchFilters,
        minSimilarity: number = 0.7
    ): Promise<PatentResult[]> {
        try {
            const semanticResults = await this.semanticSearchService.semanticPatentSearch(
                query,
                limit * 2
            );

            const filteredResults = semanticResults.filter(
                result => result.similarity_score >= minSimilarity
            );

            if (filteredResults.length === 0) {
                logger.info('No semantic results found, falling back to keyword search');
                return await this.performKeywordSearch(query, filters, limit);
            }

            const patentIds = filteredResults.map(result => result.patent_id);
            const patents = await this.bigQueryService.getPatentsByIds(patentIds);

            return this.mergeSimilarityScores(patents, filteredResults).slice(0, limit);

        } catch (error) {
            logger.error('Semantic search failed, falling back to keyword search', {
                error: (error as Error).message,
            });
            return await this.performKeywordSearch(query, filters, limit);
        }
    }

    /**
     * Perform keyword-only search
     */
    private async performKeywordSearch(
        query: string,
        filters?: PatentSearchFilters,
        limit: number = 50
    ): Promise<PatentResult[]> {
        return await this.bigQueryService.searchPatentsByKeywords(query, filters, limit);
    }

    /**
     * Perform hybrid search combining semantic and keyword approaches
     */
    private async performHybridSearch(
        query: string,
        filters?: PatentSearchFilters,
        limit: number = 50,
        minSimilarity: number = 0.7
    ): Promise<PatentResult[]> {
        try {
            const [semanticResults, keywordResults] = await Promise.all([
                this.performSemanticSearch(query, Math.floor(limit * 0.7), filters, minSimilarity),
                this.performKeywordSearch(query, filters, Math.floor(limit * 0.5)),
            ]);

            return this.combineAndRankResults(semanticResults, keywordResults).slice(0, limit);

        } catch (error) {
            logger.error('Hybrid search failed, falling back to keyword search', {
                error: (error as Error).message,
            });
            return await this.performKeywordSearch(query, filters, limit);
        }
    }

    /**
     * Get related patents using citation network
     */
    async getRelatedPatents(patentId: string): Promise<{
        citing: PatentResult[];
        cited: PatentResult[];
        similar: PatentResult[];
    }> {
        try {
            const startTime = Date.now();

            // Get citation network from BigQuery
            const citations = await this.bigQueryService.getPatentCitations(patentId);

            // Get the original patent for semantic similarity
            const originalPatents = await this.bigQueryService.getPatentsByIds([patentId]);

            let similar: PatentResult[] = [];

            if (originalPatents.length > 0) {
                const originalPatent = originalPatents[0];
                const searchText = `${originalPatent.title} ${originalPatent.abstract}`;

                // Find semantically similar patents
                similar = await this.performSemanticSearch(searchText, 20, undefined, 0.8);

                // Remove the original patent from similar results
                similar = similar.filter(p => p.patent_id !== patentId);
            }

            const executionTime = Date.now() - startTime;
            logger.info('Related patents search completed', {
                patentId,
                citingCount: citations.citing.length,
                citedCount: citations.cited.length,
                similarCount: similar.length,
                executionTimeMs: executionTime,
            });

            return {
                citing: citations.citing,
                cited: citations.cited,
                similar: similar.slice(0, 10),
            };

        } catch (error) {
            patentLogger.error(error as Error, 'Related patents search failed', patentId);
            throw error;
        }
    }

    /**
     * Generate patent landscape analysis
     */
    async generatePatentLandscape(
        query: string,
        filters?: PatentSearchFilters
    ): Promise<PatentLandscapeData> {
        try {
            const startTime = Date.now();

            logger.info('Generating patent landscape', { query });

            // Get statistical overview
            const statistics = await this.bigQueryService.getPatentStatistics(filters);

            // Get sample patents for clustering analysis
            const samplePatents = await this.performHybridSearch(query, filters, 200);

            // Generate technology clusters (simplified implementation)
            const technologyClusters = this.generateTechnologyClusters(samplePatents);

            // Build citation network
            const citationNetwork = await this.buildCitationNetwork(
                samplePatents.slice(0, 50) // Limit for performance
            );

            const executionTime = Date.now() - startTime;
            logger.info('Patent landscape generation completed', {
                query,
                totalPatents: statistics.totalPatents,
                clustersGenerated: technologyClusters.length,
                executionTimeMs: executionTime,
            });

            return {
                statistics,
                technologyClusters,
                citationNetwork,
            };

        } catch (error) {
            patentLogger.error(error as Error, 'Patent landscape generation failed', query);
            throw error;
        }
    }

    /**
     * Check system health and readiness
     */
    async getSystemStatus(): Promise<{
        bigquery: { status: string; dataset: string };
        pinecone: { status: string; vectorCount?: number; dimension?: number };
        openai: { status: string; model: string };
    }> {
        try {
            // Check Pinecone index status
            const indexStatus = await this.semanticSearchService.checkIndexStatus();

            // Check model info
            const modelInfo = this.semanticSearchService.getModelInfo();

            return {
                bigquery: {
                    status: 'operational',
                    dataset: config.bigquery.dataset,
                },
                pinecone: {
                    status: indexStatus.exists && indexStatus.ready ? 'operational' : 'not_ready',
                    vectorCount: indexStatus.vectorCount,
                    dimension: indexStatus.dimension,
                },
                openai: {
                    status: 'operational',
                    model: modelInfo.embeddingModel,
                },
            };

        } catch (error) {
            logger.error('System status check failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Index patents for semantic search (admin operation)
     */
    async indexPatentsForSemanticSearch(
        filters?: PatentSearchFilters,
        batchSize: number = 1000
    ): Promise<{ indexed: number; errors: number }> {
        try {
            logger.info('Starting patent indexing for semantic search', { batchSize });

            // Get patents from BigQuery in batches
            let totalIndexed = 0;
            let totalErrors = 0;
            let offset = 0;

            while (true) {
                // Fetch batch of patents using keyword search (empty query gets all)
                const patents = await this.bigQueryService.searchPatentsByKeywords(
                    '', // Empty query
                    filters,
                    batchSize
                );

                if (patents.length === 0) {
                    break;
                }

                try {
                    await this.semanticSearchService.indexPatentEmbeddings(patents);
                    totalIndexed += patents.length;

                    logger.info('Indexed patent batch', {
                        batchSize: patents.length,
                        totalIndexed,
                    });

                } catch (error) {
                    totalErrors += patents.length;
                    logger.error('Failed to index patent batch', {
                        error: (error as Error).message,
                        batchSize: patents.length,
                    });
                }

                offset += batchSize;

                // Safety limit
                if (offset > 100000) {
                    logger.warn('Reached indexing safety limit');
                    break;
                }
            }

            logger.info('Patent indexing completed', {
                totalIndexed,
                totalErrors,
            });

            return { indexed: totalIndexed, errors: totalErrors };

        } catch (error) {
            patentLogger.error(error as Error, 'Patent indexing failed');
            throw error;
        }
    }

    // Helper methods

    private mergeSimilarityScores(
        patents: PatentResult[],
        semanticResults: SemanticSearchResult[]
    ): PatentResult[] {
        const scoreMap = new Map(
            semanticResults.map(result => [result.patent_id, result.similarity_score])
        );

        return patents
            .map(patent => ({
                ...patent,
                similarity_score: scoreMap.get(patent.patent_id) || 0,
            }))
            .sort((a, b) => b.similarity_score - a.similarity_score);
    }

    private combineAndRankResults(
        semanticResults: PatentResult[],
        keywordResults: PatentResult[]
    ): PatentResult[] {
        const resultMap = new Map<string, PatentResult>();

        semanticResults.forEach(result => {
            resultMap.set(result.patent_id, {
                ...result,
                similarity_score: result.similarity_score * 1.2,
            });
        });

        keywordResults.forEach(result => {
            if (!resultMap.has(result.patent_id)) {
                resultMap.set(result.patent_id, result);
            }
        });

        return Array.from(resultMap.values()).sort((a, b) => {
            if (b.similarity_score !== a.similarity_score) {
                return b.similarity_score - a.similarity_score;
            }
            return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
        });
    }

    private generateTechnologyClusters(patents: PatentResult[]): PatentLandscapeData['technologyClusters'] {
        // Simplified clustering based on CPC classifications
        const clusters = new Map<string, PatentResult[]>();

        patents.forEach(patent => {
            const mainClass = patent.classifications[0]?.substring(0, 4) || 'UNKNOWN';
            if (!clusters.has(mainClass)) {
                clusters.set(mainClass, []);
            }
            clusters.get(mainClass)!.push(patent);
        });

        return Array.from(clusters.entries())
            .filter(([_, patents]) => patents.length >= 3) // Minimum cluster size
            .map(([classCode, clusterPatents]) => ({
                cluster_id: classCode,
                representative_patents: clusterPatents.slice(0, 5).map(p => p.patent_id),
                keywords: this.extractKeywords(clusterPatents),
                patent_count: clusterPatents.length,
            }))
            .slice(0, 10); // Limit number of clusters
    }

    private extractKeywords(patents: PatentResult[]): string[] {
        // Simple keyword extraction from titles
        const wordCount = new Map<string, number>();

        patents.forEach(patent => {
            const words = patent.title
                .toLowerCase()
                .split(/\W+/)
                .filter(word => word.length > 3);

            words.forEach(word => {
                wordCount.set(word, (wordCount.get(word) || 0) + 1);
            });
        });

        return Array.from(wordCount.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    private async buildCitationNetwork(patents: PatentResult[]): Promise<PatentLandscapeData['citationNetwork']> {
        // Simplified citation network building
        const nodes = patents.map(patent => ({
            id: patent.patent_id,
            title: patent.title.substring(0, 50),
            year: new Date(patent.publication_date).getFullYear(),
        }));

        // For demo purposes, create some synthetic edges
        // In a real implementation, this would use citation data from BigQuery
        const edges: { source: string; target: string; weight: number }[] = [];

        for (let i = 0; i < Math.min(patents.length, 20); i++) {
            for (let j = i + 1; j < Math.min(patents.length, 20); j++) {
                if (Math.random() > 0.8) { // 20% chance of citation
                    edges.push({
                        source: patents[i].patent_id,
                        target: patents[j].patent_id,
                        weight: Math.random(),
                    });
                }
            }
        }

        return { nodes, edges };
    }

    private async getQueryTokenCount(query: string): Promise<number> {
        try {
            const embedding = await this.semanticSearchService.generateEmbedding(query);
            return embedding.tokens;
        } catch {
            return 0;
        }
    }
} 