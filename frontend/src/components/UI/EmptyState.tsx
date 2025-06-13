import React from 'react';
import { LucideIcon } from 'lucide-react';
interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
}) => {
    return (
        <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
                <Icon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
};
