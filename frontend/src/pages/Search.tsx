import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Search as SearchIcon, Filter, Download, BookOpen } from 'lucide-react';
import { SearchForm } from '../components/Search/SearchForm';
import { SearchResults } from '../components/Search/SearchResults';
import { SearchFilters } from '../components/Search/SearchFilters';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { EmptyState } from '../components/UI/EmptyState';
import { PatentCard } from '../components/Patent/PatentCard';
import { api } from '../services/api';
import { PatentResult, SearchFilters as SearchFiltersType } from '../types/patent';

interface SearchQuery {
    query: string;
    searchType: 'semantic' | 'keyword' | 'hybrid';
    filters?: SearchFiltersType;
    limit?: number;
    minSimilarity?: number;
}

export const Search: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Search results query
    const {
        data: searchResults,
        isLoading,
        error,
        refetch,
    } = useQuery(
        ['patent-search', searchQuery],
        () => searchQuery ? api.searchPatents(searchQuery) : null,
        {
            enabled: !!searchQuery,
            keepPreviousData: true,
        }
    );

    const handleSearch = (newQuery: SearchQuery) => {
        setSearchQuery(newQuery);
    };

    const handleFiltersChange = (filters: SearchFiltersType) => {
        if (searchQuery) {
            setSearchQuery({
                ...searchQuery,
                filters,
            });
        }
    };

    const handleExportResults = () => {
        if (searchResults?.data.results) {
            const csvContent = convertToCSV(searchResults.data.results);
            downloadCSV(csvContent, 'patent-search-results.csv');
        }
    };

    const convertToCSV = (patents: PatentResult[]): string => {
        const headers = [
            'Patent ID',
            'Title',
            'Abstract',
            'Publication Date',
            'Assignee',
            'Country',
            'Similarity Score',
            'URL'
        ].join(',');

        const rows = patents.map(patent => [
            patent.patent_id,
            `"${patent.title.replace(/"/g, '""')}"`,
            `"${patent.abstract.replace(/"/g, '""').substring(0, 200)}..."`,
            patent.publication_date,
            `"${patent.assignee.replace(/"/g, '""')}"`,
            patent.country_code,
            patent.similarity_score,
            patent.url
        ].join(','));

        return [headers, ...rows].join('\n');
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Search Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <SearchIcon className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Patent Search</h1>
                                <p className="text-sm text-gray-600">
                                    Search through millions of patents with AI-powered semantic understanding
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''
                                    }`}
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filters
                            </button>

                            {searchResults && (
                                <button
                                    onClick={handleExportResults}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8">
                    {/* Sidebar - Filters */}
                    {showFilters && (
                        <div className="w-80 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Search Filters</h3>
                                <SearchFilters
                                    filters={searchQuery?.filters}
                                    onFiltersChange={handleFiltersChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        {/* Search Form */}
                        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                            <SearchForm
                                onSearch={handleSearch}
                                isLoading={isLoading}
                                initialQuery={searchQuery?.query || ''}
                                initialSearchType={searchQuery?.searchType || 'hybrid'}
                            />
                        </div>

                        {/* Search Results */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            {!searchQuery && (
                                <EmptyState
                                    icon={BookOpen}
                                    title="Start your patent search"
                                    description="Enter a description of your idea, technology, or invention to find relevant patents"
                                    action={
                                        <button
                                            onClick={() => {
                                                const exampleQuery = "machine learning for autonomous vehicles";
                                                handleSearch({
                                                    query: exampleQuery,
                                                    searchType: 'hybrid',
                                                    limit: 20,
                                                });
                                            }}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Try Example Search
                                        </button>
                                    }
                                />
                            )}

                            {isLoading && (
                                <div className="p-8">
                                    <LoadingSpinner size="lg" />
                                    <p className="text-center text-gray-600 mt-4">
                                        Searching through millions of patents...
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="p-8">
                                    <div className="text-center">
                                        <p className="text-red-600 mb-4">
                                            An error occurred while searching. Please try again.
                                        </p>
                                        <button
                                            onClick={() => refetch()}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        >
                                            Retry Search
                                        </button>
                                    </div>
                                </div>
                            )}

                            {searchResults && !isLoading && (
                                <SearchResults
                                    results={searchResults.data.results}
                                    totalResults={searchResults.data.total_results}
                                    searchTime={searchResults.data.search_time_ms}
                                    searchMetadata={searchResults.data.search_metadata}
                                    query={searchQuery?.query || ''}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 