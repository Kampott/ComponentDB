#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

echo "Running tests in backend container..."

# Check if backend container is running
if ! docker compose ps --services --filter "status=running" | grep -q "^backend$"; then
    echo "Error: backend container is not running."
    echo "Start it with: cd $PROJECT_DIR && docker compose up -d backend"
    exit 1
fi

# Run tests inside the backend container
echo "Executing pytest in backend container..."
docker compose exec backend pytest tests/ -v --tb=short

echo "Tests completed with exit code: $?"
