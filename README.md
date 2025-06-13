# Patent Search System

A modern patent search application with semantic vector search, keyword search, and Firebase authentication.

## 🚀 Quick Start

### 1. Environment Setup

**Backend:**
```bash
cd backend
cp sample.env .env
# Edit .env with your actual credentials
```

**Frontend:**
```bash
cd frontend  
cp sample.env .env
# Edit .env with your Firebase config
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
yarn install
```

### 3. Run the Application

**Start Backend (Terminal 1):**
```bash
cd backend
npm run dev
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
yarn start
```

**Access Application:**
- Frontend: http://localhost:3005
- Backend API: http://localhost:8000

## 🔧 Required Services

### Google Cloud Platform
1. Create a GCP project
2. Enable BigQuery API
3. Set up authentication (Service Account or ADC)
4. Update `GOOGLE_CLOUD_PROJECT_ID` in backend/.env

### Pinecone Vector Database
1. Create account at https://app.pinecone.io/
2. Create a sparse vector index
3. Update Pinecone configuration in backend/.env

### Firebase Authentication
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password + Google)
3. Add localhost:3005 to authorized domains
4. Update Firebase config in frontend/.env

## 📊 Features

- **Semantic Search**: Vector-based patent similarity using Pinecone
- **Keyword Search**: Full-text search across Google Patents dataset
- **Hybrid Search**: Combined semantic + keyword results
- **Authentication**: Secure Firebase Auth with auto token refresh
- **Real Data**: 161M+ patents from Google Patents Public Dataset

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Firebase Auth
- **Backend**: Node.js, Express, TypeScript
- **Database**: Google BigQuery (Google Patents Public Dataset)
- **Vector Search**: Pinecone (Sparse Vectors)
- **Authentication**: Firebase Auth 