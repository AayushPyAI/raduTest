import React from 'react';
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
export const PatentDetail: React.FC = () => {
    const { patentId } = useParams<{ patentId: string }>();
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h1 className="mt-2 text-2xl font-bold text-gray-900">Patent Detail</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Patent ID: {patentId}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                        Coming soon - Detailed patent view with citations and analysis
                    </p>
                </div>
            </div>
        </div>
    );
};
