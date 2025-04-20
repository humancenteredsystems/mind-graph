#!/bin/sh
set -e

# Start Dgraph Zero
dgraph zero --my=zero:5080 &

# Wait for Zero to be ready
sleep 5

# Start Dgraph Alpha
dgraph alpha --my=alpha:7080 --zero=localhost:5080 --security whitelist=0.0.0.0/0
