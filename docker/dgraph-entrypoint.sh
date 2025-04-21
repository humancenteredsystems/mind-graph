#!/bin/sh
set -e

echo "Starting Dgraph Zero..."
dgraph zero --my=localhost:5080 &

# Give Zero some time to come up
sleep 3

echo "Starting Dgraph Alpha..."
dgraph alpha --my=localhost:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0 &

# Wait for the GraphQL admin API to become available
echo "Waiting for GraphQL admin API..."
until curl -sf -o /dev/null http://localhost:8080/admin/schema; do
  echo "GraphQL admin not ready, sleeping..."
  sleep 2
done

echo "GraphQL admin ready. Applying schema..."
curl -sf -X POST http://localhost:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql

echo "✅ Schema applied. Dgraph is fully initialized."

# Keep the container running
wait
