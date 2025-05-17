#!/bin/sh
set -e

echo "Starting Dgraph Zero on 127.0.0.1:5080..."
dgraph zero --my=127.0.0.1:5080 &

# Wait for Zero to initialize (consider increasing if 5s is not enough)
echo "Waiting 15 seconds for Zero to initialize..." # Increased sleep
sleep 15

echo "Starting Dgraph Alpha on 127.0.0.1:7080, connecting to Zero on 127.0.0.1:5080..."
# Alpha's gRPC for clients will be on 127.0.0.1:6080 (peer_port + 100)
# Alpha's HTTP for GraphQL/Admin will be on 127.0.0.1:8080 (default, or --graphql_port)
dgraph alpha \
  --my=127.0.0.1:7080 \
  --zero=127.0.0.1:5080 \
  --security whitelist=0.0.0.0/0 & # Keep original security setting

# Wait for the GraphQL admin endpoint to be available on Alpha's HTTP port
echo "Waiting for GraphQL admin API (127.0.0.1:8080)..."
# The original script used http://localhost:8080/admin/schema for the check.
# Let's use 127.0.0.1 consistently here too.
until curl -sf -o /dev/null http://127.0.0.1:8080/admin; do # /admin is a reasonable health check
  echo "GraphQL admin not ready, retrying in 5s…"
  sleep 5
done
echo "Dgraph Alpha (GraphQL admin) is ready."

# Apply the GraphQL schema
echo "Applying GraphQL schema (to 127.0.0.1:8080)..."
curl -sf -X POST http://127.0.0.1:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql && echo "Schema applied."

# Keep the container running by waiting on background processes
echo "Dgraph Zero and Alpha processes started. Waiting..."
wait
