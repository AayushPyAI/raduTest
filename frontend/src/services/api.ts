import axios from 'axios';
import { SearchResponse, SearchFilters, PatentLandscapeData } from '../types/patent';

// Use window for environment variables in React
declare global {
    interface Window {
        env: any;
    }
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30050,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('firebase-token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('firebase-token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export interface SearchQuery {
    query: string;
    searchType: 'semantic' | 'keyword' | 'hybrid';
    filters?: SearchFilters;
    limit?: number;
    minSimilarity?: number;
}

export const api = {
    // Health check
    health: async () => {
        const response = await apiClient.get('/api/health');
        return response.data;
    },

    // Patent search
    searchPatents: async (searchQuery: SearchQuery): Promise<{ data: SearchResponse }> => {
        const response = await apiClient.post('/api/search/semantic', searchQuery);
        return response.data;
    },

    // Quick search
    quickSearch: async (query: string): Promise<{ data: SearchResponse }> => {
        const response = await apiClient.post('/api/search/quick', { query });
        return response.data;
    },

    // Get related patents
    getRelatedPatents: async (patentId: string) => {
        const response = await apiClient.get(`/api/search/related/${patentId}`);
        return response.data;
    },

    // Get search suggestions
    getSearchSuggestions: async (query: string) => {
        const response = await apiClient.get('/api/search/suggestions', {
            params: { q: query },
        });
        return response.data;
    },

    // Analytics - Patent landscape
    getPatentLandscape: async (query: string, filters?: SearchFilters): Promise<{ data: PatentLandscapeData }> => {
        const response = await apiClient.post('/api/analytics/landscape', {
            query,
            filters,
        });
        return response.data;
    },

    // Batch search
    batchSearch: async (queries: string[]) => {
        const response = await apiClient.post('/api/search/batch', { queries });
        return response.data;
    },

    // Search service status
    getSearchStatus: async () => {
        const response = await apiClient.get('/api/search/status');
        return response.data;
    },
}; 