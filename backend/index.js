// Remove hardcoded service account JSON path for Google Cloud authentication
// Use default credentials provided by Cloud Run
// process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || "/Users/mittal.hardik-int/Downloads/gen-lang-client-0723709535-e9dff5a688b8.json";

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

const app = express();

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Check Google Cloud credentials on startup
const checkCredentials = async () => {
  const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (isCloudRun) {
    console.log('☁️  Running on Cloud Run - using default credentials');
    try {
      // Test authentication by trying to get a client
      const auth = new GoogleAuth({ 
        scopes: 'https://www.googleapis.com/auth/cloud-platform' 
      });
      const client = await auth.getClient();
      const projectId = await auth.getProjectId();
      console.log(`✅ Cloud Run authentication successful for project: ${projectId}`);
      return true;
    } catch (error) {
      console.log(`❌ Cloud Run authentication failed: ${error.message}`);
      return false;
    }
  }
  
  // Local development
  if (!credsPath) {
    console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set for local development');
    console.log('📝 For local development, run one of these setup scripts:');
    console.log('   ./setup-credentials.sh (creates new service account)');
    console.log('   ./setup-existing-credentials.sh (uses existing key file)');
    console.log('📖 Or set the environment variable manually:');
    console.log('   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json');
    return false;
  }
  
  if (!fs.existsSync(credsPath)) {
    console.log(`❌ Credentials file not found: ${credsPath}`);
    console.log('📝 Please check the file path and try again');
    return false;
  }
  
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (!creds.client_email || !creds.private_key) {
      console.log('❌ Invalid service account key format');
      return false;
    }
    console.log(`✅ Using local credentials for: ${creds.client_email}`);
    return true;
  } catch (error) {
    console.log(`❌ Error reading credentials: ${error.message}`);
    return false;
  }
};

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 RAG Engine Backend listening on port ${port}`);
  console.log(`📊 Health check available at: http://localhost:${port}/health`);
  console.log(`🔍 RAG Query endpoint: http://localhost:${port}/rag/query`);
  console.log(`📤 Document upload endpoint: http://localhost:${port}/rag/ingest`);
  
  // Check credentials after server starts
  checkCredentials().then(hasCredentials => {
    if (!hasCredentials) {
      console.log('⚠️  RAG Engine features may not work without proper credentials');
    }
  });
});

const PROJECT_ID = process.env.GCLOUD_PROJECT_ID || 'gen-lang-client-0723709535';
const LOCATION = process.env.GCLOUD_LOCATION || 'us-central1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const RAG_CORPUS = process.env.VERTEX_RAG_CORPUS || 'projects/gen-lang-client-0723709535/locations/us-central1/ragCorpora/2305843009213693952';

// RAG Engine resource name (update if needed)
const RAG_ENGINE = process.env.VERTEX_RAG_ENGINE || 'projects/gen-lang-client-0723709535/locations/us-central1/ragEngines/2305843009213693952';

app.use(cors());
app.use(express.json());

