import { BigQuery } from '@google-cloud/bigquery';
import { config } from '@/config/config';
import { logger, patentLogger } from '@/utils/logger';

export interface PatentSearchFilters {
    dateRange?: {
        start?: string;
        end?: string;
    };
    countries?: string[];
    assignees?: string[];
    classifications?: string[];
}

export interface PatentResult {
    patent_id: string;
    title: string;
    abstract: string;
    publication_date: string;
    application_date?: string;
    assignee: string;
    inventors: string[];
    country_code: string;
    kind_code: string;
    family_id: string;
    classifications: string[];
    similarity_score: number;
    url: string;
}

interface BigQueryPatent {
    publication_number: string;
    title: string;
    abstract: string;
    publication_date: string;
    application_date?: string;
    assignee: string;
    inventor: string | string[];
    country_code: string;
    kind_code: string;
    family_id: string;
    cpc_codes: string[];
}

export class BigQueryService {
    private bigquery: BigQuery;
    private readonly datasetId: string;
    private readonly projectId: string;

    constructor() {
        this.bigquery = new BigQuery({
            projectId: config.googleCloud.projectId,
            keyFilename: config.googleCloud.keyFilename,
            location: config.bigquery.location,
        });

        this.datasetId = config.bigquery.dataset;
        this.projectId = config.googleCloud.projectId;

        logger.info('BigQuery service initialized', {
            projectId: this.projectId,
            dataset: this.datasetId,
            location: config.bigquery.location,
        });
    }

    /**
     * Search patents by keywords in title and abstract
     */
    async searchPatentsByKeywords(
        keywords: string,
        filters?: PatentSearchFilters,
        limit: number = 100
    ): Promise<PatentResult[]> {
        const startTime = Date.now();

        try {
            const query = this.buildKeywordSearchQuery(keywords, filters, limit);

            logger.debug('Executing BigQuery keyword search', { query: query.substring(0, 200) });

            const [rows] = await this.bigquery.query({
                query,
                location: config.bigquery.location,
            });

            const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

            patentLogger.bigqueryQuery(query, Date.now() - startTime);

            return results;
        } catch (error) {
            patentLogger.error(error as Error, 'BigQuery keyword search failed');
            throw error;
        }
    }

    /**
     * Get patents by publication numbers for semantic similarity ranking
     */
    async getPatentsByIds(patentIds: string[]): Promise<PatentResult[]> {
        const startTime = Date.now();

        try {
            const query = this.buildPatentIdQuery(patentIds);

            const [rows] = await this.bigquery.query({
                query,
                location: config.bigquery.location,
            });

            const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

            patentLogger.bigqueryQuery(query, Date.now() - startTime);

            return results;
        } catch (error) {
            patentLogger.error(error as Error, 'BigQuery patent ID search failed');
            throw error;
        }
    }

    /**
     * Search patents by CPC/IPC classification codes
     */
    async searchPatentsByClassification(
        classifications: string[],
        filters?: PatentSearchFilters,
        limit: number = 100
    ): Promise<PatentResult[]> {
        const startTime = Date.now();

        try {
            const query = this.buildClassificationSearchQuery(classifications, filters, limit);

            const [rows] = await this.bigquery.query({
                query,
                location: config.bigquery.location,
            });

            const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

            patentLogger.bigqueryQuery(query, Date.now() - startTime);

            return results;
        } catch (error) {
            patentLogger.error(error as Error, 'BigQuery classification search failed');
            throw error;
        }
    }

    /**
     * Get patent citation network (forward and backward citations)
     */
    async getPatentCitations(patentId: string): Promise<{
        citing: PatentResult[];
        cited: PatentResult[];
    }> {
        const startTime = Date.now();

        try {
            const [citingQuery, citedQuery] = this.buildCitationQueries(patentId);

            const [citingResults, citedResults] = await Promise.all([
                this.bigquery.query({ query: citingQuery, location: config.bigquery.location }),
                this.bigquery.query({ query: citedQuery, location: config.bigquery.location }),
            ]);

            const citing = this.transformBigQueryResults(citingResults[0] as BigQueryPatent[]);
            const cited = this.transformBigQueryResults(citedResults[0] as BigQueryPatent[]);

            patentLogger.bigqueryQuery(`Citation queries for ${patentId}`, Date.now() - startTime);

            return { citing, cited };
        } catch (error) {
            patentLogger.error(error as Error, 'BigQuery citation search failed');
            throw error;
        }
    }

