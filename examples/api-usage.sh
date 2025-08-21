#!/bin/bash

# Langfuse Prompt Management API Usage Examples
# Make sure the server is running on localhost:8080

BASE_URL="http://localhost:8080/api/v1"

echo "🚀 Langfuse Prompt Management API Examples"
echo "=========================================="

# Health check
echo "🏥 Checking API health..."
curl -s "$BASE_URL/../health" | jq '.'
echo ""

# Create a prompt
echo "📝 Creating a prompt..."
PROMPT_RESPONSE=$(curl -s -X POST "$BASE_URL/prompts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-greeting",
    "content": "Hello {{name}}! Welcome to {{service}}.",
    "description": "API example greeting prompt",
    "tags": ["api", "greeting", "example"],
    "variables": {"name": "string", "service": "string"}
  }')

PROMPT_ID=$(echo "$PROMPT_RESPONSE" | jq -r '.data.id')
echo "Created prompt with ID: $PROMPT_ID"
echo ""

# Get the prompt
echo "📖 Retrieving the prompt..."
curl -s "$BASE_URL/prompts/$PROMPT_ID" | jq '.data | {id, name, content, tags}'
echo ""

# List all prompts
echo "📋 Listing all prompts..."
curl -s "$BASE_URL/prompts?limit=5" | jq '.data | length'
echo "Total prompts retrieved"
echo ""

# Create a template
echo "📧 Creating a template..."
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "api-email-template",
    "content": "Dear {{name}},\n\n{{content}}\n\nBest regards,\n{{sender}}",
    "description": "API example email template",
    "tags": ["api", "email", "template"],
    "syntax": "simple",
    "defaultValues": {"sender": "API System"}
  }')

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.data.id')
echo "Created template with ID: $TEMPLATE_ID"
echo ""

# Render the template
echo "🎨 Rendering the template..."
curl -s -X POST "$BASE_URL/templates/$TEMPLATE_ID/render" \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "name": "API User",
      "content": "Thank you for using our API! This is a test message."
    }
  }' | jq '.data.rendered'
echo ""

# Create a chain
echo "🔗 Creating a chain..."
CHAIN_RESPONSE=$(curl -s -X POST "$BASE_URL/chains" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"api-workflow\",
    \"description\": \"API example workflow\",
    \"tags\": [\"api\", \"workflow\"],
    \"steps\": [
      {
        \"name\": \"greeting-step\",
        \"type\": \"prompt\",
        \"resourceId\": \"$PROMPT_ID\"
      },
      {
        \"name\": \"email-step\",
        \"type\": \"template\",
        \"resourceId\": \"$TEMPLATE_ID\"
      }
    ],
    \"executionOrder\": \"sequential\"
  }")

CHAIN_ID=$(echo "$CHAIN_RESPONSE" | jq -r '.data.id')
echo "Created chain with ID: $CHAIN_ID"
echo ""

# Execute the chain
echo "⚡ Executing the chain..."
curl -s -X POST "$BASE_URL/chains/$CHAIN_ID/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "initialData": {
      "name": "API Tester",
      "service": "Langfuse Prompt Manager",
      "content": "Your chain execution was successful!"
    }
  }' | jq '.data | {status, totalExecutionTime, stepResults: (.stepResults | length)}'
echo ""

# Get system metadata
echo "📊 Getting system statistics..."
curl -s "$BASE_URL/metadata/stats" | jq '.data | {totalPrompts, totalTemplates, totalChains, uniqueAuthors}'
echo ""

# Search across all resources
echo "🔍 Searching for 'api'..."
curl -s -X POST "$BASE_URL/metadata/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "api"}' | jq '.data | {prompts: (.prompts | length), templates: (.templates | length), chains: (.chains | length), totalResults}'
echo ""

# Get recent activity
echo "📈 Getting recent activity..."
curl -s "$BASE_URL/metadata/activity/recent?limit=5" | jq '.data | length'
echo "Recent activities retrieved"
echo ""

echo "✅ API examples completed successfully!"
echo "🔗 Full API documentation available at: http://localhost:8080/info"
