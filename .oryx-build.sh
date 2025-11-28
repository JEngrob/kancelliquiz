#!/bin/bash
# Azure Oryx build script for Quiz Game
# This script runs during Azure App Service deployment

set -e

echo "Starting Azure Oryx build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build Next.js application
echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"
