import os
import sys

# Add the parent directory to the Python path to be able to import tools
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from tools.api_client import call_api

api_base = "http://localhost:3000/api"
api_key = "ShambotTrueBeliever" # Replace with your actual API key or get from env var

print(f"Attempting to call /debug/dgraph endpoint at {api_base}...")

response = call_api(api_base, "/debug/dgraph", api_key, method='GET')

print("\nAPI Response:")
print(response)
