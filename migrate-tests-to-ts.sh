#!/bin/bash
# migrate-tests-to-ts.sh - Complete TypeScript test migration script

echo "🔄 Starting complete test migration to TypeScript..."

# 1. Rename all .js test files to .ts
echo "📝 Renaming test files from .js to .ts..."
find api/__tests__ -name "*.js" -print0 | while IFS= read -r -d '' file; do
    mv "$file" "${file%.js}.ts"
    echo "Renamed: $file → ${file%.js}.ts"
done

# 2. Rename jest.setup.js to jest.setup.ts
if [ -f "api/jest.setup.js" ]; then
    mv api/jest.setup.js api/jest.setup.ts
    echo "Renamed: api/jest.setup.js → api/jest.setup.ts"
fi

echo "✅ File renaming complete!"
echo "🔄 Next: Update Jest configuration and convert imports..."
