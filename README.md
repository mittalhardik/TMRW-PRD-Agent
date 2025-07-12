# Product Manager AI Assistant with RAG Engine

A comprehensive AI-powered product management assistant that leverages Retrieval-Augmented Generation (RAG) to provide intelligent, context-aware responses for product managers.

## 🚀 Features

### RAG-Powered Agents
All agents now use the RAG Engine for enhanced responses:

1. **Ideation Agent** - Brainstorms new features and ideas using knowledge base
2. **PRD Authoring Agent** - Creates PRDs from source materials with best practices
3. **PRD Review Agent** - Analyzes PRDs for quality and alignment
4. **Retrieval Agent** - Direct access to RAG Engine knowledge base
5. **Document Upload Agent** - Upload documents to enhance the knowledge base

### RAG Engine Benefits
- **Context-Aware Responses**: All agents leverage the knowledge base for more relevant answers
- **Document Ingestion**: Upload PDFs, DOCs, TXT files to enhance knowledge
- **Real-time Retrieval**: Access to up-to-date information from ingested documents
- **Scalable Architecture**: Built on Google Cloud Vertex AI RAG Engine
- **Automatic Authentication**: Works seamlessly on Cloud Run with default credentials

## 🏗️ Architecture

```
Frontend (React) ←→ Backend (Node.js) ←→ Vertex AI RAG Engine
     ↓                    ↓                      ↓
  UI Components    Express API Server    Google Cloud RAG
     ↓                    ↓                      ↓
  Agent Interface   RAG Query/Ingest    Document Storage
```

## 🛠️ Technology Stack

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Fetch API** - HTTP requests

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Multer** - File upload handling
- **Google GenAI** - AI model integration
- **Google Auth** - Authentication

### RAG Engine
- **Google Cloud Vertex AI** - RAG Engine service
- **Gemini 2.5 Flash** - Language model
- **Document Storage** - Corpus management

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- Google Cloud Project with Vertex AI enabled
- RAG Engine and Corpus configured in Vertex AI
- Google Cloud CLI (for automatic setup)

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd product-manager-ai
npm install
```

## 🔐 Authentication Setup

### Option 1: Cloud Run (Recommended for Production)
Cloud Run uses automatic authentication with default credentials:

```bash
# Set up Cloud Run permissions
./setup-cloud-run.sh

# Set up Cloud Build permissions (for deployment)
./setup-cloud-build-permissions.sh

# Deploy to Cloud Run
gcloud run deploy tmrw-prd-agent \
  --source=backend \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080
```

### Option 2: Local Development
For local development, use service account credentials:

```bash
cd backend

# Create new service account (requires gcloud CLI)
./setup-credentials.sh

# OR use existing service account key file
./setup-existing-credentials.sh
```

### Option 3: Manual Setup
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

### Option 4: Environment File
Create a `.env` file in the backend directory:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
GCLOUD_PROJECT_ID=your-project-id
GCLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
VERTEX_RAG_CORPUS=projects/your-project/locations/us-central1/ragCorpora/your-corpus-id
VERTEX_RAG_ENGINE=projects/your-project/locations/us-central1/ragEngines/your-engine-id
```

## 🚀 Running the Application

### Local Development
1. Set up credentials (see above)
2. Start the backend:
```bash
cd backend
npm run dev
```

3. Start the frontend:
```bash
cd product-manager-ai
npm start
```

4. Open http://localhost:3000 in your browser

### Cloud Run Deployment
1. Set up Cloud Run permissions:
```bash
./setup-cloud-run.sh
```

2. Set up Cloud Build permissions:
```bash
./setup-cloud-build-permissions.sh
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy tmrw-prd-agent \
  --source=backend \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080
```

4. Access the application at the provided Cloud Run URL

### Production Mode (Local)
1. Build the frontend:
```bash
cd product-manager-ai
npm run build
```

2. Start the backend (serves both API and static files):
```bash
cd backend
npm start
```

3. Open http://localhost:8080 in your browser

## 📚 API Endpoints

