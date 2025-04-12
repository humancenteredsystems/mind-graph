import requests

# Path to your schema file
SCHEMA_FILE = "schema.graphql"
DG_ENDPOINT = "http://localhost:8080/admin/schema"

def push_schema():
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_text = f.read()

    headers = {"Content-Type": "application/graphql"}

    response = requests.post(DG_ENDPOINT, data=schema_text, headers=headers)

    if response.status_code == 200:
        print("✅ Schema pushed successfully.")
    else:
        print(f"❌ Failed to push schema: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    push_schema()
