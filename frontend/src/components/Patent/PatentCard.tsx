import React from 'react';
import { PatentResult } from '../../types/patent';
interface PatentCardProps {
    patent: PatentResult;
}
export const PatentCard: React.FC<PatentCardProps> = ({ patent }) => {
    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900">{patent.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{patent.abstract}</p>
            <div className="mt-2 text-xs text-gray-500">
                {patent.patent_id} • {patent.assignee}
            </div>
        </div>
    );
};
