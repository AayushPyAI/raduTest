import React from 'react';
import { Clock, FileText } from 'lucide-react';
import { PatentResult } from '../../types/patent';
interface SearchResultsProps {
    results: PatentResult[];
    totalResults: number;
    searchTime: number;
    searchMetadata?: {
        semantic_results?: number;
        keyword_results?: number;
        query_tokens?: number;
        filters_applied?: string[];
    };
    query: string;
}
export const SearchResults: React.FC<SearchResultsProps> = ({
    results,
    totalResults,
    searchTime,
    searchMetadata,
    query,
}) => {
    return (
        <div className="p-6">
            {}
            <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">
                            {totalResults.toLocaleString()} patents found
                        </h3>
                        <p className="text-sm text-gray-500">
                            Showing {results.length} results for "{query}"
                        </p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {(searchTime / 1000).toFixed(2)}s
                    </div>
                </div>
                {searchMetadata && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                        {searchMetadata.semantic_results && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {searchMetadata.semantic_results} semantic matches
                            </span>
                        )}
                        {searchMetadata.keyword_results && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                {searchMetadata.keyword_results} keyword matches
                            </span>
                        )}
                    </div>
                )}
            </div>
            {}
            <div className="space-y-6">
                {results.map((patent) => (
                    <div key={patent.patent_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-blue-600">
                                        {patent.patent_id}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {patent.country_code}
                                    </span>
                                    {patent.similarity_score > 0 && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {Math.round(patent.similarity_score * 100)}% match
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-lg font-medium text-gray-900 mb-2">
                                    {patent.title}
                                </h4>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                                    {patent.abstract}
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span>
                                        <strong>Assignee:</strong> {patent.assignee}
                                    </span>
                                    <span>
                                        <strong>Published:</strong> {new Date(patent.publication_date).toLocaleDateString()}
                                    </span>
                                    {patent.inventors.length > 0 && (
                                        <span>
                                            <strong>Inventors:</strong> {patent.inventors.slice(0, 2).join(', ')}
                                            {patent.inventors.length > 2 && ` +${patent.inventors.length - 2} more`}
                                        </span>
                                    )}
                                </div>
                                {patent.classifications.length > 0 && (
                                    <div className="mt-3">
                                        <div className="flex flex-wrap gap-1">
                                            {patent.classifications.slice(0, 3).map((classification, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                                                >
                                                    {classification}
                                                </span>
                                            ))}
                                            {patent.classifications.length > 3 && (
                                                <span className="text-xs text-gray-500 px-2 py-1">
                                                    +{patent.classifications.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex gap-2">
                                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                    View Details
                                </button>
                                <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">
                                    Find Similar
                                </button>
                            </div>
                            {patent.url && (
                                <a
                                    href={patent.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    View Original →
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
