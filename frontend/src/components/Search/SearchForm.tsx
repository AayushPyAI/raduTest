import React, { useState } from 'react';
import { Search as SearchIcon, Sparkles } from 'lucide-react';
interface SearchFormProps {
    onSearch: (query: {
        query: string;
        searchType: 'semantic' | 'keyword' | 'hybrid';
        limit?: number;
        minSimilarity?: number;
    }) => void;
    isLoading: boolean;
    initialQuery?: string;
    initialSearchType?: 'semantic' | 'keyword' | 'hybrid';
}
export const SearchForm: React.FC<SearchFormProps> = ({
    onSearch,
    isLoading,
    initialQuery = '',
    initialSearchType = 'hybrid',
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [searchType, setSearchType] = useState<'semantic' | 'keyword' | 'hybrid'>(initialSearchType);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch({
                query: query.trim(),
                searchType,
                limit: 50,
                minSimilarity: 0.7,
            });
        }
    };
    const searchTypes = [
        {
            value: 'hybrid' as const,
            label: 'Hybrid Search',
            description: 'Best of both semantic understanding and keyword matching',
            icon: Sparkles,
        },
        {
            value: 'semantic' as const,
            label: 'Semantic Search',
            description: 'AI-powered understanding of meaning and context',
            icon: SearchIcon,
        },
        {
            value: 'keyword' as const,
            label: 'Keyword Search',
            description: 'Traditional text-based matching',
            icon: SearchIcon,
        },
    ];
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {}
            <div>
                <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your invention or search for patents
                </label>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                        id="search-query"
                        rows={3}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none"
                        placeholder="e.g., Machine learning algorithm for autonomous vehicle navigation using computer vision and sensor fusion..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                    Tip: Be descriptive about your technology, include key features and use cases
                </p>
            </div>
            {}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Search Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {searchTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                            <div
                                key={type.value}
                                className={`relative rounded-lg border p-4 cursor-pointer hover:bg-gray-50 ${searchType === type.value
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-300'
                                    }`}
                                onClick={() => setSearchType(type.value)}
                            >
                                <div className="flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="radio"
                                            name="search-type"
                                            value={type.value}
                                            checked={searchType === type.value}
                                            onChange={() => setSearchType(type.value)}
                                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <div className="flex items-center">
                                            <Icon className="h-4 w-4 mr-2 text-gray-600" />
                                            <label className="font-medium text-gray-900 text-sm">
                                                {type.label}
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {type.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Searching...
                        </>
                    ) : (
                        <>
                            <SearchIcon className="-ml-1 mr-2 h-5 w-5" />
                            Search Patents
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};