    /**
     * Get patent statistics for landscape analysis
     */
    async getPatentStatistics(filters?: PatentSearchFilters): Promise<{
        totalPatents: number;
        yearlyDistribution: { year: number; count: number }[];
        topAssignees: { assignee: string; count: number }[];
        topClassifications: { classification: string; count: number }[];
    }> {
        const startTime = Date.now();

        try {
            const queries = this.buildStatisticsQueries(filters);

            const [
                totalResult,
                yearlyResult,
                assigneesResult,
                classificationsResult,
            ] = await Promise.all([
                this.bigquery.query({ query: queries.total, location: config.bigquery.location }),
                this.bigquery.query({ query: queries.yearly, location: config.bigquery.location }),
                this.bigquery.query({ query: queries.assignees, location: config.bigquery.location }),
                this.bigquery.query({ query: queries.classifications, location: config.bigquery.location }),
            ]);

            const result = {
                totalPatents: totalResult[0][0]?.total || 0,
                yearlyDistribution: yearlyResult[0].map((row: any) => ({
                    year: row.year,
                    count: row.count,
                })),
                topAssignees: assigneesResult[0].map((row: any) => ({
                    assignee: row.assignee,
                    count: row.count,
                })),
                topClassifications: classificationsResult[0].map((row: any) => ({
                    classification: row.classification,
                    count: row.count,
                })),
            };

            patentLogger.bigqueryQuery('Patent statistics queries', Date.now() - startTime);

            return result;
        } catch (error) {
            patentLogger.error(error as Error, 'BigQuery statistics query failed');
            throw error;
        }
    }

    private buildKeywordSearchQuery(
        keywords: string,
        filters?: PatentSearchFilters,
        limit: number = 100
    ): string {
        const baseQuery = `
      SELECT 
        p.publication_number,
        p.title,
        p.abstract,
        p.publication_date,
        p.application_date,
        p.assignee,
        p.inventor,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(c.code) as cpc_codes
      FROM \`${this.datasetId}.patents\` p
      LEFT JOIN \`${this.datasetId}.cpc_current\` c 
        ON p.publication_number = c.publication_number
      WHERE 1=1
    `;

        let conditions = '';

        if (keywords.trim()) {
            const searchTerms = keywords.split(' ').filter(term => term.length > 0);
            const titleSearch = searchTerms.map(term =>
                `LOWER(p.title) LIKE LOWER('%${term}%')`
            ).join(' AND ');
            const abstractSearch = searchTerms.map(term =>
                `LOWER(p.abstract) LIKE LOWER('%${term}%')`
            ).join(' AND ');

            conditions += ` AND ((${titleSearch}) OR (${abstractSearch}))`;
        }

        if (filters) {
            conditions += this.buildFilterConditions(filters);
        }

        const groupBy = `
      GROUP BY 
        p.publication_number, p.title, p.abstract, p.publication_date,
        p.application_date, p.assignee, p.inventor, p.country_code,
        p.kind_code, p.family_id
    `;

        const orderBy = `ORDER BY p.publication_date DESC`;
        const limitClause = `LIMIT ${Math.min(limit, config.bigquery.maxResults)}`;

        return `${baseQuery}${conditions}${groupBy} ${orderBy} ${limitClause}`;
    }

    private buildPatentIdQuery(patentIds: string[]): string {
        const idsString = patentIds.map(id => `'${id}'`).join(',');

        return `
      SELECT 
        p.publication_number,
        p.title,
        p.abstract,
        p.publication_date,
        p.application_date,
        p.assignee,
        p.inventor,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(c.code) as cpc_codes
      FROM \`${this.datasetId}.patents\` p
      LEFT JOIN \`${this.datasetId}.cpc_current\` c 
        ON p.publication_number = c.publication_number
      WHERE p.publication_number IN (${idsString})
      GROUP BY 
        p.publication_number, p.title, p.abstract, p.publication_date,
        p.application_date, p.assignee, p.inventor, p.country_code,
        p.kind_code, p.family_id
    `;
    }

    private buildClassificationSearchQuery(
        classifications: string[],
        filters?: PatentSearchFilters,
        limit: number = 100
    ): string {
        const classificationConditions = classifications
            .map(code => `c.code LIKE '${code}%'`)
            .join(' OR ');

        let query = `
      SELECT 
        p.publication_number,
        p.title,
        p.abstract,
        p.publication_date,
        p.application_date,
        p.assignee,
        p.inventor,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(c.code) as cpc_codes
      FROM \`${this.datasetId}.patents\` p
      INNER JOIN \`${this.datasetId}.cpc_current\` c 
        ON p.publication_number = c.publication_number
      WHERE (${classificationConditions})
    `;

        if (filters) {
            query += this.buildFilterConditions(filters);
        }

        query += `
      GROUP BY 
        p.publication_number, p.title, p.abstract, p.publication_date,
        p.application_date, p.assignee, p.inventor, p.country_code,
        p.kind_code, p.family_id
      ORDER BY p.publication_date DESC
      LIMIT ${Math.min(limit, config.bigquery.maxResults)}
    `;

        return query;
    }

