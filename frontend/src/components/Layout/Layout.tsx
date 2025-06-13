import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, BarChart3, Home, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
interface LayoutProps {
    children: React.ReactNode;
}
export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const navigation = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Search', href: '/search', icon: Search },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Dashboard', href: '/dashboard', icon: User },
    ];
    const isActive = (path: string) => {
        return location.pathname === path;
    };
    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50">
            {}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            {}
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/" className="text-xl font-bold text-blue-600">
                                    PatentSearch
                                </Link>
                            </div>
                            {}
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navigation.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={`${isActive(item.href)
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        {}
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700">
                                {user?.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                {}
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`${isActive(item.href)
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                                        } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                                >
                                    <Icon className="w-4 h-4 inline mr-2" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
            {}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
};
