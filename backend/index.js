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
const { Storage } = require('@google-cloud/storage');

// Add node-fetch for GitHub API calls and Jira API calls
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

// Utility to resolve the React build directory for both local and cloud environments
function resolveReactBuildPath() {
  const localBuild = path.join(__dirname, '../product-manager-ai/build');
  const backendBuild = path.join(__dirname, './build');
  if (fs.existsSync(localBuild) && fs.existsSync(path.join(localBuild, 'index.html'))) {
    return localBuild;
  }
  if (fs.existsSync(backendBuild) && fs.existsSync(path.join(backendBuild, 'index.html'))) {
    return backendBuild;
  }
  return null;
}

// Update checkReactBuild to use the new utility
const checkReactBuild = () => {
  const buildPath = resolveReactBuildPath();
  if (!buildPath) {
    console.log('⚠️  React build directory not found');
    console.log('📝 To build the frontend, run:');
    console.log('   cd product-manager-ai && npm install && npm run build');
    return false;
  }
  const indexPath = path.join(buildPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  React build files not found');
    console.log('📝 To build the frontend, run:');
    console.log('   cd product-manager-ai && npm install && npm run build');
    return false;
  }
  console.log('✅ React build files found at', buildPath);
  return true;
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
  
  // Check React build files
  const hasReactBuild = checkReactBuild();
  if (!hasReactBuild) {
    console.log('💡 API endpoints are still available at:');
    console.log('   - http://localhost:8080/health');
    console.log('   - http://localhost:8080/rag/query');
    console.log('   - http://localhost:8080/rag/ingest');
  }
});

const PROJECT_ID = process.env.GCLOUD_PROJECT_ID || 'gen-lang-client-0723709535';
const LOCATION = process.env.GCLOUD_LOCATION || 'us-central1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'tmrw_prd_agent';
const RAG_CORPUS = process.env.VERTEX_RAG_CORPUS || `projects/${PROJECT_ID}/locations/${LOCATION}/ragCorpora/2305843009213693952`;