    private buildCitationQueries(patentId: string): [string, string] {
        // Patents that cite this patent (forward citations)
        const citingQuery = `
      SELECT 
        p.publication_number,
        p.title,
        p.abstract,
        p.publication_date,
        p.application_date,
        p.assignee,
        p.inventor,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(c.code) as cpc_codes
      FROM \`${this.datasetId}.patents\` p
      INNER JOIN \`${this.datasetId}.citations\` cit 
        ON p.publication_number = cit.publication_number
      LEFT JOIN \`${this.datasetId}.cpc_current\` c 
        ON p.publication_number = c.publication_number
      WHERE cit.cited_publication_number = '${patentId}'
      GROUP BY 
        p.publication_number, p.title, p.abstract, p.publication_date,
        p.application_date, p.assignee, p.inventor, p.country_code,
        p.kind_code, p.family_id
      ORDER BY p.publication_date DESC
      LIMIT 100
    `;

        // Patents cited by this patent (backward citations)
        const citedQuery = `
      SELECT 
        p.publication_number,
        p.title,
        p.abstract,
        p.publication_date,
        p.application_date,
        p.assignee,
        p.inventor,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(c.code) as cpc_codes
      FROM \`${this.datasetId}.patents\` p
      INNER JOIN \`${this.datasetId}.citations\` cit 
        ON p.publication_number = cit.cited_publication_number
      LEFT JOIN \`${this.datasetId}.cpc_current\` c 
        ON p.publication_number = c.publication_number
      WHERE cit.publication_number = '${patentId}'
      GROUP BY 
        p.publication_number, p.title, p.abstract, p.publication_date,
        p.application_date, p.assignee, p.inventor, p.country_code,
        p.kind_code, p.family_id
      ORDER BY p.publication_date DESC
      LIMIT 100
    `;

        return [citingQuery, citedQuery];
    }

    private buildStatisticsQueries(filters?: PatentSearchFilters): {
        total: string;
        yearly: string;
        assignees: string;
        classifications: string;
    } {
        const baseWhere = filters ? this.buildFilterConditions(filters, 'p') : '';

        return {
            total: `
        SELECT COUNT(*) as total
        FROM \`${this.datasetId}.patents\` p
        WHERE 1=1 ${baseWhere}
      `,
            yearly: `
        SELECT 
          EXTRACT(YEAR FROM p.publication_date) as year,
          COUNT(*) as count
        FROM \`${this.datasetId}.patents\` p
        WHERE 1=1 ${baseWhere}
        GROUP BY year
        ORDER BY year DESC
        LIMIT 20
      `,
            assignees: `
        SELECT 
          p.assignee,
          COUNT(*) as count
        FROM \`${this.datasetId}.patents\` p
        WHERE p.assignee IS NOT NULL ${baseWhere}
        GROUP BY p.assignee
        ORDER BY count DESC
        LIMIT 20
      `,
            classifications: `
        SELECT 
          c.code as classification,
          COUNT(*) as count
        FROM \`${this.datasetId}.patents\` p
        INNER JOIN \`${this.datasetId}.cpc_current\` c 
          ON p.publication_number = c.publication_number
        WHERE 1=1 ${baseWhere.replace('p.', 'p.')}
        GROUP BY c.code
        ORDER BY count DESC
        LIMIT 20
      `,
        };
    }

    private buildFilterConditions(filters: PatentSearchFilters, tableAlias = 'p'): string {
        let conditions = '';

        if (filters.dateRange) {
            if (filters.dateRange.start) {
                conditions += ` AND ${tableAlias}.publication_date >= '${filters.dateRange.start}'`;
            }
            if (filters.dateRange.end) {
                conditions += ` AND ${tableAlias}.publication_date <= '${filters.dateRange.end}'`;
            }
        }

        if (filters.countries && filters.countries.length > 0) {
            const countriesString = filters.countries.map(c => `'${c}'`).join(',');
            conditions += ` AND ${tableAlias}.country_code IN (${countriesString})`;
        }

        if (filters.assignees && filters.assignees.length > 0) {
            const assigneeConditions = filters.assignees
                .map(assignee => `LOWER(${tableAlias}.assignee) LIKE LOWER('%${assignee}%')`)
                .join(' OR ');
            conditions += ` AND (${assigneeConditions})`;
        }

        return conditions;
    }

    private transformBigQueryResults(rows: BigQueryPatent[]): PatentResult[] {
        return rows.map(row => ({
            patent_id: row.publication_number,
            title: row.title || '',
            abstract: row.abstract || '',
            publication_date: row.publication_date ? new Date(row.publication_date).toISOString() : '',
            application_date: row.application_date ? new Date(row.application_date).toISOString() : '',
            assignee: row.assignee || '',
            inventors: Array.isArray(row.inventor) ? row.inventor : [row.inventor || ''],
            country_code: row.country_code || '',
            kind_code: row.kind_code || '',
            family_id: row.family_id || '',
            classifications: Array.isArray(row.cpc_codes) ? row.cpc_codes : [],
            similarity_score: 0,
            url: `https://patents.google.com/patent/${row.publication_number}`,
        }));
    }
} 