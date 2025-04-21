#!/bin/sh

set -e

echo "[INFO] Wiping old Dgraph state (TEMPORARY)..."
rm -rf /dgraph/p /dgraph/w /dgraph/zw

echo "[INFO] Starting Dgraph Zero..."
dgraph zero --my=127.0.0.1:5080 --replicas 1 &

sleep 5

echo "[INFO] Starting Dgraph Alpha..."
dgraph alpha --my=127.0.0.1:7080 --zero=127.0.0.1:5080 --security whitelist=0.0.0.0/0 &

# Wait for GraphQL Admin API to be ready
echo "[INFO] Waiting for GraphQL admin API..."
until curl -sf -o /dev/null http://127.0.0.1:8080/admin/schema; do
  echo "[INFO] GraphQL admin not ready, sleeping 5s..."
  sleep 5
done

# Verify schema file exists
if [ ! -f /schema.graphql ]; then
  echo "[ERROR] schema.graphql not found in container at /schema.graphql"
  ls -l /  # List root contents to help debugging
  exit 1
fi

echo "[INFO] Applying GraphQL schema..."
curl -sf -X POST http://127.0.0.1:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql || {
    echo "[ERROR] Failed to apply schema"
    exit 1
}

echo "[INFO] Schema applied. Waiting for background processes..."
wait