// RAG Engine resource name (update if needed)
const RAG_ENGINE = process.env.VERTEX_RAG_ENGINE || `projects/${PROJECT_ID}/locations/${LOCATION}/ragEngines/2305843009213693952`;

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
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: PDF, DOC, DOCX, TXT, MD, PNG, JPG, JPEG, GIF, WEBP`));
    }
  }
});

// Health check with detailed status
app.get('/health', async (req, res) => {
  const credentialsStatus = await checkCredentials();
  const isCloudRun = process.env.K_SERVICE || process.env.K_REVISION;
  const hasReactBuild = checkReactBuild();
  
  const healthStatus = {
    status: credentialsStatus ? 'ok' : 'warning',
    timestamp: new Date().toISOString(),
    service: 'RAG Engine Backend',
    version: '1.0.0',
    environment: isCloudRun ? 'cloud-run' : 'local',
    frontend: {
      built: hasReactBuild,
      message: hasReactBuild ? 'React app is built and ready' : 'React app needs to be built'
    },
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
  const hasReactBuild = checkReactBuild();
  
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
    frontend: {
      built: hasReactBuild,
      buildInstructions: hasReactBuild ? null : [
        'cd product-manager-ai',
        'npm install',
        'npm run build',
        '',
        'For Cloud Run deployment, the frontend should be built automatically during the build process.'
      ]
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
app.post('/rag/query', upload.array('files', 10), async (req, res) => {
  let files = [];
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

    let prompt;
    let includeCodebaseContext = false;
    if (req.is('multipart/form-data')) {
      prompt = req.body.prompt || req.body.query;
      files = req.files || [];
      includeCodebaseContext = req.body.includeCodebaseContext === 'true' || req.body.includeCodebaseContext === true;
    } else {
      prompt = req.body.prompt || req.body.query;
      includeCodebaseContext = req.body.includeCodebaseContext === true;
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ 
        error: 'Missing prompt in request body.',
        required: 'prompt field (for multipart/form-data or JSON)',
        example: { prompt: 'What are the key features of our product?' }
      });
    }

    console.log(`🔍 Processing RAG query: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
    if (files.length > 0) {
      console.log(`📎 Received ${files.length} file(s) with the prompt.`);
      files.forEach(f => console.log(`  - ${f.originalname} (${f.mimetype}, ${(f.size/1024/1024).toFixed(2)} MB)`));
    }

    // If codebase context is enabled, fetch and prepend entire codebase
    if (includeCodebaseContext) {
      console.log('📚 Fetching entire codebase context from GitHub...');
      const codebaseContext = await getEntireCodebaseContext();
      prompt = `=== CODEBASE CONTEXT FROM https://github.com/mittalhardik/TMRW-PRD-Agent.git ===\n\n${codebaseContext}\n\n=== USER QUERY ===\n${prompt}`;
      console.log(`✅ Added codebase context (${codebaseContext.length} characters)`);
    }

    // Build Gemini parts: prompt as text first, then files
    let geminiParts = [];
    if (prompt && prompt.trim()) {
      geminiParts.push({ text: prompt });
    }
    if (files.length > 0) {
      for (const file of files) {
        const fileBuffer = fs.readFileSync(file.path);
        geminiParts.push({
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: file.mimetype
          }
        });
      }
    }
    if (!geminiParts.length) {
      return res.status(400).json({ error: "ContentUnion is required: prompt or files must be provided." });
    }

    // Log the parts for debugging
    console.log("Gemini parts to send:", JSON.stringify(geminiParts, null, 2));

    // Official Vertex AI RAG API v1 request structure
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
    const systemInstruction = {
      parts: [{ text: `Perform a Comprehensive Review of the given 'Product Requirement Document' using the given Context.\nFlag any unwanted or incorrect text.\nGenerate an Improved and Comprehensive PRD.` }]
    };

    const reqPayload = {
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: geminiParts
        }
      ],
      tools,
      systemInstruction,
      maxOutputTokens: 65535,
      temperature: 1,
      topP: 1,
      seed: 0,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
      ]
    };

    // Initialize Vertex with your Cloud project and location
    const ai = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    });

    let result = '';
    let errorFromAPI = null;
    let responseChunks = [];
    try {
      // Use generateContentStream with the official payload
      const streamingResp = await ai.models.generateContentStream(reqPayload);
      console.log('📤 Streaming response from RAG Engine...');
      for await (const chunk of streamingResp) {
        if (chunk.text) {
          result += chunk.text;
          responseChunks.push(chunk);
        }
      }
    } catch (apiErr) {
      errorFromAPI = apiErr;
      console.error('❌ Vertex AI API Error:', apiErr);
    }

    // Clean up uploaded files after reading, even on error
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch (e) { console.error('Failed to cleanup uploaded file:', file.path, e); }
    }

    // Enhanced error handling for empty or malformed responses
    if (errorFromAPI) {
      return res.status(502).json({
        error: errorFromAPI.message || 'Vertex AI API error',
        type: 'VERTEX_AI_ERROR',
        details: errorFromAPI,
        timestamp: new Date().toISOString()
      });
    }
    if (!result || typeof result !== 'string' || result.trim() === '') {
      console.error('❌ RAG Engine returned an empty or invalid response:', responseChunks);
      return res.status(502).json({
        error: 'RAG Engine returned an empty or invalid response',
        type: 'INVALID_RAG_RESPONSE',
        details: responseChunks,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ RAG query completed. Response length: ${result.length} characters`);
    res.json({ 
      result,
      metadata: {
        promptLength: prompt.length,
        responseLength: result.length,
        fileCount: files.length,
        includeCodebaseContext,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ RAG Query Error:', error);
    // Clean up uploaded files on error
    for (const file of files) {
      try { fs.unlinkSync(file.path); } catch (e) { console.error('Failed to cleanup uploaded file:', file.path, e); }
    }
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      type: 'RAG_QUERY_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Function to fetch entire codebase from GitHub
async function getEntireCodebaseContext() {
  const REPO_OWNER = 'mittalhardik';
  const REPO_NAME = 'TMRW-PRD-Agent';
  const BRANCH = 'main';
  
  try {
    console.log('🔍 Fetching repository tree from GitHub...');
    
    // Get repository tree (file structure)
    const treeResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`);
    if (!treeResponse.ok) {
      throw new Error(`GitHub API error: ${treeResponse.status}`);
    }
    
    const treeData = await treeResponse.json();
    const files = treeData.tree.filter(item => 
      item.type === 'blob' && 
      !item.path.includes('node_modules') &&
      !item.path.includes('.git') &&
      !item.path.includes('uploads') &&
      !item.path.includes('build') &&
      !item.path.includes('dist') &&
      !item.path.includes('.env') &&
      !item.path.includes('service-account-key.json') &&
      (item.path.endsWith('.js') || 
       item.path.endsWith('.ts') || 
       item.path.endsWith('.jsx') || 
       item.path.endsWith('.tsx') || 
       item.path.endsWith('.json') || 
       item.path.endsWith('.md') || 
       item.path.endsWith('.txt') || 
       item.path.endsWith('.yaml') || 
       item.path.endsWith('.yml') ||
       item.path.endsWith('.sh'))
    );
    
    console.log(`📁 Found ${files.length} relevant files in repository`);
    
    // Fetch content for each file
    let codebaseContext = `REPOSITORY: ${REPO_OWNER}/${REPO_NAME}\nBRANCH: ${BRANCH}\n\nFILES:\n`;
    
    for (const file of files) {
      try {
        const contentResponse = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${file.path}`);
        if (contentResponse.ok) {
          const content = await contentResponse.text();
          // Truncate large files to avoid token limits
          const maxLength = 5000;
          const truncatedContent = content.length > maxLength 
            ? content.substring(0, maxLength) + '\n... [truncated]'
            : content;
          
          codebaseContext += `\n--- ${file.path} ---\n${truncatedContent}\n`;
        }
      } catch (fileError) {
        console.log(`⚠️  Failed to fetch ${file.path}: ${fileError.message}`);
        codebaseContext += `\n--- ${file.path} ---\n[Failed to fetch content]\n`;
      }
    }
    
    console.log(`✅ Codebase context prepared (${codebaseContext.length} characters)`);
    return codebaseContext;
    
  } catch (error) {
    console.error('❌ Error fetching codebase:', error);
    return `Failed to fetch codebase context: ${error.message}`;
  }
}

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

    // 1. Upload file to GCS
    const bucketName = BUCKET_NAME;
    const gcsFileName = `${Date.now()}_${fileName}`;
    const storage = new Storage();
    await storage.bucket(bucketName).upload(filePath, { destination: gcsFileName });
    const gcsUri = `gs://${bucketName}/${gcsFileName}`;
    console.log('✅ Uploaded to GCS:', gcsUri);

    // 2. Call Vertex AI RAG API to import the file
    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const corpusId = 'projects/gen-lang-client-0723709535/locations/us-central1/ragCorpora/2305843009213693952';
    const importUrl = `https://us-central1-aiplatform.googleapis.com/v1beta1/${corpusId}/ragFiles:import`;
    const importBody = {
      uris: [gcsUri]
    };

    const response = await fetch(importUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token || accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(importBody)
    });
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (jsonErr) {
      // If JSON parsing fails, log and return the raw response text
      console.error('❌ Non-JSON response from Vertex AI:', text);
      fs.unlinkSync(filePath);
      // Optionally, delete the file from GCS as well
      try { await storage.bucket(bucketName).file(gcsFileName).delete(); } catch (e) {}
      return res.status(500).json({ 
        error: 'Non-JSON response from Vertex AI', 
        details: typeof text === 'string' ? text : JSON.stringify(text),
        type: 'VERTEX_AI_ERROR'
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);
    // Optionally, delete the file from GCS after import
    try { await storage.bucket(bucketName).file(gcsFileName).delete(); } catch (e) {}

    if (!response.ok) {
      console.error('❌ Document ingestion failed:', result);
      return res.status(500).json({ 
        error: typeof result.error === 'string' ? result.error : JSON.stringify(result.error) || 'Failed to ingest document.', 
        details: typeof result === 'string' ? result : JSON.stringify(result),
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

// Jira API Integration Endpoints

// Generate Jira ticket details using AI
app.post('/api/jira/generate-ticket', async (req, res) => {
  try {
    const { highlightedText, ticketType, documentId, userInstruction, documentTitle } = req.body;
    
    // Validate required fields
    if (!highlightedText || !ticketType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['highlightedText', 'ticketType'],
        received: { highlightedText: !!highlightedText, ticketType: !!ticketType }
      });
    }

    // Check credentials
    const hasCredentials = await checkCredentials();
    if (!hasCredentials) {
      return res.status(500).json({
        error: 'Google Cloud credentials not configured',
        type: 'CREDENTIALS_ERROR'
      });
    }

    console.log(`🎫 Generating Jira ticket for type: ${ticketType}`);
    console.log(`📝 Highlighted text length: ${highlightedText.length} characters`);

    // Generate ticket details using AI
    const ticketDetails = await generateJiraTicketDetails(
      highlightedText, 
      ticketType, 
      documentId, 
      userInstruction, 
      documentTitle
    );

    res.json({
      success: true,
      ticketDetails,
      metadata: {
        ticketType,
        highlightedTextLength: highlightedText.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Jira ticket generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate Jira ticket details',
      type: 'JIRA_GENERATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Create Jira ticket in Jira instance
app.post('/api/jira/create-ticket', async (req, res) => {
  try {
    console.log('Received create ticket request:', JSON.stringify(req.body, null, 2));
    
    const { 
      summary = '', 
      description = '', 
      ticketType = 'task', 
      projectKey = '', 
      assignee = '', 
      labels = [], 
      priority = 'Medium',
      jiraConfig = null
    } = req.body || {};

    // Validate required fields
    if (!summary || !summary.trim()) {
      console.error('Missing or empty summary field');
      return res.status(400).json({
        error: 'Summary is required and cannot be empty',
        field: 'summary',
        received: summary
      });
    }

    if (!description || !description.trim()) {
      console.error('Missing or empty description field');
      return res.status(400).json({
        error: 'Description is required and cannot be empty',
        field: 'description',
        received: description
      });
    }

    if (!ticketType || !ticketType.trim()) {
      console.error('Missing or empty ticketType field');
      return res.status(400).json({
        error: 'Ticket type is required and cannot be empty',
        field: 'ticketType',
        received: ticketType
      });
    }

    if (!projectKey || !projectKey.trim()) {
      console.error('Missing or empty projectKey field');
      return res.status(400).json({
        error: 'Project key is required and cannot be empty',
        field: 'projectKey',
        received: projectKey
      });
    }

    if (!jiraConfig) {
      console.error('Missing jiraConfig field');
      return res.status(400).json({
        error: 'Jira configuration is required',
        field: 'jiraConfig',
        received: jiraConfig
      });
    }

    // Validate jiraConfig structure
    const { domain = '', email = '', apiToken = '' } = jiraConfig;
    if (!domain || !email || !apiToken) {
      console.error('Invalid jiraConfig structure:', { domain: !!domain, email: !!email, apiToken: !!apiToken });
      return res.status(400).json({
        error: 'Jira configuration must include domain, email, and apiToken',
        field: 'jiraConfig',
        received: { domain: !!domain, email: !!email, apiToken: !!apiToken }
      });
    }

    console.log(`🎫 Creating Jira ticket in project: ${projectKey}`);
    console.log(`📝 Ticket type: ${ticketType}`);

    // Create ticket in Jira with validated data
    const jiraResponse = await createJiraTicket({
      summary: summary.trim(),
      description: description.trim(),
      ticketType: ticketType.trim(),
      projectKey: projectKey.trim(),
      assignee: assignee ? assignee.trim() : '',
      labels: Array.isArray(labels) ? labels : [],
      priority: priority ? priority.trim() : 'Medium',
      jiraConfig: {
        domain: domain.trim(),
        email: email.trim(),
        apiToken: apiToken.trim()
      }
    });

    res.json({
      success: true,
      jiraTicket: jiraResponse,
      metadata: {
        ticketType,
        projectKey,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Jira ticket creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to create Jira ticket',
      type: 'JIRA_CREATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Generate Jira ticket details using AI and RAG
async function generateJiraTicketDetails(highlightedText, ticketType, documentId, userInstruction, documentTitle) {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  // Build context for AI generation
  let context = `You are an expert Product Manager and Jira administrator. Your task is to generate a comprehensive Jira ticket based on highlighted text from a document.`;
  
  if (documentTitle) {
    context += `\n\nSource Document: ${documentTitle}`;
  }
  
  if (documentId) {
    context += `\nDocument ID: ${documentId}`;
  }

  // Create prompt based on ticket type
  let ticketTypePrompt = '';
  switch (ticketType.toLowerCase()) {
    case 'story':
      ticketTypePrompt = `Create a User Story with the following structure:
- Summary: Clear, concise title (max 255 characters)
- Description: Detailed description including:
  * User story format: "As a [user], I want [feature], so that [benefit]"
  * Detailed requirements and acceptance criteria
  * Technical considerations
  * Dependencies and blockers
- Acceptance Criteria: Bullet points of specific, testable criteria
- Labels: Relevant tags for categorization
- Components: Technical areas affected
- Priority: Based on business impact and urgency`;
      break;
    case 'epic':
      ticketTypePrompt = `Create an Epic with the following structure:
- Summary: High-level initiative title (max 255 characters)
- Description: Strategic overview including:
  * Business objective and value proposition
  * Scope and major deliverables
  * Success metrics and KPIs
  * Timeline and milestones
  * Stakeholders and dependencies
- Labels: Strategic tags and categories
- Components: Major system areas involved
- Priority: Strategic importance`;
      break;
    case 'task':
      ticketTypePrompt = `Create a Task with the following structure:
- Summary: Specific task title (max 255 characters)
- Description: Detailed task description including:
  * Specific work to be done
  * Technical requirements and constraints
  * Resources and tools needed
  * Expected deliverables
  * Time estimates
- Acceptance Criteria: Clear completion criteria
- Labels: Relevant tags
- Components: Technical areas involved
- Priority: Based on urgency and impact`;
      break;
    case 'bug':
      ticketTypePrompt = `Create a Bug report with the following structure:
- Summary: Clear bug description (max 255 characters)
- Description: Detailed bug report including:
  * Steps to reproduce
  * Expected vs actual behavior
  * Environment details (browser, OS, etc.)
  * Error messages or logs
  * Impact assessment
  * Workarounds (if any)
- Acceptance Criteria: Specific fix verification steps
- Labels: Bug categories and severity
- Components: Affected system areas
- Priority: Based on severity and impact`;
      break;
    default:
      ticketTypePrompt = `Create a general Jira ticket with:
- Summary: Clear title (max 255 characters)
- Description: Comprehensive details
- Acceptance Criteria: Specific completion criteria
- Labels: Relevant tags
- Components: Technical areas involved
- Priority: Based on importance and urgency`;
  }

  // Build the complete prompt
  const prompt = `${context}

Ticket Type: ${ticketType.toUpperCase()}

${ticketTypePrompt}

Highlighted Text from Document:
"""
${highlightedText}
"""

${userInstruction ? `Additional Instructions: ${userInstruction}\n\n` : ''}

Please generate a complete Jira ticket with the following JSON structure:
{
  "summary": "Clear, concise title (max 255 characters)",
  "description": "Detailed description with proper formatting",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
  "labels": ["label1", "label2"],
  "priority": "High|Medium|Low",
  "assignee": "suggested-assignee-email",
  "estimatedTime": "time-estimate-in-hours"
}

Important:
1. Keep summary under 255 characters
2. Use proper Jira formatting in description (headers, lists, code blocks)
3. Make acceptance criteria specific and testable
4. Suggest relevant labels based on the content
5. Recommend appropriate priority based on business impact
6. Suggest assignee based on the technical area or expertise needed
7. Include any relevant technical details or constraints mentioned in the text`;

  // Use RAG Engine for enhanced context
  const tools = [
    {
      retrieval: {
        vertexRagStore: {
          ragCorpora: [RAG_CORPUS],
          similarityTopK: 10
        }
      }
    }
  ];

  const systemInstruction = {
    parts: [{ text: `You are an expert Product Manager and Jira administrator. Generate high-quality, actionable Jira tickets based on the provided content and context from the knowledge base.` }]
  };

  const reqPayload = {
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    tools,
    systemInstruction,
    maxOutputTokens: 65535,
    temperature: 0.7,
    topP: 1,
    seed: 0,
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
    ]
  };

  try {
    const streamingResp = await ai.models.generateContentStream(reqPayload);
    let result = '';
    
    for await (const chunk of streamingResp) {
      if (chunk.text) {
        result += chunk.text;
      }
    }

    // Parse the JSON response
    let ticketDetails;
    try {
      // Extract JSON from the response (handle cases where AI adds extra text)
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        ticketDetails = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', result);
      // Fallback: create a basic structure
      ticketDetails = {
        summary: highlightedText.substring(0, 255),
        description: `Generated from highlighted text:\n\n${highlightedText}`,
        acceptanceCriteria: ['Complete the task as described'],
        labels: ['auto-generated'],
        priority: 'Medium',
        assignee: null,
        estimatedTime: '4'
      };
    }

    return ticketDetails;

  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`Failed to generate ticket details: ${error.message}`);
  }
}

// Create ticket in Jira using REST API
async function createJiraTicket(ticketData) {
  // Validate input
  if (!ticketData) {
    throw new Error('Ticket data is required');
  }

  console.log('Creating Jira ticket with data:', JSON.stringify(ticketData, null, 2));

  // Destructure with default values to prevent undefined errors
  const { 
    summary = '', 
    description = '', 
    ticketType = 'task', 
    projectKey = '', 
    assignee = '', 
    labels = [], 
    priority = 'Medium',
    jiraConfig = null
  } = ticketData || {};

  // Validate required fields
  if (!summary || !summary.trim()) {
    throw new Error('Summary is required');
  }

  if (!description || !description.trim()) {
    throw new Error('Description is required');
  }

  if (!projectKey || !projectKey.trim()) {
    throw new Error('Project key is required');
  }

  if (!jiraConfig) {
    throw new Error('Jira configuration is required');
  }

  const { domain = '', email = '', apiToken = '' } = jiraConfig || {};

  if (!domain || !email || !apiToken) {
    throw new Error('Missing Jira configuration (domain, email, or apiToken)');
  }

  // Map ticket types to Jira issue types
  const issueTypeMap = {
    'story': 'Story',
    'epic': 'Epic',
    'task': 'Task',
    'bug': 'Bug'
  };

  const issueType = issueTypeMap[ticketType.toLowerCase()] || 'Task';

  // Build Jira API request body
  const requestBody = {
    fields: {
      project: {
        key: projectKey
      },
      summary: summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description
              }
            ]
          }
        ]
      },
      issuetype: {
        name: issueType
      }
    }
  };

  // Add optional fields if provided
  if (assignee && assignee.trim()) {
    requestBody.fields.assignee = {
      accountId: assignee
    };
  }

  if (labels && Array.isArray(labels) && labels.length > 0) {
    requestBody.fields.labels = labels;
  }

  // Note: Priority field is optional and may not be available in all Jira projects
  // We'll try to set it, but won't fail if it's not available
  if (priority && priority.trim()) {
    requestBody.fields.priority = {
      name: priority
    };
  }

  console.log('Jira API request body:', JSON.stringify(requestBody, null, 2));

  // Make API call to Jira
  const response = await fetch(`https://${domain}.atlassian.net/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Jira API error:', errorText);
    
    // Check if the error is specifically about priority field
    if (errorText.includes('priority') && errorText.includes('cannot be set')) {
      console.log('Priority field not available in this Jira project, retrying without priority...');
      
      // Remove priority from request and retry
      delete requestBody.fields.priority;
      
      const retryResponse = await fetch(`https://${domain}.atlassian.net/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!retryResponse.ok) {
        const retryErrorText = await retryResponse.text();
        console.error('Jira API retry error:', retryErrorText);
        throw new Error(`Jira API error: ${retryResponse.status} - ${retryErrorText}`);
      }
      
      const result = await retryResponse.json();
      console.log(`✅ Jira ticket created (without priority): ${result.key}`);
      
      return {
        key: result.key,
        id: result.id,
        self: result.self,
        summary: result.fields?.summary || 'No summary available',
        url: `https://${domain}.atlassian.net/browse/${result.key}`,
        note: 'Priority field was not available in this Jira project'
      };
    }
    
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Jira ticket created: ${result.key}`);

  return {
    key: result.key,
    id: result.id,
    self: result.self,
    summary: result.fields?.summary || 'No summary available',
    url: `https://${domain}.atlassian.net/browse/${result.key}`
  };
}

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

// Serve static files from the React app build directory (if it exists)
const resolvedBuildPath = resolveReactBuildPath();
if (resolvedBuildPath) {
  // Serve static assets with long cache, except index.html
  app.use(express.static(resolvedBuildPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  console.log('✅ Serving React app from build directory:', resolvedBuildPath);
} else {
  console.log('⚠️  React build directory not found - API-only mode');
}

// The "catchall" handler: for any request that doesn't match an API route, send back React's index.html
app.get('*', (req, res) => {
  const buildPath = resolveReactBuildPath();
  if (buildPath) {
    const indexPath = path.join(buildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(indexPath);
      } catch (err) {
        console.error('❌ Error serving React app:', err);
        res.status(500).send('Internal Server Error');
      }
      return;
    }
  }
  // If React app is not built, show API-only message
  res.status(404).json({
    error: 'Frontend not built',
    message: 'The React frontend has not been built yet.',
    instructions: [
      'To build the frontend, run:',
      'cd product-manager-ai',
      'npm install',
      'npm run build',
      '',
      'For Cloud Run deployment, the frontend should be built automatically during the build process.'
    ],
    availableEndpoints: [
      'GET /health - Health check',
      'POST /rag/query - RAG Engine queries',
      'POST /rag/ingest - Document upload',
      'GET /status - Service status'
    ],
    timestamp: new Date().toISOString()
  });
});