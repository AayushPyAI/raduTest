import React, { useState } from 'react';
import { SearchFilters as SearchFiltersType } from '../../types/patent';
interface SearchFiltersProps {
    filters?: SearchFiltersType;
    onFiltersChange: (filters: SearchFiltersType) => void;
}
export const SearchFilters: React.FC<SearchFiltersProps> = ({
    filters,
    onFiltersChange,
}) => {
    const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters || {});
    const handleFilterChange = (key: keyof SearchFiltersType, value: any) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };
    const commonCountries = ['US', 'EP', 'JP', 'CN', 'KR', 'CA', 'AU', 'GB', 'DE', 'FR'];
    return (
        <div className="space-y-6">
            {}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publication Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                            type="date"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={localFilters.dateRange?.start || ''}
                            onChange={(e) => handleFilterChange('dateRange', {
                                ...localFilters.dateRange,
                                start: e.target.value
                            })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                            type="date"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={localFilters.dateRange?.end || ''}
                            onChange={(e) => handleFilterChange('dateRange', {
                                ...localFilters.dateRange,
                                end: e.target.value
                            })}
                        />
                    </div>
                </div>
            </div>
            {}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Countries
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {commonCountries.map((country) => (
                        <label key={country} className="inline-flex items-center">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                checked={localFilters.countries?.includes(country) || false}
                                onChange={(e) => {
                                    const currentCountries = localFilters.countries || [];
                                    const newCountries = e.target.checked
                                        ? [...currentCountries, country]
                                        : currentCountries.filter(c => c !== country);
                                    handleFilterChange('countries', newCountries);
                                }}
                            />
                            <span className="ml-2 text-sm text-gray-700">{country}</span>
                        </label>
                    ))}
                </div>
            </div>
            {}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignees
                </label>
                <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Apple, Google, Microsoft (comma separated)"
                    value={localFilters.assignees?.join(', ') || ''}
                    onChange={(e) => {
                        const assignees = e.target.value
                            .split(',')
                            .map(a => a.trim())
                            .filter(a => a.length > 0);
                        handleFilterChange('assignees', assignees.length > 0 ? assignees : undefined);
                    }}
                />
            </div>
            {}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classifications (CPC)
                </label>
                <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., G06F, H04L, A61K (comma separated)"
                    value={localFilters.classifications?.join(', ') || ''}
                    onChange={(e) => {
                        const classifications = e.target.value
                            .split(',')
                            .map(c => c.trim())
                            .filter(c => c.length > 0);
                        handleFilterChange('classifications', classifications.length > 0 ? classifications : undefined);
                    }}
                />
            </div>
            {}
            <div className="pt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => {
                        setLocalFilters({});
                        onFiltersChange({});
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                >
                    Clear all filters
                </button>
            </div>
        </div>
    );
};
