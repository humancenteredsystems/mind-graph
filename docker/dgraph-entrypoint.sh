#!/bin/sh

set -e

echo "[INFO] Wiping old Dgraph state (TEMPORARY)..."
rm -rf /dgraph/p /dgraph/w /dgraph/zw

echo "[INFO] Starting Dgraph Zero..."
dgraph zero --my=127.0.0.1:5080 --replicas 1 &

sleep 5

echo "[INFO] Starting Dgraph Alpha..."
dgraph alpha --my=127.0.0.1:7080 --zero=127.0.0.1:5080 --security whitelist=0.0.0.0/0 &

# Verify schema file exists
if [ ! -f /schema.graphql ]; then
  echo "[ERROR] schema.graphql not found in container at /schema.graphql"
  ls -l /  # List root contents to help debugging
  exit 1
fi

# Try applying schema until successful
echo "[INFO] Waiting for GraphQL admin API to accept schema..."
until curl -s -X POST http://127.0.0.1:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql | grep -q '"code":"Success"'; do
  echo "[INFO] Admin API not ready for schema, sleeping 5s..."
  sleep 5
done

echo "[INFO] GraphQL schema applied successfully."


echo "[INFO] Schema applied. Waiting for background processes..."
wait