### Health Check
```
GET /health
```
Returns detailed service status, including credential configuration and environment type.

### RAG Query
```
POST /rag/query
Content-Type: application/json

{
  "query": "What are the key features of our product?"
}
```

### Document Upload
```
POST /rag/ingest
Content-Type: multipart/form-data

document: [file]
```

### Status
```
GET /status
```
Returns RAG Engine configuration and setup instructions.

## 🔧 RAG Engine Configuration

### Supported File Types
- PDF documents (.pdf)
- Word documents (.doc, .docx)
- Text files (.txt)
- Markdown files (.md)

### File Size Limits
- Maximum file size: 50MB
- Recommended: Keep files under 10MB for faster processing

### RAG Engine Settings
- **Model**: Gemini 2.5 Flash
- **Temperature**: 1.0 (creative responses)
- **Max Output Tokens**: 65,535
- **Similarity Top-K**: 20 (retrieval depth)

### Authentication Types
- **Cloud Run**: Automatic default credentials
- **Local Development**: Service account JSON key
- **Environment Detection**: Automatic detection of environment

## 🎯 Usage Guide

### 1. Setup Authentication
Choose your deployment method:

**For Cloud Run (Production):**
```bash
./setup-cloud-run.sh
./setup-cloud-build-permissions.sh
```

**For Local Development:**
```bash
cd backend
./setup-credentials.sh
```

### 2. Upload Documents
1. Navigate to "Document Upload" agent
2. Select a supported file type
3. Click "Upload to RAG Engine"
4. Wait for confirmation

### 3. Use Ideation Agent
1. Select "Ideation Agent"
2. Enter your brainstorming prompt
3. Get AI-generated ideas based on knowledge base

### 4. Create PRDs
1. Select "PRD Authoring Agent"
2. Provide meeting notes, user stories, or instructions
3. Generate comprehensive PRDs with best practices

### 5. Review PRDs
1. Select "PRD Review Agent"
2. Paste your PRD and reference materials
3. Get detailed quality analysis

### 6. Direct Retrieval
1. Select "Retrieval Agent"
2. Ask specific questions
3. Get relevant information from knowledge base

## 🔍 Troubleshooting

### Common Issues

**Credentials Not Configured**
```bash
# Check if credentials are set
echo $GOOGLE_APPLICATION_CREDENTIALS

# For local development
cd backend
./setup-credentials.sh

# For Cloud Run
./setup-cloud-run.sh
```

**Cloud Build Permission Denied**
```bash
# Set up Cloud Build permissions
./setup-cloud-build-permissions.sh
```

**RAG Engine Connection Error**
- Verify Google Cloud credentials
- Check RAG Engine and Corpus IDs
- Ensure Vertex AI API is enabled
- Run health check: `curl http://localhost:8080/health`

**Cloud Run Authentication Issues**
- Ensure service account has proper permissions
- Check if APIs are enabled
- Verify Cloud Run service account setup

**File Upload Failures**
- Check file size (max 50MB)
- Verify file type is supported
- Ensure stable internet connection

**Empty Responses**
- Check if knowledge base has relevant documents
- Try rephrasing your query
- Verify RAG Engine is properly configured

### Debug Information
- Backend logs show detailed request/response information
- Health endpoint provides configuration details and environment type
- Status endpoint shows RAG Engine settings
- Check `/health` endpoint for credential status

## 🔒 Security Considerations

- All API calls use Google Cloud authentication
- File uploads are validated for type and size
- Temporary files are automatically cleaned up
- No sensitive data is stored locally
- Service account keys should be kept secure
- Cloud Run uses secure default credentials

## 📈 Performance Optimization

- RAG Engine uses streaming responses for large queries
- File uploads are processed asynchronously
- Response caching can be implemented for frequently asked questions
- Consider implementing rate limiting for production use
- Cloud Run provides automatic scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review backend logs for error details
3. Verify RAG Engine configuration
4. Run health check endpoint
5. Contact the development team

---

**Note**: This is a functional prototype. All agent responses are generated by the RAG Engine and should be verified for accuracy in production use. 