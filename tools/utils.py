"""
Utility functions for interacting with Dgraph GraphQL endpoint.
"""
import json
import requests
from typing import Dict, Any, Optional, Union
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('dgraph-tools')

# Default configuration
DEFAULT_ENDPOINT = "http://localhost:8080/graphql"
DEFAULT_ADMIN_ENDPOINT = "http://localhost:8080/admin"

def execute_graphql(
    query: str, 
    variables: Optional[Dict[str, Any]] = None, 
    endpoint: str = DEFAULT_ENDPOINT
) -> Dict[str, Any]:
    """
    Execute a GraphQL query or mutation against the Dgraph endpoint.
    
    Args:
        query: The GraphQL query or mutation string
        variables: Optional variables for the GraphQL operation
        endpoint: The GraphQL endpoint URL
        
    Returns:
        The JSON response from the server
        
    Raises:
        requests.RequestException: If the request fails
    """
    headers = {"Content-Type": "application/json"}
    payload = {"query": query}
    
    if variables:
        payload["variables"] = variables
    
    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"GraphQL request failed: {str(e)}")
        if hasattr(response, 'text'):
            logger.error(f"Response: {response.text}")
        raise

def push_schema_to_dgraph(
    schema: str, 
    endpoint: str = f"{DEFAULT_ADMIN_ENDPOINT}/schema"
) -> bool:
    """
    Push a GraphQL schema to Dgraph.
    
    Args:
        schema: The GraphQL schema string
        endpoint: The admin schema endpoint
        
    Returns:
        True if successful, False otherwise
    """
    headers = {"Content-Type": "application/graphql"}
    
    try:
        response = requests.post(endpoint, data=schema, headers=headers)
        response.raise_for_status()
        logger.info("Schema pushed successfully")
        return True
    except requests.RequestException as e:
        logger.error(f"Failed to push schema: {str(e)}")
        if hasattr(response, 'text'):
            logger.error(f"Response: {response.text}")
        return False

def get_timestamp_str() -> str:
    """
    Get a formatted timestamp string for filenames.
    
    Returns:
        A string in the format YYYYMMDD_HHMMSS
    """
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def save_json(data: Any, filename: str) -> None:
    """
    Save data as a JSON file.
    
    Args:
        data: The data to save
        filename: The output filename
    """
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Data saved to {filename}")

def load_json(filename: str) -> Any:
    """
    Load data from a JSON file.
    
    Args:
        filename: The input filename
        
    Returns:
        The loaded data
    """
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)
