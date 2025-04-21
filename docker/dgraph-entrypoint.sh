#!/bin/sh
set -e

# Start Dgraph Zero in the background
dgraph zero --my=localhost:5080 &

# Wait briefly for Zero to initialize
sleep 5

# Start Dgraph Alpha in the background, explicitly joining Zero
dgraph alpha --my=localhost:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0 &

# Wait for GraphQL admin API to be healthy
echo "Waiting for GraphQL admin API…"
until curl -sf -o /dev/null http://localhost:8080/admin/schema; do
  echo "GraphQL admin not ready, sleeping 5s…"
  sleep 5
done

# Apply the GraphQL schema
echo "Applying GraphQL schema…"
curl -sf -X POST http://localhost:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @/schema.graphql

# Keep the container running by waiting on background processes
  fi
  echo "Schema applied."
  break
done

# Keep container running by waiting on background processes
wait
