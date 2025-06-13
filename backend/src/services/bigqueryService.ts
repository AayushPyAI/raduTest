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
  title_localized: Array<{ text: string; language: string }>;
  abstract_localized: Array<{ text: string; language: string }>;
  publication_date: string;
  assignee_harmonized: Array<{ name: string }>;
  inventor_harmonized: Array<{ name: string }>;
  country_code: string;
  kind_code: string;
  family_id: string;
}

export class BigQueryService {
  private bigquery: BigQuery;
  private readonly projectId: string;

  constructor() {
    this.projectId = config.googleCloud.projectId;

    // Initialize BigQuery with Application Default Credentials
    this.bigquery = new BigQuery({
      projectId: this.projectId, // Use user's project for billing
      location: config.bigquery.location,
      // keyFilename is optional - will use Application Default Credentials if not provided
      ...(config.googleCloud.keyFilename && { keyFilename: config.googleCloud.keyFilename }),
    });

    logger.info('BigQuery service initialized for Google Patents Public Dataset', {
      billingProjectId: this.projectId,
      location: config.bigquery.location,
      publicDataset: 'patents-public-data.patents',
      authMethod: config.googleCloud.keyFilename ? 'Service Account Key' : 'Application Default Credentials',
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

    const query = this.buildKeywordSearchQuery(keywords, filters, limit);

    logger.debug('Executing BigQuery keyword search', { query: query.substring(0, 200) });

    const [rows] = await this.bigquery.query({
      query,
      location: config.bigquery.location,
    });

    const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

    patentLogger.bigqueryQuery(query, Date.now() - startTime);

    return results;
  }

  /**
   * Get patents by publication numbers for semantic similarity ranking
   */
  async getPatentsByIds(patentIds: string[]): Promise<PatentResult[]> {
    const startTime = Date.now();

    const query = this.buildPatentIdQuery(patentIds);

    const [rows] = await this.bigquery.query({
      query,
      location: config.bigquery.location,
    });

    const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

    patentLogger.bigqueryQuery(query, Date.now() - startTime);

    return results;
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

    const query = this.buildClassificationSearchQuery(classifications, filters, limit);

    const [rows] = await this.bigquery.query({
      query,
      location: config.bigquery.location,
    });

    const results = this.transformBigQueryResults(rows as BigQueryPatent[]);

    patentLogger.bigqueryQuery(query, Date.now() - startTime);

    return results;
  }

  /**
   * Get patent citation network (forward and backward citations)
   */
  async getPatentCitations(patentId: string): Promise<{
    citing: PatentResult[];
    cited: PatentResult[];
  }> {
    const startTime = Date.now();

    const [citingQuery, citedQuery] = this.buildCitationQueries(patentId);

    const [citingResults, citedResults] = await Promise.all([
      this.bigquery.query({ query: citingQuery, location: config.bigquery.location }),
      this.bigquery.query({ query: citedQuery, location: config.bigquery.location }),
    ]);

    const citing = this.transformBigQueryResults(citingResults[0] as BigQueryPatent[]);
    const cited = this.transformBigQueryResults(citedResults[0] as BigQueryPatent[]);

    patentLogger.bigqueryQuery(`Citation queries for ${patentId}`, Date.now() - startTime);

    return { citing, cited };
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
  }

  private buildKeywordSearchQuery(
    keywords: string,
    filters?: PatentSearchFilters,
    limit: number = 100
  ): string {
    const baseQuery = `
      SELECT 
        p.publication_number,
        p.title_localized,
        p.abstract_localized,
        p.publication_date,
        p.assignee_harmonized,
        p.inventor_harmonized,
        p.country_code,
        p.kind_code,
        p.family_id
      FROM \`patents-public-data.patents.publications\` p
      WHERE 1=1
        AND p.publication_date IS NOT NULL
        AND p.publication_date > 0
        AND LENGTH(CAST(p.publication_date AS STRING)) = 8
        AND EXTRACT(YEAR FROM PARSE_DATE('%Y%m%d', CAST(p.publication_date AS STRING))) >= 2020
    `;

    let conditions = '';

    if (keywords.trim()) {
      const searchTerms = keywords.split(' ').filter(term => term.length > 0);
      const titleSearch = searchTerms.map(term =>
        `EXISTS(SELECT 1 FROM UNNEST(p.title_localized) AS title WHERE LOWER(title.text) LIKE LOWER('%${term}%'))`
      ).join(' AND ');
      const abstractSearch = searchTerms.map(term =>
        `EXISTS(SELECT 1 FROM UNNEST(p.abstract_localized) AS abstract WHERE LOWER(abstract.text) LIKE LOWER('%${term}%'))`
      ).join(' AND ');

      conditions += ` AND ((${titleSearch}) OR (${abstractSearch}))`;
    }

    if (filters) {
      conditions += this.buildFilterConditions(filters);
    }

    const orderBy = `ORDER BY p.publication_date DESC`;
    const limitClause = `LIMIT ${Math.min(limit, config.bigquery.maxResults)}`;

    return `${baseQuery}${conditions} ${orderBy} ${limitClause}`;
  }

  private buildPatentIdQuery(patentIds: string[]): string {
    const idsString = patentIds.map(id => `'${id}'`).join(',');

    return `
      SELECT 
        p.publication_number,
        p.title_localized,
        p.abstract_localized,
        p.publication_date,
        p.assignee_harmonized,
        p.inventor_harmonized,
        p.country_code,
        p.kind_code,
        p.family_id
      FROM \`patents-public-data.patents.publications\` p
      WHERE p.publication_number IN (${idsString})
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
        p.title_localized,
        p.abstract_localized,
        p.publication_date,
        p.application_date,
        a.name as assignee,
        p.inventor_harmonized,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(DISTINCT c.code) as cpc_codes
      FROM \`patents-public-data.patents.publications\` p
      INNER JOIN \`patents-public-data.patents.cpc_current\` c 
        ON p.publication_number = c.publication_number
      LEFT JOIN \`patents-public-data.patents.assignees\` a
        ON p.publication_number = a.publication_number
      WHERE (${classificationConditions})
        AND p.publication_date >= '2020-01-01'
    `;

    if (filters) {
      query += this.buildFilterConditions(filters);
    }

    query += `
      GROUP BY 
        p.publication_number, p.title_localized, p.abstract_localized, p.publication_date,
        p.application_date, a.name, p.inventor_harmonized, p.country_code,
        p.kind_code, p.family_id
      ORDER BY p.publication_date DESC
      LIMIT ${Math.min(limit, config.bigquery.maxResults)}
    `;

    return query;
  }

  private buildCitationQueries(patentId: string): [string, string] {
    // Patents that cite this patent (forward citations)
    // Note: Google Patents public dataset may have different citation table structure
    const citingQuery = `
      SELECT 
        p.publication_number,
        p.title_localized,
        p.abstract_localized,
        p.publication_date,
        p.application_date,
        a.name as assignee,
        p.inventor_harmonized,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(DISTINCT c.code) as cpc_codes
      FROM \`patents-public-data.patents.publications\` p
      LEFT JOIN \`patents-public-data.patents.cpc_current\` c 
        ON p.publication_number = c.publication_number
      LEFT JOIN \`patents-public-data.patents.assignees\` a
        ON p.publication_number = a.publication_number
      WHERE p.publication_number IN (
        SELECT citing_publication_number 
        FROM \`patents-public-data.patents.uspatentcitations\` 
        WHERE cited_publication_number = '${patentId}'
        LIMIT 100
      )
      GROUP BY 
        p.publication_number, p.title_localized, p.abstract_localized, p.publication_date,
        p.application_date, a.name, p.inventor_harmonized, p.country_code,
        p.kind_code, p.family_id
      LIMIT 50
    `;

    // Patents cited by this patent (backward citations)
    const citedQuery = `
      SELECT 
        p.publication_number,
        p.title_localized,
        p.abstract_localized,
        p.publication_date,
        p.application_date,
        a.name as assignee,
        p.inventor_harmonized,
        p.country_code,
        p.kind_code,
        p.family_id,
        ARRAY_AGG(DISTINCT c.code) as cpc_codes
      FROM \`patents-public-data.patents.publications\` p
      LEFT JOIN \`patents-public-data.patents.cpc_current\` c 
        ON p.publication_number = c.publication_number
      LEFT JOIN \`patents-public-data.patents.assignees\` a
        ON p.publication_number = a.publication_number
      WHERE p.publication_number IN (
        SELECT cited_publication_number 
        FROM \`patents-public-data.patents.uspatentcitations\` 
        WHERE citing_publication_number = '${patentId}'
        LIMIT 100
      )
      GROUP BY 
        p.publication_number, p.title_localized, p.abstract_localized, p.publication_date,
        p.application_date, a.name, p.inventor_harmonized, p.country_code,
        p.kind_code, p.family_id
      LIMIT 50
    `;

    return [citingQuery, citedQuery];
  }

  private buildStatisticsQueries(filters?: PatentSearchFilters): {
    total: string;
    yearly: string;
    assignees: string;
    classifications: string;
  } {
    const baseConditions = this.buildFilterConditions(filters || {});

    const total = `
      SELECT COUNT(*) as total
      FROM \`patents-public-data.patents.publications\` p
      WHERE p.publication_date >= '2020-01-01'
      ${baseConditions}
    `;

    const yearly = `
      SELECT 
        EXTRACT(YEAR FROM PARSE_DATE('%Y-%m-%d', p.publication_date)) as year,
        COUNT(*) as count
      FROM \`patents-public-data.patents.publications\` p
      WHERE p.publication_date >= '2020-01-01'
      ${baseConditions}
      GROUP BY year
      ORDER BY year DESC
      LIMIT 10
    `;

    const assignees = `
      SELECT 
        a.name as assignee,
        COUNT(*) as count
      FROM \`patents-public-data.patents.publications\` p
      JOIN \`patents-public-data.patents.assignees\` a
        ON p.publication_number = a.publication_number
      WHERE p.publication_date >= '2020-01-01'
      ${baseConditions}
      GROUP BY a.name
      ORDER BY count DESC
      LIMIT 20
    `;

    const classifications = `
      SELECT 
        c.code as classification,
        COUNT(*) as count
      FROM \`patents-public-data.patents.publications\` p
      JOIN \`patents-public-data.patents.cpc_current\` c
        ON p.publication_number = c.publication_number
      WHERE p.publication_date >= '2020-01-01'
      ${baseConditions}
      GROUP BY c.code
      ORDER BY count DESC
      LIMIT 20
    `;

    return { total, yearly, assignees, classifications };
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
      const countryList = filters.countries.map(c => `'${c}'`).join(',');
      conditions += ` AND ${tableAlias}.country_code IN (${countryList})`;
    }

    return conditions;
  }

  private transformBigQueryResults(rows: BigQueryPatent[]): PatentResult[] {
    return rows.map(row => ({
      patent_id: row.publication_number,
      title: row.title_localized?.[0]?.text || 'Untitled Patent',
      abstract: row.abstract_localized?.[0]?.text || 'No abstract available',
      publication_date: row.publication_date,
      assignee: row.assignee_harmonized?.[0]?.name || 'Unknown',
      inventors: row.inventor_harmonized?.map(inv => inv.name) || ['Unknown'],
      country_code: row.country_code,
      kind_code: row.kind_code || '',
      family_id: row.family_id || '',
      classifications: [], // Will be populated separately from CPC table
      similarity_score: 0, // Will be set by semantic search
      url: `https://patents.google.com/patent/${row.publication_number}`,
    }));
  }
} 