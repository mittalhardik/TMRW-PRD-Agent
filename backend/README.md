# Vertex AI RAG Backend

This backend provides endpoints for:
- Querying Google Vertex AI RAG for context retrieval and grounding
- Ingesting additional documents into Vertex AI RAG index

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Google Cloud credentials:
   - Place your service account JSON key in a secure location.
   - Set the environment variable:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account.json
     ```

3. Start the server:
   ```bash
   node index.js
   ```

## Endpoints

### Health Check
- `GET /health`

### RAG Query
- `POST /rag/query`
  - Body: `{ "query": "<user query>" }`
  - Returns: `{ "context": "...", "chunks": [...] }`

### Document Ingestion
- `POST /rag/ingest`
  - Form-data: `document` (file)
  - Returns: `{ "status": "success" }` on success

## Notes
- You must have access to Vertex AI RAG and a configured index.
- The endpoints are placeholders until Vertex AI integration is complete. 