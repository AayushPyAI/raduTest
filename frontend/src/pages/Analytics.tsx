import React from 'react';
import { BarChart3 } from 'lucide-react';
export const Analytics: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">Patent Analytics</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Coming soon - Patent landscape analysis and insights
                    </p>
                </div>
            </div>
        </div>
    );
};
