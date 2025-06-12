# Environment Setup Guide

This guide explains how to set up environment variables for the Patent Semantic Search System.

## Quick Setup

### 1. Backend Environment

```bash
cd backend
cp environment.example .env
```

Then edit `backend/.env` with your actual values:

### 2. Frontend Environment

```bash
cd frontend
cp environment.example .env
```

Then edit `frontend/.env` with your actual values.

## Required Services & Setup

### Google Cloud Platform

1. **Create GCP Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Note your project ID

2. **Enable APIs**
   - Enable BigQuery API
   - Enable Google Patents Public Data access

3. **Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Grant BigQuery User and Data Viewer roles
   - Generate and download JSON key file
   - Set `GOOGLE_CLOUD_KEY_FILE` to the path of this file

### Firebase

1. **Create/Configure Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project or use existing GCP project
   - Enable Authentication with Email/Password and Google providers

2. **Get Frontend Config**
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Add web app if not exists
   - Copy config values to frontend `.env`

3. **Get Backend Config**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Copy project ID, client email, and private key to backend `.env`

### Pinecone Vector Database

1. **Create Account**
   - Sign up at [Pinecone](https://pinecone.io/)
   - Create new index with these settings:
     - **Dimension**: 1536 (for OpenAI text-embedding-3-small)
     - **Metric**: cosine
     - **Cloud**: AWS (recommended)

2. **Get Credentials**
   - Copy API key from dashboard
   - Note your environment (e.g., "us-east-1-aws")
   - Update `PINECONE_API_KEY` and `PINECONE_ENVIRONMENT`

### OpenAI

1. **Get API Key**
   - Sign up at [OpenAI](https://openai.com/)
   - Go to API keys section
   - Create new API key
   - Update `OPENAI_API_KEY`

2. **Verify Access**
   - Ensure you have access to embedding models
   - Check usage limits and billing

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Server port | `3001` |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project ID | `my-patent-search` |
| `GOOGLE_CLOUD_KEY_FILE` | Path to service account JSON | `./keys/service-account.json` |
| `PINECONE_API_KEY` | Pinecone API key | `12345678-1234-1234-1234-123456789012` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-east-1-aws` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `my-patent-search` |
| `FIREBASE_CLIENT_EMAIL` | Service account email | `firebase-adminsdk-xyz@my-project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Private key (with \n escaped) | `"-----BEGIN PRIVATE KEY-----\n...` |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001` |
| `REACT_APP_FIREBASE_API_KEY` | Firebase web API key | `AIzaSyC...` |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `my-project.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID | `my-patent-search` |

## Security Notes

- ⚠️ **Never commit .env files to version control**
- ✅ Use environment.example files as templates
- ✅ Store sensitive keys securely
- ✅ Use different environments for development/production
- ✅ Rotate API keys regularly

## Testing Configuration

To verify your setup:

```bash
# Test backend
cd backend
npm run dev

# Test frontend (in another terminal)
cd frontend  
npm start
```

Visit http://localhost:3000 and try logging in.

## Troubleshooting

### Common Issues

1. **Firebase Private Key Format**
   - Ensure newlines are properly escaped: `\n`
   - Wrap in double quotes if contains spaces

2. **Google Cloud Permissions**
   - Service account needs BigQuery User role
   - Check project ID matches exactly

3. **Pinecone Connection**
   - Verify index exists with correct dimensions
   - Check environment name format

4. **CORS Issues**
   - Ensure `CORS_ORIGINS` includes frontend URL
   - Check Firebase project settings

### Debug Mode

Set `LOG_LEVEL=debug` in backend .env for detailed logs.

## Production Deployment

For production, use different environment files:
- Use production Firebase project
- Use production Pinecone environment  
- Set `NODE_ENV=production`
- Use secure hosting for private keys 