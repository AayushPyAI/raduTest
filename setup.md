# Patent Semantic Search System - Setup Guide

This guide will help you set up the complete patent semantic search system with React frontend, Node.js backend, and AI-powered semantic search capabilities.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Platform account
- Firebase project
- Pinecone account
- OpenAI API account

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd patent-search-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

#### Backend Environment (.env)

Create `backend/.env` file with the following variables:

```env
# Node.js Environment
NODE_ENV=development
PORT=3001

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json

# BigQuery Configuration
BIGQUERY_DATASET=patents-public-data
BIGQUERY_LOCATION=US
BIGQUERY_MAX_RESULTS=1000

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=patent-embeddings
PINECONE_DIMENSION=1536

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MAX_TOKENS=4000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=combined

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000
```

#### Frontend Environment (.env)

Create `frontend/.env` file:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
```

### 3. Service Setup

#### Google Cloud Platform

1. Create a new GCP project
2. Enable BigQuery API
3. Create a service account with BigQuery permissions
4. Download the service account key JSON file
5. Set `GOOGLE_CLOUD_KEY_FILE` to the path of this file

#### Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing GCP project)
3. Enable Authentication with Email/Password and Google providers
4. Get configuration from Project Settings
5. Generate a private key for service account (for backend)

#### Pinecone

1. Sign up at [Pinecone](https://pinecone.io/)
2. Create a new index with:
   - Dimension: 1536 (for OpenAI text-embedding-3-small)
   - Metric: cosine
   - Cloud: AWS (recommended)
3. Get your API key and environment from the dashboard

#### OpenAI

1. Sign up at [OpenAI](https://openai.com/)
2. Get your API key from the dashboard
3. Ensure you have access to embedding models

### 4. Run the Application

#### Development Mode

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

#### Production Deployment

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build

# Deploy to Firebase
firebase deploy
```

## System Architecture

### Backend Services

- **BigQuery Service**: Handles patent data queries from Google Patents dataset
- **Semantic Search Service**: Manages vector embeddings and similarity search
- **Patent Search Service**: Orchestrates combined search strategies
- **Authentication**: Firebase Auth middleware
- **Error Handling**: Comprehensive error management

### Frontend Components

- **Search Interface**: AI-powered patent search with filters
- **Results Display**: Patent cards with similarity scores and metadata
- **Analytics Dashboard**: Patent landscape visualization
- **Authentication**: Firebase Auth integration

### Data Flow

1. User enters search query
2. Frontend sends request to backend API
3. Backend generates embeddings using OpenAI
4. Semantic search in Pinecone vector database
5. Additional patent details from BigQuery
6. Combined results ranked by relevance
7. Frontend displays results with visualizations

## API Documentation

### Search Endpoints

#### POST /api/search/semantic
Perform semantic patent search

```json
{
  "query": "machine learning for autonomous vehicles",
  "searchType": "hybrid",
  "limit": 50,
  "minSimilarity": 0.7,
  "filters": {
    "dateRange": {"start": "2020-01-01", "end": "2024-01-01"},
    "countries": ["US", "EP"],
    "classifications": ["B60W", "G06N"]
  }
}
```

#### GET /api/search/related/:patentId
Get related patents by citation and similarity

#### POST /api/analytics/landscape
Generate patent landscape analysis

### Authentication

All API endpoints require Firebase ID token in Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Frontend Tests
```bash
cd frontend
npm test
npm run cypress:open  # E2E tests
```

## Performance Optimization

### Indexing Patents for Semantic Search

For production use, you'll need to index patents in Pinecone:

```bash
# This is a one-time setup process
POST /api/admin/index-patents
```

This process:
1. Fetches patents from BigQuery in batches
2. Generates embeddings for patent titles and abstracts
3. Stores vectors in Pinecone with metadata
4. Can take several hours for full dataset

### Caching Strategy

- API responses cached for 1 hour
- Vector search results cached
- BigQuery results cached
- Firebase Auth tokens managed automatically

## Monitoring and Logging

### Application Monitoring

- Winston logging with structured logs
- Request/response logging
- Error tracking with stack traces
- Performance metrics (search time, result count)

### Health Checks

```bash
GET /api/health
```

Returns system status for all services.

## Troubleshooting

### Common Issues

1. **BigQuery Permission Errors**
   - Ensure service account has BigQuery User and Data Viewer roles
   - Check project ID matches

2. **Pinecone Connection Issues**
   - Verify API key and environment
   - Check index exists with correct dimensions

3. **OpenAI Rate Limits**
   - Monitor usage dashboard
   - Implement retry logic for rate limit errors

4. **Firebase Auth Issues**
   - Check project configuration
   - Verify private key format (replace \n with actual newlines)

### Debug Mode

Set `LOG_LEVEL=debug` to see detailed operation logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check troubleshooting section
- Review logs for error details
- Open GitHub issue with reproduction steps 