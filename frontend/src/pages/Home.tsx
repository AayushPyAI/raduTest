import React from 'react';
import { Link } from 'react-router-dom';
import { Search, BarChart3, Lightbulb, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
export const Home: React.FC = () => {
    const { user } = useAuth();
    const features = [
        {
            name: 'Semantic Search',
            description: 'AI-powered search that understands the meaning of your ideas, not just keywords.',
            icon: Search,
            href: '/search',
        },
        {
            name: 'Patent Analytics',
            description: 'Comprehensive landscape analysis and insights into patent trends.',
            icon: BarChart3,
            href: '/analytics',
        },
        {
            name: 'Prior Art Discovery',
            description: 'Find relevant existing patents before filing your application.',
            icon: Lightbulb,
            href: '/search',
        },
        {
            name: 'Citation Network',
            description: 'Explore patent relationships and citation patterns.',
            icon: Users,
            href: '/analytics',
        },
    ];
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
                <div className="text-center">
                    <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                        <span className="block">Welcome back,</span>
                        <span className="block text-blue-600">{user?.email?.split('@')[0]}</span>
                    </h1>
                    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        Search through millions of patents with AI-powered semantic understanding.
                        Discover prior art, analyze patent landscapes, and gain insights faster than ever.
                    </p>
                    <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                        <div className="rounded-md shadow">
                            <Link
                                to="/search"
                                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                            >
                                Start Searching
                            </Link>
                        </div>
                        <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                            <Link
                                to="/analytics"
                                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                            >
                                View Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            {}
            <div className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:text-center">
                        <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
                        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Everything you need for patent research
                        </p>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                            Our platform combines cutting-edge AI with comprehensive patent data to give you
                            unprecedented insights into the intellectual property landscape.
                        </p>
                    </div>
                    <div className="mt-10">
                        <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                            {features.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <Link
                                        key={feature.name}
                                        to={feature.href}
                                        className="relative p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-blue-300"
                                    >
                                        <dt>
                                            <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                                                <Icon className="h-6 w-6" aria-hidden="true" />
                                            </div>
                                            <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                                                {feature.name}
                                            </p>
                                        </dt>
                                        <dd className="mt-2 ml-16 text-base text-gray-500">
                                            {feature.description}
                                        </dd>
                                    </Link>
                                );
                            })}
                        </dl>
                    </div>
                </div>
            </div>
            {}
            <div className="bg-blue-600">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                            Trusted by researchers worldwide
                        </h2>
                        <p className="mt-3 text-xl text-blue-200 sm:mt-4">
                            Access to the world's largest patent database with AI-powered insights
                        </p>
                    </div>
                    <dl className="mt-10 text-center sm:max-w-3xl sm:mx-auto sm:grid sm:grid-cols-3 sm:gap-8">
                        <div className="flex flex-col">
                            <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">
                                Patents Searchable
                            </dt>
                            <dd className="order-1 text-5xl font-extrabold text-white">90M+</dd>
                        </div>
                        <div className="flex flex-col mt-10 sm:mt-0">
                            <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">
                                Countries Covered
                            </dt>
                            <dd className="order-1 text-5xl font-extrabold text-white">100+</dd>
                        </div>
                        <div className="flex flex-col mt-10 sm:mt-0">
                            <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">
                                Average Search Time
                            </dt>
                            <dd className="order-1 text-5xl font-extrabold text-white">&lt;2s</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};
