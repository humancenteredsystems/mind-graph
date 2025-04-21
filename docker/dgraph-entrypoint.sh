#!/bin/sh
set -e

echo "Starting Dgraph Zero..."
dgraph zero --my=localhost:5080 &

# Wait for Zero to be ready
sleep 5

echo "Starting Dgraph Alpha..."
dgraph alpha --my=localhost:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0 &

# Wait for Alpha's GraphQL API to come online
echo "Waiting for GraphQL admin API..."
until curl -sf -o /dev/null http://localhost:8080/admin/schema; do
  echo "GraphQL admin not ready, sleeping 5s..."
  sleep 5
done

# Apply GraphQL schema
echo "Applying GraphQL schema..."
curl -sf -X POST http://localhost:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql

echo "Schema applied."

# Keep both processes running
wait