// Set up multer for file uploads with enhanced configuration
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: PDF, DOC, DOCX, TXT, MD`));
    }
  }
});

// Health check with detailed status
app.get('/health', async (req, res) => {
  const credentialsStatus = await checkCredentials();
  const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
  
  const healthStatus = {
    status: credentialsStatus ? 'ok' : 'warning',
    timestamp: new Date().toISOString(),
    service: 'RAG Engine Backend',
    version: '1.0.0',
    environment: isCloudRun ? 'cloud-run' : 'local',
    credentials: {
      configured: credentialsStatus,
      type: isCloudRun ? 'default-cloud-run' : 'service-account',
      path: isCloudRun ? 'default' : (process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set')
    },
    endpoints: {
      health: '/health',
      ragQuery: '/rag/query',
      ragIngest: '/rag/ingest',
      status: '/status'
    },
    configuration: {
      projectId: PROJECT_ID,
      location: LOCATION,
      model: MODEL,
      ragCorpus: RAG_CORPUS,
      ragEngine: RAG_ENGINE
    }
  };
  
  res.json(healthStatus);
});

// Status endpoint for RAG Engine configuration
app.get('/status', async (req, res) => {
  const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
  
  res.json({
    ragEngine: {
      corpus: RAG_CORPUS,
      engine: RAG_ENGINE,
      model: MODEL,
      location: LOCATION,
      project: PROJECT_ID
    },
    uploads: {
      directory: 'uploads/',
      maxFileSize: '50MB',
      supportedTypes: ['PDF', 'DOC', 'DOCX', 'TXT', 'MD']
    },
    environment: {
      type: isCloudRun ? 'cloud-run' : 'local',
      service: isCloudRun ? process.env.K_SERVICE : 'local-development'
    },
    credentials: {
      configured: await checkCredentials(),
      type: isCloudRun ? 'default-cloud-run' : 'service-account',
      setupInstructions: isCloudRun ? [
        'Cloud Run uses default credentials automatically'
      ] : [
        'Run ./setup-credentials.sh to create a new service account',
        'Run ./setup-existing-credentials.sh to use existing key file',
        'Or set GOOGLE_APPLICATION_CREDENTIALS environment variable'
      ]
    }
  });
});

// Enhanced RAG Query Endpoint
app.post('/rag/query', async (req, res) => {
  try {
    // Check credentials first
    const hasCredentials = await checkCredentials();
    if (!hasCredentials) {
      const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
      return res.status(500).json({
        error: 'Google Cloud credentials not configured',
        type: 'CREDENTIALS_ERROR',
        environment: isCloudRun ? 'cloud-run' : 'local',
        setupInstructions: isCloudRun ? [
          'Cloud Run should use default credentials automatically',
          'Check if the service account has proper permissions'
        ] : [
          'Run ./setup-credentials.sh to create a new service account',
          'Run ./setup-existing-credentials.sh to use existing key file',
          'Or set GOOGLE_APPLICATION_CREDENTIALS environment variable'
        ],
        timestamp: new Date().toISOString()
      });
    }

    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Missing query in request body.',
        required: 'query field',
        example: { query: 'What are the key features of our product?' }
      });
    }

    console.log(`🔍 Processing RAG query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

    // System instruction and tools setup
    const siText1 = { text: `Perform a Comprehensive Review of the given 'Product Requirement Document' using the given Context.\nFlag any unwanted or incorrect text.\nGenerate an Improved and Comprehensive PRD.` };
    const tools = [
      {
        retrieval: {
          vertexRagStore: {
            ragCorpora: [RAG_CORPUS],
            similarityTopK: 20
          }
        }
      }
    ];
    const generationConfig = {
      maxOutputTokens: 65535,
      temperature: 1,
      topP: 1,
      seed: 0,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
      ],
      tools: tools,
      systemInstruction: { parts: [siText1] },
    };

    // Initialize Vertex with your Cloud project and location
    const ai = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    });
    const chat = ai.chats.create({
      model: MODEL,
      config: generationConfig,
    });

    // Send the user query as the message
    const msg = { text: query };
    let result = '';
    const response = await chat.sendMessageStream({ message: [msg] });
    
    console.log('📤 Streaming response from RAG Engine...');
    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }
    
    console.log(`✅ RAG query completed. Response length: ${result.length} characters`);
    res.json({ 
      result,
      metadata: {
        queryLength: query.length,
        responseLength: result.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ RAG Query Error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      type: 'RAG_QUERY_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced Document Ingestion Endpoint
app.post('/rag/ingest', upload.single('document'), async (req, res) => {
  try {
    // Check credentials first
    const hasCredentials = await checkCredentials();
    if (!hasCredentials) {
      const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
      return res.status(500).json({
        error: 'Google Cloud credentials not configured',
        type: 'CREDENTIALS_ERROR',
        environment: isCloudRun ? 'cloud-run' : 'local',
        setupInstructions: isCloudRun ? [
          'Cloud Run should use default credentials automatically',
          'Check if the service account has proper permissions'
        ] : [
          'Run ./setup-credentials.sh to create a new service account',
          'Run ./setup-existing-credentials.sh to use existing key file',
          'Or set GOOGLE_APPLICATION_CREDENTIALS environment variable'
        ],
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded.',
        required: 'document file',
        supportedTypes: ['PDF', 'DOC', 'DOCX', 'TXT', 'MD']
      });
    }
    
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    
    console.log(`📤 Processing document upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    
    const fileBuffer = fs.readFileSync(filePath);

    // Get access token
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Prepare multipart request for Vertex AI RAG Engine Ingest API
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
    const metadata = JSON.stringify({
      documentId: fileName,
      mimeType: mimeType,
      displayName: fileName
    });
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    // Log RAG Engine resource and endpoint
    console.log('🔧 RAG_ENGINE:', RAG_ENGINE);
    const endpointUrl = `https://us-central1-aiplatform.googleapis.com/v1beta/${RAG_ENGINE}:ingestDocuments`;
    console.log('📡 Ingest endpoint:', endpointUrl);

    // Call Vertex AI RAG Engine Ingest API
    let response, text, result;
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token || accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    text = await response.text();
    try {
      result = JSON.parse(text);
    } catch (jsonErr) {
      // If JSON parsing fails, log and return the raw response text
      console.error('❌ Non-JSON response from Vertex AI:', text);
      fs.unlinkSync(filePath);
      return res.status(500).json({ 
        error: 'Non-JSON response from Vertex AI', 
        details: text,
        type: 'VERTEX_AI_ERROR'
      });
    }
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    if (!response.ok) {
      console.error('❌ Document ingestion failed:', result);
      return res.status(500).json({ 
        error: result.error || 'Failed to ingest document.', 
        details: result,
        type: 'INGESTION_ERROR'
      });
    }
    
    console.log(`✅ Document successfully ingested: ${fileName}`);
    res.json({ 
      status: 'success', 
      result,
      metadata: {
        fileName,
        fileSize,
        mimeType,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Document Ingestion Error:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      type: 'INGESTION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    type: 'UNHANDLED_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../product-manager-ai/build')));

// The "catchall" handler: for any request that doesn't match an API route, send back React's index.html
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../product-manager-ai/build', 'index.html'));
  } catch (err) {
    console.error('❌ Error in catch-all route:', err);
    res.status(500).send('Internal Server Error');
  }
}); 