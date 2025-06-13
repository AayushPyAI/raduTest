import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { createUnauthorizedError } from './errorHandler';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = {
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.firebase.databaseURL,
    });
}

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
    };
}

export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(createUnauthorizedError('No valid authorization header provided'));
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            return next(createUnauthorizedError('No token provided'));
        }

        // Verify the Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Extract user information
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
            email_verified: decodedToken.email_verified,
        };

        logger.debug('User authenticated', {
            uid: req.user.uid,
            email: req.user.email,
        });

        next();

    } catch (error) {
        if (error instanceof Error) {
            logger.warn('Authentication failed', {
                error: error.message,
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
            });

            // Handle specific Firebase Auth errors
            if (error.message.includes('auth/id-token-expired')) {
                return next(createUnauthorizedError('Token has expired'));
            }

            if (error.message.includes('auth/invalid-id-token')) {
                return next(createUnauthorizedError('Invalid token'));
            }

            if (error.message.includes('auth/user-disabled')) {
                return next(createUnauthorizedError('User account is disabled'));
            }
        }

        return next(createUnauthorizedError('Authentication failed'));
    }
};

// Optional authentication middleware (doesn't throw error if no token)
export const optionalAuthMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            if (token) {
                const decodedToken = await admin.auth().verifyIdToken(token);

                req.user = {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    name: decodedToken.name,
                    picture: decodedToken.picture,
                    email_verified: decodedToken.email_verified,
                };
            }
        }

        next();

    } catch (error) {
        // Log the error but don't block the request
        logger.debug('Optional authentication failed', {
            error: (error as Error).message,
            url: req.originalUrl,
        });

        next();
    }
};

// Admin role check middleware
export const requireAdminRole = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(createUnauthorizedError('Authentication required'));
    }

    // Check if user has admin role (this would be stored in custom claims)
    admin.auth()
        .getUser(req.user.uid)
        .then((userRecord) => {
            const customClaims = userRecord.customClaims;

            if (!customClaims || !customClaims.admin) {
                return next(createUnauthorizedError('Admin access required'));
            }

            next();
        })
        .catch((error) => {
            logger.error('Admin role check failed', {
                uid: req.user?.uid,
                error: error.message,
            });

            return next(createUnauthorizedError('Admin access verification failed'));
        });
};

// Subscription/premium feature check middleware
export const requirePremiumAccess = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(createUnauthorizedError('Authentication required'));
    }

    admin.auth()
        .getUser(req.user.uid)
        .then((userRecord) => {
            const customClaims = userRecord.customClaims;

            if (!customClaims || (!customClaims.premium && !customClaims.admin)) {
                return next(createUnauthorizedError('Premium subscription required'));
            }

            next();
        })
        .catch((error) => {
            logger.error('Premium access check failed', {
                uid: req.user?.uid,
                error: error.message,
            });

            return next(createUnauthorizedError('Premium access verification failed'));
        });
};

// Rate limiting by user ID
export const createUserRateLimit = (maxRequests: number, windowMs: number) => {
    const userRequests = new Map<string, { count: number; resetTime: number }>();

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(createUnauthorizedError('Authentication required for rate limiting'));
        }

        const userId = req.user.uid;
        const now = Date.now();
        const userRequest = userRequests.get(userId);

        if (!userRequest || now > userRequest.resetTime) {
            // Initialize or reset the counter
            userRequests.set(userId, {
                count: 1,
                resetTime: now + windowMs,
            });
            next();
            return;
        }

        if (userRequest.count >= maxRequests) {
            res.status(429).json({
                error: {
                    message: 'Rate limit exceeded for your account',
                    retryAfter: Math.ceil((userRequest.resetTime - now) / 1000),
                },
            });
            return;
        }

        userRequest.count++;
        next();
    };
};

// Helper function to set custom claims (for admin use)
export const setUserRole = async (uid: string, role: 'admin' | 'premium' | 'user'): Promise<void> => {
    try {
        const customClaims: Record<string, boolean> = { [role]: true };

        await admin.auth().setCustomUserClaims(uid, customClaims);

        logger.info('User role updated', { uid, role });

    } catch (error) {
        logger.error('Failed to set user role', {
            uid,
            role,
            error: (error as Error).message,
        });
        throw error;
    }
};

// Helper function to verify user exists
export const verifyUserExists = async (uid: string): Promise<boolean> => {
    try {
        await admin.auth().getUser(uid);
        return true;
    } catch (error) {
        return false;
    }
}; 