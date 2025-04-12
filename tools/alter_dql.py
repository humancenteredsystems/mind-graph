#!/usr/bin/env python3
"""
Attempt to alter Dgraph schema using DQL via the /alter endpoint.
"""
import requests
import sys
from utils import logger, DEFAULT_ADMIN_ENDPOINT

# Define a simple DQL schema alteration
# This defines the 'label' predicate as a string with a term index
DQL_SCHEMA_ALTERATION = """
label: string @index(term) .
"""

# Dgraph /alter endpoint
ALTER_ENDPOINT = f"{DEFAULT_ADMIN_ENDPOINT.replace('/admin', '')}/alter" # Usually http://localhost:8080/alter

def alter_schema_dql():
    """Sends a DQL schema alteration to the /alter endpoint."""
    headers = {"Content-Type": "application/dql"}
    logger.info(f"Attempting DQL schema alteration via {ALTER_ENDPOINT}")
    logger.info(f"Alteration payload:\n{DQL_SCHEMA_ALTERATION.strip()}")

    try:
        response = requests.post(ALTER_ENDPOINT, data=DQL_SCHEMA_ALTERATION, headers=headers)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        logger.info(f"DQL Alter request successful (Status: {response.status_code})")
        logger.info(f"Response body: {response.text}")
        # Note: A 200 OK from /alter usually means the request was accepted,
        # but doesn't guarantee the alteration was fully processed without errors.
        # Check Dgraph Alpha logs for confirmation or errors.
        return 0

    except requests.RequestException as e:
        logger.error(f"Failed to send DQL alter request: {str(e)}")
        if hasattr(response, 'text'):
            logger.error(f"Response: {response.text}")
        return 1
    except Exception as e:
        logger.error(f"An unexpected error occurred: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(alter_schema_dql())
