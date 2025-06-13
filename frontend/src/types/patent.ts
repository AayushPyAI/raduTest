export interface PatentResult {
    patent_id: string;
    title: string;
    abstract: string;
    publication_date: string;
    assignee: string;
    inventors: string[];
    classifications: string[];
    similarity_score: number;
    keyword_matches?: string[];
    country_code: string;
    url: string;
    family_id?: string;
    priority_date?: string;
    citation_count?: number;
    family_size?: number;
}
export interface SearchFilters {
    dateRange?: {
        start?: string;
        end?: string;
    };
    countries?: string[];
    assignees?: string[];
    classifications?: string[];
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
