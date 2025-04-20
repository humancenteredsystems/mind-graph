#!/bin/sh
set -e

# Start Dgraph Zero
dgraph zero --my=0.0.0.0:5080 &

# Wait for Zero to be ready
sleep 5

# Start Dgraph Alpha in the background
dgraph alpha --my=alpha:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0 &

# Wait for Alpha's GraphQL admin to be ready
sleep 10
echo "Applying GraphQL schema..."
max_tries=5
for i in $(seq 1 $max_tries); do
  echo "Attempt $i to load schema..."
  if curl --fail -X POST http://localhost:8080/admin/schema \
    -H "Content-Type: application/graphql" \
    --data-binary @/schema.graphql; then
    echo "Schema applied."
    break
  else
    echo "Schema push failed, retrying in 5 seconds..."
    sleep 5
  fi
done

# Keep container running by waiting on background processes
wait
