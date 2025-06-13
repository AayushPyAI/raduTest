import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';

// Real Firebase authentication only

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Store token in localStorage when user changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                try {
                    // Get fresh token and store in localStorage
                    const token = await user.getIdToken();
                    localStorage.setItem('firebase-token', token);
                    console.log('🔑 Firebase token stored in localStorage');
                } catch (error) {
                    console.error('Failed to get Firebase token:', error);
                    localStorage.removeItem('firebase-token');
                }
            } else {
                // User logged out, remove token
                localStorage.removeItem('firebase-token');
                console.log('🚪 Firebase token removed from localStorage');
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Refresh token periodically (Firebase tokens expire after 1 hour)
    useEffect(() => {
        if (!user) return;

        const refreshToken = async () => {
            try {
                const token = await user.getIdToken(true); // Force refresh
                localStorage.setItem('firebase-token', token);
                console.log('🔄 Firebase token refreshed');
            } catch (error) {
                console.error('Failed to refresh Firebase token:', error);
                localStorage.removeItem('firebase-token');
            }
        };

        // Refresh token every 50 minutes (tokens expire in 60 minutes)
        const intervalId = setInterval(refreshToken, 50 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [user]);

    const login = async (email: string, password: string): Promise<void> => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            // Store token immediately after login
            const token = await result.user.getIdToken();
            localStorage.setItem('firebase-token', token);
            console.log('🔑 Firebase token stored after login');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const signup = async (email: string, password: string): Promise<void> => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // Store token immediately after signup
            const token = await result.user.getIdToken();
            localStorage.setItem('firebase-token', token);
            console.log('🔑 Firebase token stored after signup');
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    };

    const loginWithGoogle = async (): Promise<void> => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            // Store token immediately after Google login
            const token = await result.user.getIdToken();
            localStorage.setItem('firebase-token', token);
            console.log('🔑 Firebase token stored after Google login');
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            localStorage.removeItem('firebase-token');
            await signOut(auth);
            console.log('🚪 User logged out and token removed');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    const getIdToken = async (): Promise<string | null> => {
        try {
            if (user) {
                return await user.getIdToken();
            }
            return null;
        } catch (error) {
            console.error('Get ID token error:', error);
            return null;
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        getIdToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 