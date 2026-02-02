#!/bin/bash
set -e

# Local Docker deployment script for testing
echo "🏠 Building and running DivvyDo locally with Docker"
echo "===================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy .env.example to .env and fill in your values."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build the image
echo ""
echo "🔨 Building Docker image..."
docker build -t divvydo:local .

# Stop and remove existing container if running
echo ""
echo "🧹 Cleaning up existing container..."
docker stop divvydo 2>/dev/null || true
docker rm divvydo 2>/dev/null || true

# Run the container
echo ""
echo "🚀 Starting container..."
docker run -d \
    --name divvydo \
    -p 8080:8080 \
    -e VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    -e VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
    divvydo:local

echo ""
echo "✅ DivvyDo is now running!"
echo ""
echo "🌐 Access the app at: http://localhost:8080"
echo "💚 Health check: http://localhost:8080/health"
echo ""
echo "📝 View logs with: docker logs -f divvydo"
echo "🛑 Stop with: docker stop divvydo"
