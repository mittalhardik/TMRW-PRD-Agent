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

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});

const port = process.env.PORT || 8080;

const PROJECT_ID = process.env.GCLOUD_PROJECT_ID || 'gen-lang-client-0723709535';
const LOCATION = process.env.GCLOUD_LOCATION || 'us-central1';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const RAG_CORPUS = process.env.VERTEX_RAG_CORPUS || 'projects/gen-lang-client-0723709535/locations/us-central1/ragCorpora/2305843009213693952';

// RAG Engine resource name (update if needed)
const RAG_ENGINE = process.env.VERTEX_RAG_ENGINE || 'projects/gen-lang-client-0723709535/locations/us-central1/ragEngines/2305843009213693952';

app.use(cors());
app.use(express.json());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// RAG Query Endpoint
app.post('/rag/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body.' });
    }

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
    for await (const chunk of response) {
      if (chunk.text) {
        result += chunk.text;
      }
    }
    res.json({ result });
  } catch (error) {
    console.error('RAG Query Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Document Ingestion Endpoint
app.post('/rag/ingest', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;
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
    console.log('RAG_ENGINE:', RAG_ENGINE);
    const endpointUrl = `https://us-central1-aiplatform.googleapis.com/v1beta/${RAG_ENGINE}:ingestDocuments`;
    console.log('Ingest endpoint:', endpointUrl);

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
      console.error('Non-JSON response from Vertex AI:', text);
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: 'Non-JSON response from Vertex AI', details: text });
    }
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    if (!response.ok) {
      return res.status(500).json({ error: result.error || 'Failed to ingest document.', details: result });
    }
    res.json({ status: 'success', result });
  } catch (error) {
    console.error('Document Ingestion Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// The "catchall" handler: for any request that doesn't match an API route, send back React's index.html
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (err) {
    console.error('Error in catch-all route:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
}); 