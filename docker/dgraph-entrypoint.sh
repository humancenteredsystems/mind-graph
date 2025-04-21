#!/bin/sh
set -e

# Start Dgraph Zero
dgraph zero --my=localhost:5080 &

# Wait for Zero to be ready
sleep 5

# Start Dgraph Alpha in the background
dgraph alpha --my=alpha:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0 &

# Wait until GraphQL admin API truly returns 2xx
echo "Waiting for GraphQL admin API..."
until curl -sf -o /dev/null http://localhost:8080/admin/schema; do
  echo "GraphQL admin not ready (HTTP >=400), sleeping..."
  sleep 5
done

echo "Applying GraphQL schema..."
max_tries=5
for i in $(seq 1 $max_tries); do
  echo "Attempt $i to load schema..."
  response=$(curl -s -X POST http://localhost:8080/admin/schema \
    -H "Content-Type: application/graphql" \
    --data-binary @/schema.graphql)
  if echo "$response" | grep -q '"errors"'; then
    echo "Schema push returned errors: $response"
    echo "Retrying in 5 seconds..."
    sleep 5
    continue
  fi
  echo "Schema applied."
  break
done

# Keep container running by waiting on background processes
wait
