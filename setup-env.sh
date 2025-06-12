#!/bin/bash

echo "🔧 Setting up environment files for Patent Search System..."

# Backend environment
if [ ! -f backend/.env ]; then
    echo "📁 Creating backend/.env from template..."
    cp backend/environment.example backend/.env
    echo "✅ Created backend/.env - Please edit with your actual values"
else
    echo "⚠️  backend/.env already exists"
fi

# Frontend environment  
if [ ! -f frontend/.env ]; then
    echo "📁 Creating frontend/.env from template..."
    cp frontend/environment.example frontend/.env
    echo "✅ Created frontend/.env - Please edit with your actual values"
else
    echo "⚠️  frontend/.env already exists"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Edit backend/.env with your API keys and configuration"
echo "2. Edit frontend/.env with your Firebase configuration"
echo "3. See ENVIRONMENT_SETUP.md for detailed setup instructions"
echo "4. Run: npm install in both backend/ and frontend/ directories"
echo "5. Run: npm run dev (backend) and npm start (frontend)"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "   - ENVIRONMENT_SETUP.md"
echo "   - setup.md"
echo ""
echo "🔒 Security reminder: Never commit .env files to version control!" 