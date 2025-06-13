import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
    nodeEnv: string;
    port: number;
    corsOrigins: string[];

    // Google Cloud Configuration
    googleCloud: {
        projectId: string;
        keyFilename?: string;
    };

    // BigQuery Configuration
    bigquery: {
        dataset: string;
        location: string;
        maxResults: number;
        publicDataset: boolean;
    };

    // Pinecone Configuration
    pinecone: {
        apiKey: string;
        environment: string;
        indexName: string;
        host?: string;
        metric: string;
        model: string;
        type: string;
        cloud: string;
        region: string;
    };

    // OpenAI Configuration
    openai: {
        apiKey: string;
        model: string;
        embeddingModel: string;
        maxTokens: number;
    };

    // Firebase Configuration
    firebase: {
        projectId: string;
        clientEmail?: string;
        privateKey?: string;
        databaseURL?: string;
    };

    // Logging Configuration
    logging: {
        level: string;
        format: string;
    };

    // Cache Configuration
    cache: {
        ttl: number;
        maxSize: number;
    };
}

const requiredEnvVars = [
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'OPENAI_API_KEY',
    'FIREBASE_PROJECT_ID',
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export const config: Config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:3005', 'http://localhost:3001', 'http://localhost:3002'],

    googleCloud: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'excel-search-462706', // User's project for billing
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Optional - will use ADC if not provided
    },

    bigquery: {
        dataset: 'patents-public-data.patents', // Full reference to Google's public patent dataset
        location: process.env.BIGQUERY_LOCATION || 'US',
        maxResults: parseInt(process.env.BIGQUERY_MAX_RESULTS || '1000', 10),
        publicDataset: true, // Flag to indicate we're using public dataset
    },

    pinecone: {
        apiKey: process.env.PINECONE_API_KEY!,
        environment: process.env.PINECONE_ENVIRONMENT!,
        indexName: process.env.PINECONE_INDEX_NAME || 'patent-embeddings',
        host: process.env.PINECONE_HOST,
        metric: process.env.PINECONE_METRIC || 'cosine',
        model: process.env.PINECONE_MODEL || 'text-embedding-3-small',
        type: process.env.PINECONE_TYPE || 'euclidean',
        cloud: process.env.PINECONE_CLOUD || 'pinecone-cloud',
        region: process.env.PINECONE_REGION || 'us-west1-gcp',
    },

    openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
    },

    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
    },

    cache: {
        ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    },
};

// Validate configuration
export const validateConfig = (): void => {
    if (config.port < 1 || config.port > 65535) {
        throw new Error('Port must be between 1 and 65535');
    }

    if (config.openai.maxTokens < 1 || config.openai.maxTokens > 8000) {
        throw new Error('OpenAI max tokens must be between 1 and 8000');
    }

    if (config.bigquery.maxResults < 1 || config.bigquery.maxResults > 10000) {
        throw new Error('BigQuery max results must be between 1 and 10000');
    }
};

// Run validation
validateConfig(); 