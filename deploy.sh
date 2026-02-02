#!/bin/bash
set -e

# DivvyDo Deployment Script for Google Cloud Run
# Prerequisites:
# - gcloud CLI installed and configured
# - Docker installed
# - Project ID set in gcloud config

echo "🚀 DivvyDo Deployment Script"
echo "=============================="

# Check if required tools are installed
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI is required but not installed. Visit https://cloud.google.com/sdk/docs/install"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Visit https://docs.docker.com/get-docker/"; exit 1; }

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No GCP project configured. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📦 Project ID: $PROJECT_ID"

# Check if environment variables are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set"
    echo "These will need to be configured in Cloud Run after deployment"
fi

# Build and tag image
IMAGE_NAME="gcr.io/$PROJECT_ID/divvydo"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="$IMAGE_NAME:$TIMESTAMP"

echo ""
echo "🔨 Building Docker image..."
docker build -t "$IMAGE_TAG" -t "$IMAGE_NAME:latest" .

echo ""
echo "☁️  Pushing to Google Container Registry..."
docker push "$IMAGE_TAG"
docker push "$IMAGE_NAME:latest"

echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy divvydo \
    --image "$IMAGE_TAG" \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 8080 \
    --set-env-vars "VITE_SUPABASE_URL=${VITE_SUPABASE_URL},VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app is now live. Get the URL with:"
echo "   gcloud run services describe divvydo --region us-central1 --format 'value(status.url)'"
echo ""
echo "📝 To update environment variables later:"
echo "   gcloud run services update divvydo --region us-central1 --update-env-vars VITE_SUPABASE_URL=...,VITE_SUPABASE_ANON_KEY=..."
