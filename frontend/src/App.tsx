import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { PatentDetail } from './pages/PatentDetail';
import { Analytics } from './pages/Analytics';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './index.css';

// Create a query client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Router>
                    <div className="App">
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#363636',
                                    color: '#fff',
                                },
                                success: {
                                    style: {
                                        background: '#059669',
                                    },
                                },
                                error: {
                                    style: {
                                        background: '#DC2626',
                                    },
                                },
                            }}
                        />

                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<Login />} />

                            {/* Protected routes with layout */}
                            <Route path="/" element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Home />
                                    </Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/search" element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Search />
                                    </Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/patent/:patentId" element={
                                <ProtectedRoute>
                                    <Layout>
                                        <PatentDetail />
                                    </Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/analytics" element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Analytics />
                                    </Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </ProtectedRoute>
                            } />

                            {/* Catch all route */}
                            <Route path="*" element={
                                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                                    <div className="text-center">
                                        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                                        <p className="text-lg text-gray-600 mb-8">
                                            The page you're looking for doesn't exist.
                                        </p>
                                        <a
                                            href="/"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Go Home
                                        </a>
                                    </div>
                                </div>
                            } />
                        </Routes>
                    </div>
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App; 