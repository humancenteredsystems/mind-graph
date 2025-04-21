#!/bin/sh
echo "[INFO] Wiping old Dgraph state (TEMPORARY)..."
rm -rf /dgraph/p /dgraph/w /dgraph/zw

set -e

echo "Starting Dgraph Zero..."
dgraph zero --my=127.0.0.1:5080 --replicas 1 &

sleep 5

echo "Starting Dgraph Alpha..."
dgraph alpha --my=127.0.0.1:7080 --zero=127.0.0.1:5080 --security whitelist=0.0.0.0/0 &

# Wait for GraphQL Admin API to be ready
echo "Waiting for GraphQL admin API..."
until curl -sf -o /dev/null http://127.0.0.1:8080/admin/schema; do
  echo "GraphQL admin not ready, sleeping 5s..."
  sleep 5
done

# Apply GraphQL schema
echo "Applying GraphQL schema..."
curl -sf -X POST http://127.0.0.1:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql

echo "Schema applied. Waiting for background processes..."
wait
